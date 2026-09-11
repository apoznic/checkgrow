-- Allow org admins to add team members to inbound projects 
-- (projects where their org members are already in the team or own the project)
CREATE POLICY "Org admins can add members to inbound projects"
ON public.project_teams
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cluster_enrollments ce
    JOIN profiles p ON ce.profile_id = p.id
    WHERE p.user_id = auth.uid()
      AND ce.status = 'approved'
      AND ce.role IN ('owner', 'admin')
      AND (
        -- Check if any org member is already in the project team
        EXISTS (
          SELECT 1 FROM project_teams pt2
          JOIN cluster_enrollments ce2 ON pt2.profile_id = ce2.profile_id
          WHERE pt2.project_id = project_teams.project_id
            AND ce2.cluster_id = ce.cluster_id
            AND ce2.status = 'approved'
        )
        OR
        -- Check if the project owner is an org member
        EXISTS (
          SELECT 1 FROM projects proj
          JOIN cluster_enrollments ce3 ON proj.owner_id = ce3.profile_id
          WHERE proj.id = project_teams.project_id
            AND ce3.cluster_id = ce.cluster_id
            AND ce3.status = 'approved'
        )
      )
  )
);