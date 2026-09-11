-- Add source column to projects table to track how the project was created
ALTER TABLE public.projects ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';

-- Comment for clarity
COMMENT ON COLUMN public.projects.source IS 'How the project was created: manual, demand_agent, or crm_deal';