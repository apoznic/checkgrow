ALTER TABLE public.crm_tasks ADD COLUMN task_type text NOT NULL DEFAULT 'thread';

-- Mark existing tasks as threads (backward compatible)
UPDATE public.crm_tasks SET task_type = 'thread' WHERE task_type = 'thread';