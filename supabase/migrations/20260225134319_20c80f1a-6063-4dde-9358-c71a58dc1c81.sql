
-- Security definer function to check if a user has org admin/owner access
-- to a project via team member or owner overlap, without querying project_teams
CREATE OR REPLACE FUNCTION public.can_admin_manage_project_team(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM cluster_enrollments ce
    JOIN profiles p ON ce.profile_id = p.id
    WHERE p.user_id = _user_id
      AND ce.status = 'approved'
      AND ce.role IN ('owner', 'admin')
      AND (
        -- Project owner is in the same cluster
        EXISTS (
          SELECT 1
          FROM projects proj
          JOIN cluster_enrollments ce3 ON proj.owner_id = ce3.profile_id
          WHERE proj.id = _project_id
            AND ce3.cluster_id = ce.cluster_id
            AND ce3.status = 'approved'
        )
        OR
        -- A team member is in the same cluster
        EXISTS (
          SELECT 1
          FROM project_teams pt2
          JOIN cluster_enrollments ce2 ON pt2.profile_id = ce2.profile_id
          WHERE pt2.project_id = _project_id
            AND ce2.cluster_id = ce.cluster_id
            AND ce2.status = 'approved'
        )
      )
  )
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Org admins can add members to inbound projects" ON project_teams;

-- Recreate using the security definer function
CREATE POLICY "Org admins can add members to inbound projects"
ON project_teams
FOR INSERT
WITH CHECK (
  public.can_admin_manage_project_team(auth.uid(), project_id)
);
