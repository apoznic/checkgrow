CREATE TABLE public.project_meeting_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  meeting_date timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'medium',
  decisions text NOT NULL DEFAULT '',
  next_steps text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pmn_project_date ON public.project_meeting_notes(project_id, meeting_date DESC);

ALTER TABLE public.project_meeting_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view meeting notes"
ON public.project_meeting_notes FOR SELECT
USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Project members can insert meeting notes"
ON public.project_meeting_notes FOR INSERT
WITH CHECK (
  public.is_project_member(auth.uid(), project_id)
  AND author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Authors or admins can update meeting notes"
ON public.project_meeting_notes FOR UPDATE
USING (
  author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.can_admin_manage_project_team(auth.uid(), project_id)
);

CREATE POLICY "Authors or admins can delete meeting notes"
ON public.project_meeting_notes FOR DELETE
USING (
  author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.can_admin_manage_project_team(auth.uid(), project_id)
);

CREATE TRIGGER update_pmn_updated_at
BEFORE UPDATE ON public.project_meeting_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.project_meeting_notes;