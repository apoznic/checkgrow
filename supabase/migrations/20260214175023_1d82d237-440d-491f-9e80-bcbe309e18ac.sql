-- Allow org members to apply to projects within their organization
CREATE POLICY "Org members can apply to cluster projects"
ON public.project_teams
FOR INSERT
WITH CHECK (
  -- User can only insert themselves
  profile_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid())
  -- Project must belong to a cluster the user is a member of
  AND project_id IN (
    SELECT p.id FROM projects p
    WHERE p.cluster_id IS NOT NULL
    AND is_org_member(auth.uid(), p.cluster_id)
  )
  -- Status must be 'applied' (not 'accepted' or other privileged statuses)
  AND status = 'applied'
);