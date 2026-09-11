-- Add UPDATE policy for org_resources
CREATE POLICY "PMs and above can update resources"
ON public.org_resources
FOR UPDATE
USING (has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role, 'project_manager'::org_role]) OR is_cluster_admin(auth.uid(), cluster_id))
WITH CHECK (has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role, 'project_manager'::org_role]) OR is_cluster_admin(auth.uid(), cluster_id));