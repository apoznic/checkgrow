
-- Create project task comments table
CREATE TABLE public.project_task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_task_comments ENABLE ROW LEVEL SECURITY;

-- Project participants can view comments (same access as project_tasks)
CREATE POLICY "Project participants can view task comments"
ON public.project_task_comments
FOR SELECT
USING (
  task_id IN (
    SELECT pt.id FROM project_tasks pt
    WHERE pt.project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON p.owner_id = pr.id
      WHERE pr.user_id = auth.uid()
      UNION
      SELECT ptm.project_id FROM project_teams ptm
      JOIN profiles pr ON ptm.profile_id = pr.id
      WHERE pr.user_id = auth.uid() AND ptm.status = 'accepted'
    )
  )
);

-- Project participants can create comments
CREATE POLICY "Project participants can create task comments"
ON public.project_task_comments
FOR INSERT
WITH CHECK (
  author_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  AND task_id IN (
    SELECT pt.id FROM project_tasks pt
    WHERE pt.project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON p.owner_id = pr.id
      WHERE pr.user_id = auth.uid()
      UNION
      SELECT ptm.project_id FROM project_teams ptm
      JOIN profiles pr ON ptm.profile_id = pr.id
      WHERE pr.user_id = auth.uid() AND ptm.status = 'accepted'
    )
  )
);

-- Authors can delete own comments
CREATE POLICY "Authors can delete own task comments"
ON public.project_task_comments
FOR DELETE
USING (author_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Also allow org admins to view/manage for cluster projects
CREATE POLICY "Org admins can view cluster task comments"
ON public.project_task_comments
FOR SELECT
USING (
  task_id IN (
    SELECT pt.id FROM project_tasks pt
    JOIN projects p ON pt.project_id = p.id
    WHERE p.cluster_id IS NOT NULL AND is_org_member(auth.uid(), p.cluster_id)
  )
);

CREATE POLICY "Org admins can delete cluster task comments"
ON public.project_task_comments
FOR DELETE
USING (
  task_id IN (
    SELECT pt.id FROM project_tasks pt
    JOIN projects p ON pt.project_id = p.id
    WHERE p.cluster_id IS NOT NULL AND has_org_role(auth.uid(), p.cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
  )
);
