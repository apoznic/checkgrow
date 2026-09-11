-- Add policy for task creators to delete their own tasks
CREATE POLICY "Creators can delete own tasks"
ON public.crm_tasks
FOR DELETE
USING (created_by IN (
  SELECT profiles.id 
  FROM profiles 
  WHERE profiles.user_id = auth.uid()
));

-- Create role_permissions table to store which tabs each role can access
CREATE TABLE public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cluster_id, role, permission_key)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Org members can view permissions for their cluster
CREATE POLICY "Org members can view role permissions"
ON public.role_permissions
FOR SELECT
USING (is_org_member(auth.uid(), cluster_id) OR is_cluster_admin(auth.uid(), cluster_id));

-- Only owners and admins can manage permissions
CREATE POLICY "Admins can insert role permissions"
ON public.role_permissions
FOR INSERT
WITH CHECK (has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role]));

CREATE POLICY "Admins can update role permissions"
ON public.role_permissions
FOR UPDATE
USING (has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role]));

CREATE POLICY "Admins can delete role permissions"
ON public.role_permissions
FOR DELETE
USING (has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role]));

-- Add trigger for updated_at
CREATE TRIGGER update_role_permissions_updated_at
BEFORE UPDATE ON public.role_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();