
-- Project link groups (mirrors private_link_groups)
CREATE TABLE IF NOT EXISTS public.project_link_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_links
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.project_link_groups(id) ON DELETE SET NULL;

ALTER TABLE public.project_link_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members view link groups"
ON public.project_link_groups FOR SELECT
USING (
  project_id IN (
    SELECT p.id FROM projects p JOIN profiles pr ON p.owner_id = pr.id WHERE pr.user_id = auth.uid()
    UNION
    SELECT pt.project_id FROM project_teams pt JOIN profiles pr ON pt.profile_id = pr.id
    WHERE pr.user_id = auth.uid() AND pt.status = 'accepted'
  )
  OR project_id IN (SELECT id FROM projects WHERE cluster_id IS NOT NULL AND is_org_member(auth.uid(), cluster_id))
);

CREATE POLICY "Project members manage link groups"
ON public.project_link_groups FOR ALL
USING (
  project_id IN (
    SELECT p.id FROM projects p JOIN profiles pr ON p.owner_id = pr.id WHERE pr.user_id = auth.uid()
    UNION
    SELECT pt.project_id FROM project_teams pt JOIN profiles pr ON pt.profile_id = pr.id
    WHERE pr.user_id = auth.uid() AND pt.status = 'accepted'
  )
  OR project_id IN (SELECT id FROM projects WHERE cluster_id IS NOT NULL AND is_org_member(auth.uid(), cluster_id))
)
WITH CHECK (
  project_id IN (
    SELECT p.id FROM projects p JOIN profiles pr ON p.owner_id = pr.id WHERE pr.user_id = auth.uid()
    UNION
    SELECT pt.project_id FROM project_teams pt JOIN profiles pr ON pt.profile_id = pr.id
    WHERE pr.user_id = auth.uid() AND pt.status = 'accepted'
  )
  OR project_id IN (SELECT id FROM projects WHERE cluster_id IS NOT NULL AND is_org_member(auth.uid(), cluster_id))
);

CREATE TRIGGER trg_project_link_groups_updated
BEFORE UPDATE ON public.project_link_groups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Project meetings (mirrors private_meetings)
CREATE TABLE IF NOT EXISTS public.project_meetings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  meeting_at timestamptz NOT NULL,
  location text,
  attendees text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members view meetings"
ON public.project_meetings FOR SELECT
USING (
  project_id IN (
    SELECT p.id FROM projects p JOIN profiles pr ON p.owner_id = pr.id WHERE pr.user_id = auth.uid()
    UNION
    SELECT pt.project_id FROM project_teams pt JOIN profiles pr ON pt.profile_id = pr.id
    WHERE pr.user_id = auth.uid() AND pt.status = 'accepted'
  )
  OR project_id IN (SELECT id FROM projects WHERE cluster_id IS NOT NULL AND is_org_member(auth.uid(), cluster_id))
);

CREATE POLICY "Project members manage meetings"
ON public.project_meetings FOR ALL
USING (
  project_id IN (
    SELECT p.id FROM projects p JOIN profiles pr ON p.owner_id = pr.id WHERE pr.user_id = auth.uid()
    UNION
    SELECT pt.project_id FROM project_teams pt JOIN profiles pr ON pt.profile_id = pr.id
    WHERE pr.user_id = auth.uid() AND pt.status = 'accepted'
  )
  OR project_id IN (SELECT id FROM projects WHERE cluster_id IS NOT NULL AND is_org_member(auth.uid(), cluster_id))
)
WITH CHECK (
  project_id IN (
    SELECT p.id FROM projects p JOIN profiles pr ON p.owner_id = pr.id WHERE pr.user_id = auth.uid()
    UNION
    SELECT pt.project_id FROM project_teams pt JOIN profiles pr ON pt.profile_id = pr.id
    WHERE pr.user_id = auth.uid() AND pt.status = 'accepted'
  )
  OR project_id IN (SELECT id FROM projects WHERE cluster_id IS NOT NULL AND is_org_member(auth.uid(), cluster_id))
);

CREATE TRIGGER trg_project_meetings_updated
BEFORE UPDATE ON public.project_meetings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
