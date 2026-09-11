-- Create organization role enum
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'project_manager', 'participant', 'member');

-- Add role column to cluster_enrollments for org-specific roles
ALTER TABLE public.cluster_enrollments 
ADD COLUMN role org_role NOT NULL DEFAULT 'member';

-- Allow multiple cluster enrollments per user (remove unique constraint if exists, add composite)
-- First check and drop old constraint
ALTER TABLE public.cluster_enrollments 
DROP CONSTRAINT IF EXISTS cluster_enrollments_profile_id_key;

-- Add composite unique constraint (one enrollment per user per cluster)
ALTER TABLE public.cluster_enrollments 
ADD CONSTRAINT cluster_enrollments_profile_cluster_unique UNIQUE (profile_id, cluster_id);

-- Create organization announcements table
CREATE TABLE public.org_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create organization resources table
CREATE TABLE public.org_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('link', 'document', 'file')),
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link projects to clusters (optional - for org-scoped projects)
ALTER TABLE public.projects 
ADD COLUMN cluster_id UUID REFERENCES public.clusters(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.org_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_resources ENABLE ROW LEVEL SECURITY;

-- Create function to check org role
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id UUID, _cluster_id UUID, _roles org_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cluster_enrollments ce
    JOIN public.profiles p ON ce.profile_id = p.id
    WHERE p.user_id = _user_id
      AND ce.cluster_id = _cluster_id
      AND ce.status = 'approved'
      AND ce.role = ANY(_roles)
  )
$$;

-- Create function to check if user is org member (any approved role)
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _cluster_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cluster_enrollments ce
    JOIN public.profiles p ON ce.profile_id = p.id
    WHERE p.user_id = _user_id
      AND ce.cluster_id = _cluster_id
      AND ce.status = 'approved'
  )
$$;

-- RLS for org_announcements
CREATE POLICY "Org members can view announcements"
ON public.org_announcements FOR SELECT
USING (is_org_member(auth.uid(), cluster_id));

CREATE POLICY "Admins and owners can create announcements"
ON public.org_announcements FOR INSERT
WITH CHECK (has_org_role(auth.uid(), cluster_id, ARRAY['owner', 'admin']::org_role[]));

CREATE POLICY "Admins and owners can update announcements"
ON public.org_announcements FOR UPDATE
USING (has_org_role(auth.uid(), cluster_id, ARRAY['owner', 'admin']::org_role[]));

CREATE POLICY "Admins and owners can delete announcements"
ON public.org_announcements FOR DELETE
USING (has_org_role(auth.uid(), cluster_id, ARRAY['owner', 'admin']::org_role[]));

-- RLS for org_resources
CREATE POLICY "Org members can view resources"
ON public.org_resources FOR SELECT
USING (is_org_member(auth.uid(), cluster_id));

CREATE POLICY "PMs and above can add resources"
ON public.org_resources FOR INSERT
WITH CHECK (has_org_role(auth.uid(), cluster_id, ARRAY['owner', 'admin', 'project_manager']::org_role[]));

CREATE POLICY "Admins can manage resources"
ON public.org_resources FOR DELETE
USING (has_org_role(auth.uid(), cluster_id, ARRAY['owner', 'admin']::org_role[]));

-- Update cluster_enrollments RLS to allow role updates by admins/owners
DROP POLICY IF EXISTS "Cluster admins can update enrollments for their cluster" ON public.cluster_enrollments;

CREATE POLICY "Org admins and owners can update enrollments"
ON public.cluster_enrollments FOR UPDATE
USING (has_org_role(auth.uid(), cluster_id, ARRAY['owner', 'admin']::org_role[]));

-- Add trigger for updated_at
CREATE TRIGGER update_org_announcements_updated_at
BEFORE UPDATE ON public.org_announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for announcements
ALTER PUBLICATION supabase_realtime ADD TABLE public.org_announcements;