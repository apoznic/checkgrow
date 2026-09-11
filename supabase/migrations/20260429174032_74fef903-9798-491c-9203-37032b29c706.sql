ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS archived_from TEXT;

CREATE INDEX IF NOT EXISTS idx_project_tasks_archived_at ON public.project_tasks(archived_at);