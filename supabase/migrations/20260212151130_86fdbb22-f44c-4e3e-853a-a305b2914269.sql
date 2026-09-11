
-- Allow org admins to delete project_teams for cluster projects
CREATE POLICY "Org admins can delete cluster project teams"
ON public.project_teams
FOR DELETE
USING (
  project_id IN (
    SELECT p.id FROM projects p
    WHERE p.cluster_id IS NOT NULL
    AND has_org_role(auth.uid(), p.cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
  )
);

-- Allow org admins to delete messages for cluster projects
CREATE POLICY "Org admins can delete cluster project messages"
ON public.messages
FOR DELETE
USING (
  project_id IN (
    SELECT p.id FROM projects p
    WHERE p.cluster_id IS NOT NULL
    AND has_org_role(auth.uid(), p.cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
  )
);

-- Allow org admins to delete project_activities for cluster projects
CREATE POLICY "Org admins can delete cluster project activities"
ON public.project_activities
FOR DELETE
USING (
  project_id IN (
    SELECT p.id FROM projects p
    WHERE p.cluster_id IS NOT NULL
    AND has_org_role(auth.uid(), p.cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
  )
);

-- Allow org admins to delete project_tasks for cluster projects
CREATE POLICY "Org admins can delete cluster project tasks"
ON public.project_tasks
FOR DELETE
USING (
  project_id IN (
    SELECT p.id FROM projects p
    WHERE p.cluster_id IS NOT NULL
    AND has_org_role(auth.uid(), p.cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
  )
);

-- Allow org admins to delete project_time_entries for cluster projects
CREATE POLICY "Org admins can delete cluster project time entries"
ON public.project_time_entries
FOR DELETE
USING (
  project_id IN (
    SELECT p.id FROM projects p
    WHERE p.cluster_id IS NOT NULL
    AND has_org_role(auth.uid(), p.cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
  )
);

-- Allow org admins to delete project_milestones for cluster projects
CREATE POLICY "Org admins can delete cluster project milestones"
ON public.project_milestones
FOR DELETE
USING (
  project_id IN (
    SELECT p.id FROM projects p
    WHERE p.cluster_id IS NOT NULL
    AND has_org_role(auth.uid(), p.cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
  )
);

-- Allow org admins to delete project_settings for cluster projects
CREATE POLICY "Org admins can delete cluster project settings"
ON public.project_settings
FOR DELETE
USING (
  project_id IN (
    SELECT p.id FROM projects p
    WHERE p.cluster_id IS NOT NULL
    AND has_org_role(auth.uid(), p.cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
  )
);
