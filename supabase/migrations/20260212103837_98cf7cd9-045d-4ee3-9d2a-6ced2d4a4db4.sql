
-- Fix: Add 'in_progress' to allowed status values
ALTER TABLE public.crm_tasks DROP CONSTRAINT crm_tasks_status_check;
ALTER TABLE public.crm_tasks ADD CONSTRAINT crm_tasks_status_check 
  CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]));

-- Fix: Add 'urgent' to allowed priority values
ALTER TABLE public.crm_tasks DROP CONSTRAINT crm_tasks_priority_check;
ALTER TABLE public.crm_tasks ADD CONSTRAINT crm_tasks_priority_check 
  CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]));
