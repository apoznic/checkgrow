-- Outbound webhooks: push lead events to other systems with signed, retried
-- deliveries. Mirrors the inbound side so both directions are editable in
-- CRM → Webhooks.

-- Which inbound webhook (if any) created a deal. Lets outbound webhooks skip
-- leads that came in through a webhook, so two systems never echo each other.
ALTER TABLE public.crm_deals
  ADD COLUMN inbound_webhook_id UUID REFERENCES public.crm_webhooks(id) ON DELETE SET NULL;

CREATE TABLE public.crm_outbound_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  secret TEXT NOT NULL DEFAULT 'owhsec_' || encode(gen_random_bytes(24), 'hex'),
  -- lead.created | lead.updated | lead.stage_changed | lead.won | lead.lost
  events TEXT[] NOT NULL DEFAULT ARRAY['lead.created'],
  -- envelope: { event, sent_at, delivery_id, lead: {...} }   flat: { name, email, phone, ... }
  payload_format TEXT NOT NULL DEFAULT 'envelope' CHECK (payload_format IN ('envelope', 'flat')),
  exclude_inbound BOOLEAN NOT NULL DEFAULT true,
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  last_delivered_at TIMESTAMPTZ,
  last_status_code INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_outbound_webhooks_cluster ON public.crm_outbound_webhooks(cluster_id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.crm_outbound_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.crm_outbound_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.crm_outbound_webhooks(id) ON DELETE CASCADE,
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  deal_id UUID REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_status_code INTEGER,
  last_error TEXT,
  request_body JSONB,
  response_body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ
);
CREATE INDEX idx_crm_outbound_deliveries_due ON public.crm_outbound_deliveries(next_attempt_at) WHERE status = 'pending';
CREATE INDEX idx_crm_outbound_deliveries_webhook ON public.crm_outbound_deliveries(webhook_id, created_at DESC);
CREATE INDEX idx_crm_outbound_deliveries_cluster ON public.crm_outbound_deliveries(cluster_id, created_at DESC);

ALTER TABLE public.crm_outbound_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_outbound_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_outbound_webhooks_select" ON public.crm_outbound_webhooks FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), cluster_id));
CREATE POLICY "crm_outbound_webhooks_manage" ON public.crm_outbound_webhooks FOR ALL TO authenticated
  USING (public.is_org_manager(cluster_id)) WITH CHECK (public.is_org_manager(cluster_id));
CREATE POLICY "crm_outbound_deliveries_select" ON public.crm_outbound_deliveries FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), cluster_id));
-- Managers can queue a retry / test from the UI; the dispatcher (service role) does the rest.
CREATE POLICY "crm_outbound_deliveries_manage" ON public.crm_outbound_deliveries FOR ALL TO authenticated
  USING (public.is_org_manager(cluster_id)) WITH CHECK (public.is_org_manager(cluster_id));

ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_outbound_webhooks, public.crm_outbound_deliveries;

-- The dispatcher shares the scheduler secret with the automation runner.
ALTER TABLE public.automation_runner_config ADD COLUMN dispatcher_url TEXT;
UPDATE public.automation_runner_config
SET dispatcher_url = replace(runner_url, 'crm-automation-runner', 'crm-outbound-dispatcher')
WHERE id = 1;

-- Queue deliveries whenever a deal is created or meaningfully changed, then
-- wake the dispatcher so they go out right away.
CREATE OR REPLACE FUNCTION public.enqueue_outbound_deal_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  evt TEXT;
  extra JSONB := '{}'::jsonb;
  cfg RECORD;
  queued INTEGER := 0;
BEGIN
  IF TG_OP = 'INSERT' THEN
    evt := 'lead.created';
  ELSE
    IF NEW.stage IS DISTINCT FROM OLD.stage THEN
      evt := CASE NEW.stage::text WHEN 'won' THEN 'lead.won' WHEN 'lost' THEN 'lead.lost' ELSE 'lead.stage_changed' END;
      extra := jsonb_build_object('previous_stage', OLD.stage);
    ELSIF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.value IS DISTINCT FROM OLD.value
       OR NEW.contact_id IS DISTINCT FROM OLD.contact_id
       OR NEW.description IS DISTINCT FROM OLD.description THEN
      evt := 'lead.updated';
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.crm_outbound_deliveries (webhook_id, cluster_id, event, deal_id, data)
  SELECT w.id, NEW.cluster_id, evt, NEW.id, extra
  FROM public.crm_outbound_webhooks w
  WHERE w.cluster_id = NEW.cluster_id
    AND w.enabled
    AND (evt = ANY(w.events) OR (evt IN ('lead.won', 'lead.lost') AND 'lead.stage_changed' = ANY(w.events)))
    AND NOT (w.exclude_inbound AND NEW.inbound_webhook_id IS NOT NULL);
  GET DIAGNOSTICS queued = ROW_COUNT;

  IF queued > 0 THEN
    SELECT secret, dispatcher_url INTO cfg FROM public.automation_runner_config WHERE id = 1;
    IF FOUND AND cfg.dispatcher_url IS NOT NULL THEN
      BEGIN
        PERFORM net.http_post(
          url := cfg.dispatcher_url,
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-runner-secret', cfg.secret),
          body := jsonb_build_object('source', 'trigger', 'cluster_id', NEW.cluster_id)
        );
      EXCEPTION WHEN OTHERS THEN
        NULL; -- the scheduler picks the delivery up within 5 minutes
      END;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS crm_deals_outbound_events ON public.crm_deals;
CREATE TRIGGER crm_deals_outbound_events
  AFTER INSERT OR UPDATE ON public.crm_deals
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_outbound_deal_events();

-- Scheduler: retry pending deliveries every 5 minutes.
DO $$
BEGIN
  PERFORM cron.unschedule('crm-outbound-dispatcher');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$
BEGIN
  PERFORM cron.schedule(
    'crm-outbound-dispatcher',
    '*/5 * * * *',
    $job$
      SELECT net.http_post(
        url := (SELECT dispatcher_url FROM public.automation_runner_config WHERE id = 1),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-runner-secret', (SELECT secret FROM public.automation_runner_config WHERE id = 1)
        ),
        body := '{"source":"cron"}'::jsonb
      );
    $job$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'could not schedule dispatcher: %', SQLERRM;
END $$;
