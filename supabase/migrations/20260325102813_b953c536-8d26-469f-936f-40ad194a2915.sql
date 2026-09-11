
-- Allow org admins/owners to update project_teams for their cluster's projects
CREATE POLICY "Org admins can update cluster project teams"
ON public.project_teams
FOR UPDATE
TO public
USING (
  project_id IN (
    SELECT p.id FROM projects p
    WHERE p.cluster_id IS NOT NULL
    AND has_org_role(auth.uid(), p.cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
  )
)
WITH CHECK (
  project_id IN (
    SELECT p.id FROM projects p
    WHERE p.cluster_id IS NOT NULL
    AND has_org_role(auth.uid(), p.cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
  )
);

-- Also allow project owners to update (the ALL policy should cover this, but let's be explicit)
CREATE POLICY "Project owners can update teams"
ON public.project_teams
FOR UPDATE
TO public
USING (
  project_id IN (
    SELECT p.id FROM (projects p JOIN profiles pr ON p.owner_id = pr.id)
    WHERE pr.user_id = auth.uid()
  )
)
WITH CHECK (
  project_id IN (
    SELECT p.id FROM (projects p JOIN profiles pr ON p.owner_id = pr.id)
    WHERE pr.user_id = auth.uid()
  )
);

-- Enable realtime for project_teams
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_teams;
