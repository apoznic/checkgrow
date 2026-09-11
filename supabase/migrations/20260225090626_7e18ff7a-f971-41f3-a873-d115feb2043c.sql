-- Allow org members (owners, admins, project_managers) to create projects in their cluster
CREATE POLICY "Org managers can create cluster projects"
ON public.projects FOR INSERT
TO authenticated
WITH CHECK (
  (cluster_id IS NOT NULL AND has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role, 'project_manager'::org_role]))
  OR
  (owner_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()))
);