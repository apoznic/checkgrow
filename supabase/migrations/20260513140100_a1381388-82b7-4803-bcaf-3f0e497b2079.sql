
-- 1. Archive flag on private tasks
ALTER TABLE public.private_tasks
ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_private_tasks_archived ON public.private_tasks(profile_id, archived);

-- 2. Project Strategic Goals
CREATE TABLE IF NOT EXISTS public.project_strategic_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  position INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_strategic_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view strategic goals"
ON public.project_strategic_goals FOR SELECT
USING (
  public.is_project_member(auth.uid(), project_id)
  OR public.can_admin_manage_project_team(auth.uid(), project_id)
);

CREATE POLICY "Project members can insert strategic goals"
ON public.project_strategic_goals FOR INSERT
WITH CHECK (
  public.is_project_member(auth.uid(), project_id)
  OR public.can_admin_manage_project_team(auth.uid(), project_id)
);

CREATE POLICY "Project members can update strategic goals"
ON public.project_strategic_goals FOR UPDATE
USING (
  public.is_project_member(auth.uid(), project_id)
  OR public.can_admin_manage_project_team(auth.uid(), project_id)
);

CREATE POLICY "Project members can delete strategic goals"
ON public.project_strategic_goals FOR DELETE
USING (
  public.is_project_member(auth.uid(), project_id)
  OR public.can_admin_manage_project_team(auth.uid(), project_id)
);

CREATE TRIGGER project_strategic_goals_set_updated_at
BEFORE UPDATE ON public.project_strategic_goals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Registries
CREATE TABLE IF NOT EXISTS public.org_registries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.org_registry_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_id UUID NOT NULL REFERENCES public.org_registries(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  options JSONB,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(registry_id, key)
);

CREATE TABLE IF NOT EXISTS public.org_registry_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_id UUID NOT NULL REFERENCES public.org_registries(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  position INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registry_columns_registry ON public.org_registry_columns(registry_id, position);
CREATE INDEX IF NOT EXISTS idx_registry_rows_registry ON public.org_registry_rows(registry_id, position);

ALTER TABLE public.org_registries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_registry_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_registry_rows ENABLE ROW LEVEL SECURITY;

-- Registries policies
CREATE POLICY "Org members view registries"
ON public.org_registries FOR SELECT
USING (public.is_org_member(auth.uid(), cluster_id));

CREATE POLICY "Org managers insert registries"
ON public.org_registries FOR INSERT
WITH CHECK (public.has_org_role(auth.uid(), cluster_id, ARRAY['owner','admin','project_manager']::org_role[]));

CREATE POLICY "Org managers update registries"
ON public.org_registries FOR UPDATE
USING (public.has_org_role(auth.uid(), cluster_id, ARRAY['owner','admin','project_manager']::org_role[]));

CREATE POLICY "Org managers delete registries"
ON public.org_registries FOR DELETE
USING (public.has_org_role(auth.uid(), cluster_id, ARRAY['owner','admin','project_manager']::org_role[]));

-- Columns policies
CREATE POLICY "Org members view registry columns"
ON public.org_registry_columns FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.org_registries r
  WHERE r.id = registry_id AND public.is_org_member(auth.uid(), r.cluster_id)
));

CREATE POLICY "Org managers manage registry columns insert"
ON public.org_registry_columns FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.org_registries r
  WHERE r.id = registry_id AND public.has_org_role(auth.uid(), r.cluster_id, ARRAY['owner','admin','project_manager']::org_role[])
));

CREATE POLICY "Org managers manage registry columns update"
ON public.org_registry_columns FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.org_registries r
  WHERE r.id = registry_id AND public.has_org_role(auth.uid(), r.cluster_id, ARRAY['owner','admin','project_manager']::org_role[])
));

CREATE POLICY "Org managers manage registry columns delete"
ON public.org_registry_columns FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.org_registries r
  WHERE r.id = registry_id AND public.has_org_role(auth.uid(), r.cluster_id, ARRAY['owner','admin','project_manager']::org_role[])
));

-- Rows policies
CREATE POLICY "Org members view registry rows"
ON public.org_registry_rows FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.org_registries r
  WHERE r.id = registry_id AND public.is_org_member(auth.uid(), r.cluster_id)
));

CREATE POLICY "Org managers insert registry rows"
ON public.org_registry_rows FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.org_registries r
  WHERE r.id = registry_id AND public.has_org_role(auth.uid(), r.cluster_id, ARRAY['owner','admin','project_manager']::org_role[])
));

CREATE POLICY "Org managers update registry rows"
ON public.org_registry_rows FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.org_registries r
  WHERE r.id = registry_id AND public.has_org_role(auth.uid(), r.cluster_id, ARRAY['owner','admin','project_manager']::org_role[])
));

CREATE POLICY "Org managers delete registry rows"
ON public.org_registry_rows FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.org_registries r
  WHERE r.id = registry_id AND public.has_org_role(auth.uid(), r.cluster_id, ARRAY['owner','admin','project_manager']::org_role[])
));

CREATE TRIGGER org_registries_set_updated_at
BEFORE UPDATE ON public.org_registries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER org_registry_rows_set_updated_at
BEFORE UPDATE ON public.org_registry_rows
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
