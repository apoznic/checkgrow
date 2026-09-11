-- Allow accepted team members to insert tasks
CREATE POLICY "Team members can create tasks"
ON public.project_tasks
FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT pt.project_id
    FROM project_teams pt
    JOIN profiles pr ON pt.profile_id = pr.id
    WHERE pr.user_id = auth.uid()
      AND pt.status = 'accepted'
  )
);

-- Allow accepted team members to update any task in their project
CREATE POLICY "Team members can update tasks"
ON public.project_tasks
FOR UPDATE
USING (
  project_id IN (
    SELECT pt.project_id
    FROM project_teams pt
    JOIN profiles pr ON pt.profile_id = pr.id
    WHERE pr.user_id = auth.uid()
      AND pt.status = 'accepted'
  )
);

-- Allow accepted team members to delete tasks they created
CREATE POLICY "Team members can delete own tasks"
ON public.project_tasks
FOR DELETE
USING (
  (assigned_to IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  OR
  project_id IN (
    SELECT pt.project_id
    FROM project_teams pt
    JOIN profiles pr ON pt.profile_id = pr.id
    WHERE pr.user_id = auth.uid()
      AND pt.status = 'accepted'
  )
);

-- Allow org members to insert tasks for cluster projects
CREATE POLICY "Org members can create cluster project tasks"
ON public.project_tasks
FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT p.id FROM projects p
    WHERE p.cluster_id IS NOT NULL
      AND is_org_member(auth.uid(), p.cluster_id)
  )
);

-- Allow org members to update tasks for cluster projects
CREATE POLICY "Org members can update cluster project tasks"
ON public.project_tasks
FOR UPDATE
USING (
  project_id IN (
    SELECT p.id FROM projects p
    WHERE p.cluster_id IS NOT NULL
      AND is_org_member(auth.uid(), p.cluster_id)
  )
);