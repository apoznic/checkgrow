-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- Create enum for enrollment status
CREATE TYPE public.enrollment_status AS ENUM ('pending', 'approved', 'rejected');

-- Create clusters table (organizations)
CREATE TABLE public.clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table (for admin accounts)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'member',
  cluster_id UUID REFERENCES public.clusters(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role, cluster_id)
);

-- Create cluster_enrollments table (for tracking enrollment requests)
CREATE TABLE public.cluster_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  status enrollment_status NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  UNIQUE (profile_id, cluster_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cluster_enrollments ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check admin role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is admin of a specific cluster
CREATE OR REPLACE FUNCTION public.is_cluster_admin(_user_id UUID, _cluster_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
      AND cluster_id = _cluster_id
  )
$$;

-- Create function to get user's approved cluster
CREATE OR REPLACE FUNCTION public.get_user_cluster(_profile_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cluster_id
  FROM public.cluster_enrollments
  WHERE profile_id = _profile_id
    AND status = 'approved'
  LIMIT 1
$$;

-- RLS Policies for clusters
CREATE POLICY "Everyone can view clusters"
  ON public.clusters FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage their clusters"
  ON public.clusters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
        AND cluster_id = clusters.id
    )
  );

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles in their cluster"
  ON public.user_roles FOR SELECT
  USING (
    cluster_id IN (
      SELECT ur.cluster_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- RLS Policies for cluster_enrollments
CREATE POLICY "Users can view their own enrollments"
  ON public.cluster_enrollments FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own enrollment requests"
  ON public.cluster_enrollments FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Cluster admins can view all enrollments for their cluster"
  ON public.cluster_enrollments FOR SELECT
  USING (
    public.is_cluster_admin(auth.uid(), cluster_id)
  );

CREATE POLICY "Cluster admins can update enrollments for their cluster"
  ON public.cluster_enrollments FOR UPDATE
  USING (
    public.is_cluster_admin(auth.uid(), cluster_id)
  );

-- Add updated_at trigger for clusters
CREATE TRIGGER update_clusters_updated_at
  BEFORE UPDATE ON public.clusters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some initial clusters for testing
INSERT INTO public.clusters (name, description) VALUES
  ('Tech Innovators', 'A cluster for technology professionals and software developers'),
  ('Creative Studios', 'For designers, artists, and creative professionals'),
  ('Business Consulting', 'Consultants and business strategy professionals');
