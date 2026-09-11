-- Add new profile columns for enhanced talent data
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS work_experience TEXT,
ADD COLUMN IF NOT EXISTS project_types TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS years_total_experience INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.work_experience IS 'Summary of past roles and experience';
COMMENT ON COLUMN public.profiles.project_types IS 'Preferred project types: short-term, long-term, full-time';
COMMENT ON COLUMN public.profiles.years_total_experience IS 'Total years of professional experience';
COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Whether talent has completed full onboarding (10+ skills)';