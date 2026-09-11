
-- Project milestones for timeline
CREATE TABLE public.project_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can manage milestones"
ON public.project_milestones FOR ALL
USING (project_id IN (
  SELECT p.id FROM projects p JOIN profiles pr ON p.owner_id = pr.id WHERE pr.user_id = auth.uid()
));

CREATE POLICY "Project participants can view milestones"
ON public.project_milestones FOR SELECT
USING (project_id IN (
  SELECT p.id FROM projects p JOIN profiles pr ON p.owner_id = pr.id WHERE pr.user_id = auth.uid()
  UNION
  SELECT pt.project_id FROM project_teams pt JOIN profiles pr ON pt.profile_id = pr.id WHERE pr.user_id = auth.uid() AND pt.status = 'accepted'
));

-- Project time entries for profitability
CREATE TABLE public.project_time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hours NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  billable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can manage all time entries"
ON public.project_time_entries FOR ALL
USING (project_id IN (
  SELECT p.id FROM projects p JOIN profiles pr ON p.owner_id = pr.id WHERE pr.user_id = auth.uid()
));

CREATE POLICY "Users can manage own time entries"
ON public.project_time_entries FOR ALL
USING (profile_id IN (
  SELECT pr.id FROM profiles pr WHERE pr.user_id = auth.uid()
));

CREATE POLICY "Project participants can view time entries"
ON public.project_time_entries FOR SELECT
USING (project_id IN (
  SELECT p.id FROM projects p JOIN profiles pr ON p.owner_id = pr.id WHERE pr.user_id = auth.uid()
  UNION
  SELECT pt.project_id FROM project_teams pt JOIN profiles pr ON pt.profile_id = pr.id WHERE pr.user_id = auth.uid() AND pt.status = 'accepted'
));

-- Project settings for hourly rate
CREATE TABLE public.project_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
  hourly_rate NUMERIC NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can manage settings"
ON public.project_settings FOR ALL
USING (project_id IN (
  SELECT p.id FROM projects p JOIN profiles pr ON p.owner_id = pr.id WHERE pr.user_id = auth.uid()
));

CREATE POLICY "Project participants can view settings"
ON public.project_settings FOR SELECT
USING (project_id IN (
  SELECT p.id FROM projects p JOIN profiles pr ON p.owner_id = pr.id WHERE pr.user_id = auth.uid()
  UNION
  SELECT pt.project_id FROM project_teams pt JOIN profiles pr ON pt.profile_id = pr.id WHERE pr.user_id = auth.uid() AND pt.status = 'accepted'
));
