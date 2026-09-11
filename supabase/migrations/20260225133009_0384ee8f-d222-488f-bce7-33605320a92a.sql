-- Allow org PMs (project_manager role) to insert project_teams entries for cluster projects
CREATE POLICY "Org PMs can add project team members"
ON public.project_teams FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM projects p
    WHERE p.id = project_teams.project_id
      AND p.cluster_id IS NOT NULL
      AND has_org_role(auth.uid(), p.cluster_id, ARRAY['project_manager'::org_role])
  )
);