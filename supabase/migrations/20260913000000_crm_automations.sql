-- Automations: a lead source (webhook) triggers a timed sequence of steps
-- (emails, tasks, owner assignment, stage changes, notifications).

CREATE TABLE public.crm_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  trigger_type TEXT NOT NULL DEFAULT 'webhook' CHECK (trigger_type IN ('webhook', 'any_inbound')),
  webhook_id UUID REFERENCES public.crm_webhooks(id) ON DELETE SET NULL,
  -- [{ field, op: 'equals'|'not_equals'|'contains'|'exists', value }]
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- [{ id, type: 'email'|'task'|'assign'|'stage'|'notify'|'wait', delay_minutes, ...fields }]
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  run_count INTEGER NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_automations_cluster ON public.crm_automations(cluster_id);

CREATE TABLE public.crm_automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.crm_automations(id) ON DELETE CASCADE,
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  webhook_event_id UUID REFERENCES public.crm_webhook_events(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  current_step INTEGER NOT NULL DEFAULT 0,
  next_run_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error TEXT,
  -- Template context: name, first_name, email, company, phone, source, lead_title, payload
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- [{ at, step, type, status, detail }]
  log JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_automation_runs_due ON public.crm_automation_runs(next_run_at) WHERE status = 'running';
CREATE INDEX idx_crm_automation_runs_cluster ON public.crm_automation_runs(cluster_id, created_at DESC);
CREATE INDEX idx_crm_automation_runs_deal ON public.crm_automation_runs(deal_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.crm_automations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.crm_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_automations_select" ON public.crm_automations FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), cluster_id));
CREATE POLICY "crm_automations_manage" ON public.crm_automations FOR ALL TO authenticated
  USING (public.is_org_manager(cluster_id)) WITH CHECK (public.is_org_manager(cluster_id));
CREATE POLICY "crm_automation_runs_select" ON public.crm_automation_runs FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), cluster_id));
-- Managers can cancel or retry a run from the UI; the runner (service role) does everything else.
CREATE POLICY "crm_automation_runs_update" ON public.crm_automation_runs FOR UPDATE TO authenticated
  USING (public.is_org_manager(cluster_id)) WITH CHECK (public.is_org_manager(cluster_id));

CREATE OR REPLACE FUNCTION public.bump_automation_counter(_automation_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.crm_automations
  SET run_count = run_count + 1, last_run_at = now()
  WHERE id = _automation_id
$$;
REVOKE EXECUTE ON FUNCTION public.bump_automation_counter(uuid) FROM anon, authenticated, public;

-- Shared secret between the database scheduler and the runner edge function.
-- No policies: only the service role and the scheduler (postgres) can read it.
CREATE TABLE public.automation_runner_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  secret TEXT NOT NULL,
  runner_url TEXT NOT NULL
);
ALTER TABLE public.automation_runner_config ENABLE ROW LEVEL SECURITY;
INSERT INTO public.automation_runner_config (id, secret, runner_url)
VALUES (1, encode(gen_random_bytes(32), 'hex'), 'https://pylycnelknmkchfweaph.supabase.co/functions/v1/crm-automation-runner');

-- Scheduler: wake the runner every 5 minutes so delayed steps fire on time.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available: %', SQLERRM;
END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('crm-automation-runner');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$
BEGIN
  PERFORM cron.schedule(
    'crm-automation-runner',
    '*/5 * * * *',
    $job$
      SELECT net.http_post(
        url := (SELECT runner_url FROM public.automation_runner_config WHERE id = 1),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-runner-secret', (SELECT secret FROM public.automation_runner_config WHERE id = 1)
        ),
        body := '{"source":"cron"}'::jsonb
      );
    $job$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'could not schedule runner: %', SQLERRM;
END $$;
