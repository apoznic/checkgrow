
CREATE TABLE public.plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text NOT NULL DEFAULT 'grg-mica',
  section text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'not_started',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  updated_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX plan_items_plan_key_idx ON public.plan_items (plan_key, section, sort_order);

GRANT SELECT ON public.plan_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_items TO authenticated;
GRANT ALL ON public.plan_items TO service_role;

ALTER TABLE public.plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plan items are publicly viewable"
  ON public.plan_items FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create plan items"
  ON public.plan_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update plan items"
  ON public.plan_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete plan items"
  ON public.plan_items FOR DELETE TO authenticated USING (true);

CREATE TRIGGER plan_items_set_updated_at
  BEFORE UPDATE ON public.plan_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.plan_item_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text NOT NULL DEFAULT 'grg-mica',
  item_id uuid REFERENCES public.plan_items(id) ON DELETE CASCADE,
  item_label text,
  field text NOT NULL,
  old_value text,
  new_value text,
  changed_by uuid,
  changed_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX plan_item_revisions_plan_key_idx ON public.plan_item_revisions (plan_key, created_at DESC);

GRANT SELECT ON public.plan_item_revisions TO anon;
GRANT SELECT, INSERT ON public.plan_item_revisions TO authenticated;
GRANT ALL ON public.plan_item_revisions TO service_role;

ALTER TABLE public.plan_item_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plan history is publicly viewable"
  ON public.plan_item_revisions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can log plan changes"
  ON public.plan_item_revisions FOR INSERT TO authenticated WITH CHECK (true);
