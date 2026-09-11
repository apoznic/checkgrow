-- Add location field to clusters for organization localization
ALTER TABLE public.clusters 
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- Create deal_members table for tracking compensation per member on deals
CREATE TABLE public.deal_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  compensation_type TEXT NOT NULL DEFAULT 'percentage' CHECK (compensation_type IN ('percentage', 'fixed')),
  compensation_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(deal_id, profile_id)
);

-- Enable RLS on deal_members
ALTER TABLE public.deal_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for deal_members
CREATE POLICY "Org members can view deal members"
ON public.deal_members FOR SELECT
USING (
  deal_id IN (
    SELECT id FROM public.crm_deals d
    WHERE is_org_member(auth.uid(), d.cluster_id) OR is_cluster_admin(auth.uid(), d.cluster_id)
  )
);

CREATE POLICY "Managers can create deal members"
ON public.deal_members FOR INSERT
WITH CHECK (
  deal_id IN (
    SELECT id FROM public.crm_deals d
    WHERE has_org_role(auth.uid(), d.cluster_id, ARRAY['owner'::org_role, 'admin'::org_role, 'project_manager'::org_role])
    OR is_cluster_admin(auth.uid(), d.cluster_id)
  )
);

CREATE POLICY "Managers can update deal members"
ON public.deal_members FOR UPDATE
USING (
  deal_id IN (
    SELECT id FROM public.crm_deals d
    WHERE has_org_role(auth.uid(), d.cluster_id, ARRAY['owner'::org_role, 'admin'::org_role, 'project_manager'::org_role])
    OR is_cluster_admin(auth.uid(), d.cluster_id)
  )
);

CREATE POLICY "Managers can delete deal members"
ON public.deal_members FOR DELETE
USING (
  deal_id IN (
    SELECT id FROM public.crm_deals d
    WHERE has_org_role(auth.uid(), d.cluster_id, ARRAY['owner'::org_role, 'admin'::org_role, 'project_manager'::org_role])
    OR is_cluster_admin(auth.uid(), d.cluster_id)
  )
);

-- Create contact_comments table for CRM lead tracking
CREATE TABLE public.contact_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on contact_comments
ALTER TABLE public.contact_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for contact_comments
CREATE POLICY "Org members can view contact comments"
ON public.contact_comments FOR SELECT
USING (
  contact_id IN (
    SELECT id FROM public.crm_contacts c
    WHERE is_org_member(auth.uid(), c.cluster_id) OR is_cluster_admin(auth.uid(), c.cluster_id)
  )
);

CREATE POLICY "Org members can create contact comments"
ON public.contact_comments FOR INSERT
WITH CHECK (
  contact_id IN (
    SELECT id FROM public.crm_contacts c
    WHERE is_org_member(auth.uid(), c.cluster_id) OR is_cluster_admin(auth.uid(), c.cluster_id)
  )
);

CREATE POLICY "Authors can delete own comments"
ON public.contact_comments FOR DELETE
USING (
  author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Add project_id to crm_deals for linking projects to deals
ALTER TABLE public.crm_deals
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Add lead status tracking fields to crm_contacts
ALTER TABLE public.crm_contacts
ADD COLUMN IF NOT EXISTS lead_status TEXT DEFAULT 'new' CHECK (lead_status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'converted', 'lost')),
ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_followup_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS source TEXT;