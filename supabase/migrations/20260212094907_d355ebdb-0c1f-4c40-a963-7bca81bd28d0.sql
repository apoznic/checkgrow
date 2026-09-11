
-- Add time management and notes columns to crm_tasks
ALTER TABLE public.crm_tasks ADD COLUMN IF NOT EXISTS estimated_hours numeric DEFAULT NULL;
ALTER TABLE public.crm_tasks ADD COLUMN IF NOT EXISTS actual_hours numeric DEFAULT NULL;
ALTER TABLE public.crm_tasks ADD COLUMN IF NOT EXISTS notes text DEFAULT NULL;
