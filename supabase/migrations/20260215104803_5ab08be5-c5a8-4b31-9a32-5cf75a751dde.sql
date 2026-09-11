
-- Fix project_teams policies: change from RESTRICTIVE to PERMISSIVE
-- so that members can apply without needing to also be project owners

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Project owners can manage teams" ON public.project_teams;
DROP POLICY IF EXISTS "Org members can apply to cluster projects" ON public.project_teams;
DROP POLICY IF EXISTS "Team members can update own status" ON public.project_teams;
DROP POLICY IF EXISTS "Users can view project teams" ON public.project_teams;
DROP POLICY IF EXISTS "Org admins can delete cluster project teams" ON public.project_teams;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Project owners can manage teams"
ON public.project_teams
AS PERMISSIVE
FOR ALL
USING (project_id IN (
  SELECT p.id FROM projects p
  JOIN profiles pr ON p.owner_id = pr.id
  WHERE pr.user_id = auth.uid()
));

CREATE POLICY "Org members can apply to cluster projects"
ON public.project_teams
AS PERMISSIVE
FOR INSERT
WITH CHECK (
  (profile_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()))
  AND (project_id IN (SELECT p.id FROM projects p WHERE p.cluster_id IS NOT NULL AND is_org_member(auth.uid(), p.cluster_id)))
  AND (status = 'applied')
);

CREATE POLICY "Team members can update own status"
ON public.project_teams
AS PERMISSIVE
FOR UPDATE
USING (profile_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()));

CREATE POLICY "Users can view project teams"
ON public.project_teams
AS PERMISSIVE
FOR SELECT
USING (true);

CREATE POLICY "Org admins can delete cluster project teams"
ON public.project_teams
AS PERMISSIVE
FOR DELETE
USING (project_id IN (
  SELECT p.id FROM projects p
  WHERE p.cluster_id IS NOT NULL
  AND has_org_role(auth.uid(), p.cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
));
