-- Embeddable lead forms. Each form owns an inbound webhook: submissions are
-- turned into leads by the same pipeline (source, stage, owner, automations).
CREATE TABLE public.crm_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  webhook_id UUID NOT NULL REFERENCES public.crm_webhooks(id) ON DELETE CASCADE,
  public_id TEXT NOT NULL UNIQUE DEFAULT 'frm_' || encode(gen_random_bytes(12), 'hex'),
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  -- [{ id, type: 'text'|'email'|'phone'|'textarea'|'select'|'checkbox'|'hidden', label, placeholder, required, options, map_to, value }]
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- { title, description, submit_label, success_message, redirect_url, accent, campaign, consent_text }
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  submissions_count INTEGER NOT NULL DEFAULT 0,
  last_submission_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_forms_cluster ON public.crm_forms(cluster_id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.crm_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.crm_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_forms_select" ON public.crm_forms FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), cluster_id));
CREATE POLICY "crm_forms_manage" ON public.crm_forms FOR ALL TO authenticated
  USING (public.is_org_manager(cluster_id)) WITH CHECK (public.is_org_manager(cluster_id));

CREATE OR REPLACE FUNCTION public.bump_form_counter(_form_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.crm_forms SET submissions_count = submissions_count + 1, last_submission_at = now() WHERE id = _form_id
$$;
REVOKE EXECUTE ON FUNCTION public.bump_form_counter(uuid) FROM anon, authenticated, public;
