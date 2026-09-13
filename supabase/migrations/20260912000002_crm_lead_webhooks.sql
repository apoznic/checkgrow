-- Inbound lead webhooks: external systems POST leads into the CRM.

ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS source TEXT;

CREATE TABLE public.crm_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_label TEXT,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  enabled BOOLEAN NOT NULL DEFAULT true,
  default_stage public.deal_stage NOT NULL DEFAULT 'lead',
  default_assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  received_count INTEGER NOT NULL DEFAULT 0,
  last_received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_webhooks_cluster ON public.crm_webhooks(cluster_id);

CREATE TABLE public.crm_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.crm_webhooks(id) ON DELETE CASCADE,
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  external_id TEXT,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'duplicate', 'error')),
  error TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  deal_id UUID REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_webhook_events_webhook ON public.crm_webhook_events(webhook_id, created_at DESC);
CREATE INDEX idx_crm_webhook_events_cluster ON public.crm_webhook_events(cluster_id, created_at DESC);
CREATE UNIQUE INDEX idx_crm_webhook_events_external ON public.crm_webhook_events(webhook_id, external_id)
  WHERE external_id IS NOT NULL;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.crm_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.crm_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_webhook_events ENABLE ROW LEVEL SECURITY;

-- Members can see the organization's webhooks and their delivery log;
-- owners and admins manage them. Events are written by the edge function only.
CREATE POLICY "crm_webhooks_select" ON public.crm_webhooks FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), cluster_id));
CREATE POLICY "crm_webhooks_manage" ON public.crm_webhooks FOR ALL TO authenticated
  USING (public.is_org_manager(cluster_id)) WITH CHECK (public.is_org_manager(cluster_id));
CREATE POLICY "crm_webhook_events_select" ON public.crm_webhook_events FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), cluster_id));

-- Atomic counter bump used by the crm-lead-webhook edge function (service role only)
CREATE OR REPLACE FUNCTION public.bump_webhook_counter(_webhook_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.crm_webhooks
  SET received_count = received_count + 1, last_received_at = now()
  WHERE id = _webhook_id
$$;
REVOKE EXECUTE ON FUNCTION public.bump_webhook_counter(uuid) FROM anon, authenticated, public;
