-- Add google_drive_url to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS google_drive_url text;

-- Private personal task board (per profile, not per cluster)
CREATE TABLE IF NOT EXISTS public.private_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo',
  priority text NOT NULL DEFAULT 'medium',
  due_date timestamp with time zone,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.private_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own private tasks"
ON public.private_tasks FOR ALL
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE TRIGGER private_tasks_set_updated_at
BEFORE UPDATE ON public.private_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Private personal links
CREATE TABLE IF NOT EXISTS public.private_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.private_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own private links"
ON public.private_links FOR ALL
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Private personal meetings list
CREATE TABLE IF NOT EXISTS public.private_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  title text NOT NULL,
  meeting_at timestamp with time zone NOT NULL,
  location text,
  notes text,
  attendees text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.private_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own private meetings"
ON public.private_meetings FOR ALL
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE TRIGGER private_meetings_set_updated_at
BEFORE UPDATE ON public.private_meetings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();