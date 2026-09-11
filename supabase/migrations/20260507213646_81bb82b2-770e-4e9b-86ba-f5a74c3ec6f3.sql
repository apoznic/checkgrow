
CREATE TABLE public.project_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.project_checklist_confirmations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.project_checklist_items(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_id, profile_id)
);

CREATE INDEX idx_pcl_items_project ON public.project_checklist_items(project_id);
CREATE INDEX idx_pcl_conf_item ON public.project_checklist_confirmations(item_id);

ALTER TABLE public.project_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_checklist_confirmations ENABLE ROW LEVEL SECURITY;

-- Helper: is caller a project team member (or owner) of given project
CREATE OR REPLACE FUNCTION public.is_project_member(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_teams pt
    JOIN profiles p ON pt.profile_id = p.id
    WHERE pt.project_id = _project_id
      AND p.user_id = _user_id
      AND pt.status = 'accepted'
  ) OR EXISTS (
    SELECT 1 FROM projects pr
    JOIN profiles p ON pr.owner_id = p.id
    WHERE pr.id = _project_id AND p.user_id = _user_id
  );
$$;

-- Items: any project member can view, create, update, delete
CREATE POLICY "Members view checklist items"
ON public.project_checklist_items FOR SELECT TO authenticated
USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members create checklist items"
ON public.project_checklist_items FOR INSERT TO authenticated
WITH CHECK (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members update checklist items"
ON public.project_checklist_items FOR UPDATE TO authenticated
USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members delete checklist items"
ON public.project_checklist_items FOR DELETE TO authenticated
USING (public.is_project_member(auth.uid(), project_id));

-- Confirmations: visible to project members; users insert/delete only their own
CREATE POLICY "Members view confirmations"
ON public.project_checklist_confirmations FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM project_checklist_items i
  WHERE i.id = item_id AND public.is_project_member(auth.uid(), i.project_id)
));

CREATE POLICY "Users add own confirmations"
ON public.project_checklist_confirmations FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = profile_id AND p.user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM project_checklist_items i
    WHERE i.id = item_id AND public.is_project_member(auth.uid(), i.project_id)
  )
);

CREATE POLICY "Users remove own confirmations"
ON public.project_checklist_confirmations FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
