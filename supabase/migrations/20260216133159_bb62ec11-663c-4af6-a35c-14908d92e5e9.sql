
-- Create project_resources table for storing files and links per project
CREATE TABLE public.project_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  resource_type TEXT NOT NULL DEFAULT 'file',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_resources ENABLE ROW LEVEL SECURITY;

-- Org members can view project resources for cluster projects
CREATE POLICY "Org members can view project resources"
ON public.project_resources
FOR SELECT
USING (
  project_id IN (
    SELECT p.id FROM projects p
    WHERE p.cluster_id IS NOT NULL AND is_org_member(auth.uid(), p.cluster_id)
  )
  OR project_id IN (
    SELECT p.id FROM projects p
    JOIN profiles pr ON p.owner_id = pr.id
    WHERE pr.user_id = auth.uid()
  )
);

-- Project owners and org admins can insert resources
CREATE POLICY "Managers can insert project resources"
ON public.project_resources
FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT p.id FROM projects p
    JOIN profiles pr ON p.owner_id = pr.id
    WHERE pr.user_id = auth.uid()
  )
  OR project_id IN (
    SELECT p.id FROM projects p
    WHERE p.cluster_id IS NOT NULL AND has_org_role(auth.uid(), p.cluster_id, ARRAY['owner'::org_role, 'admin'::org_role, 'project_manager'::org_role])
  )
);

-- Project owners and org admins can delete resources
CREATE POLICY "Managers can delete project resources"
ON public.project_resources
FOR DELETE
USING (
  project_id IN (
    SELECT p.id FROM projects p
    JOIN profiles pr ON p.owner_id = pr.id
    WHERE pr.user_id = auth.uid()
  )
  OR project_id IN (
    SELECT p.id FROM projects p
    WHERE p.cluster_id IS NOT NULL AND has_org_role(auth.uid(), p.cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
  )
);
