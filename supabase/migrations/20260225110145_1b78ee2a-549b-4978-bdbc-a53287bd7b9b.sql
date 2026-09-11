CREATE POLICY "Org admins can add project team members"
ON public.project_teams
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = project_teams.project_id
      AND p.cluster_id IS NOT NULL
      AND (
        has_org_role(auth.uid(), p.cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
        OR is_cluster_admin(auth.uid(), p.cluster_id)
      )
  )
);