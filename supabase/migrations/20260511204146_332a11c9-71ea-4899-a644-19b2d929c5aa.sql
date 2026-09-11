
-- Newsletter groups (tags) per kolektive
CREATE TABLE public.newsletter_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id uuid NOT NULL,
  name text NOT NULL,
  color text DEFAULT 'amber',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cluster_id, name)
);

-- Newsletter contacts (mirrors Resend audience contacts + group tags)
CREATE TABLE public.newsletter_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  resend_contact_id text,
  group_ids uuid[] NOT NULL DEFAULT '{}',
  unsubscribed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cluster_id, email)
);

-- Newsletter sent campaigns log
CREATE TABLE public.newsletter_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id uuid NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  group_id uuid,
  recipients_count int NOT NULL DEFAULT 0,
  sent_by uuid,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;

-- Only kolektive owners can access
CREATE POLICY "owner select groups" ON public.newsletter_groups FOR SELECT
  USING (public.has_org_role(auth.uid(), cluster_id, ARRAY['owner']::org_role[]));
CREATE POLICY "owner manage groups" ON public.newsletter_groups FOR ALL
  USING (public.has_org_role(auth.uid(), cluster_id, ARRAY['owner']::org_role[]))
  WITH CHECK (public.has_org_role(auth.uid(), cluster_id, ARRAY['owner']::org_role[]));

CREATE POLICY "owner select contacts" ON public.newsletter_contacts FOR SELECT
  USING (public.has_org_role(auth.uid(), cluster_id, ARRAY['owner']::org_role[]));
CREATE POLICY "owner manage contacts" ON public.newsletter_contacts FOR ALL
  USING (public.has_org_role(auth.uid(), cluster_id, ARRAY['owner']::org_role[]))
  WITH CHECK (public.has_org_role(auth.uid(), cluster_id, ARRAY['owner']::org_role[]));

CREATE POLICY "owner select campaigns" ON public.newsletter_campaigns FOR SELECT
  USING (public.has_org_role(auth.uid(), cluster_id, ARRAY['owner']::org_role[]));
CREATE POLICY "owner manage campaigns" ON public.newsletter_campaigns FOR ALL
  USING (public.has_org_role(auth.uid(), cluster_id, ARRAY['owner']::org_role[]))
  WITH CHECK (public.has_org_role(auth.uid(), cluster_id, ARRAY['owner']::org_role[]));

CREATE TRIGGER newsletter_contacts_updated_at
  BEFORE UPDATE ON public.newsletter_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_newsletter_contacts_cluster ON public.newsletter_contacts(cluster_id);
CREATE INDEX idx_newsletter_groups_cluster ON public.newsletter_groups(cluster_id);
