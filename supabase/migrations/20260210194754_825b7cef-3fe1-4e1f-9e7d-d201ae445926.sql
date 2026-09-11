
-- Add estimated and actual hours to project_tasks
ALTER TABLE public.project_tasks ADD COLUMN IF NOT EXISTS estimated_hours numeric DEFAULT NULL;
ALTER TABLE public.project_tasks ADD COLUMN IF NOT EXISTS actual_hours numeric DEFAULT NULL;

-- Add deadline_type to project_milestones (hard = firm deadline, soft = flexible)
ALTER TABLE public.project_milestones ADD COLUMN IF NOT EXISTS deadline_type text DEFAULT 'hard';

-- Add billing_trigger flag to milestones (marks milestone as billing trigger point)
ALTER TABLE public.project_milestones ADD COLUMN IF NOT EXISTS is_billing_trigger boolean DEFAULT false;
