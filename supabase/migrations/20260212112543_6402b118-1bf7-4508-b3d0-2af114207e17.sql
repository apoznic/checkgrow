
-- Create task comments table
CREATE TABLE public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.crm_tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Org members can view comments on tasks in their cluster
CREATE POLICY "Org members can view task comments"
ON public.task_comments FOR SELECT
USING (task_id IN (
  SELECT t.id FROM crm_tasks t
  WHERE is_org_member(auth.uid(), t.cluster_id) OR is_cluster_admin(auth.uid(), t.cluster_id)
));

-- Org members can create comments
CREATE POLICY "Org members can create task comments"
ON public.task_comments FOR INSERT
WITH CHECK (
  author_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  AND task_id IN (
    SELECT t.id FROM crm_tasks t
    WHERE is_org_member(auth.uid(), t.cluster_id) OR is_cluster_admin(auth.uid(), t.cluster_id)
  )
);

-- Authors can delete own comments
CREATE POLICY "Authors can delete own comments"
ON public.task_comments FOR DELETE
USING (author_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;
