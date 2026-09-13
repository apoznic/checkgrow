-- Structured attribution on deals so leads can be filtered by source, campaign, form and ad.
ALTER TABLE public.crm_deals
  ADD COLUMN campaign TEXT,
  ADD COLUMN form_name TEXT,
  ADD COLUMN ad_name TEXT,
  ADD COLUMN attributes JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX idx_crm_deals_cluster_source ON public.crm_deals(cluster_id, source);
CREATE INDEX idx_crm_deals_cluster_campaign ON public.crm_deals(cluster_id, campaign);

-- Backfill from the webhook delivery that created each deal.
UPDATE public.crm_deals d
SET campaign  = COALESCE(d.campaign, p.campaign),
    form_name = COALESCE(d.form_name, p.form_name),
    ad_name   = COALESCE(d.ad_name, p.ad_name),
    attributes = CASE WHEN d.attributes = '{}'::jsonb THEN p.body ELSE d.attributes END
FROM (
  SELECT DISTINCT ON (e.deal_id)
    e.deal_id,
    body,
    COALESCE(body->>'campaign', body->>'campaign_name', body->>'utm_campaign') AS campaign,
    COALESCE(body->>'form', body->>'form_name') AS form_name,
    COALESCE(body->>'ad', body->>'ad_name', body->>'adset_name', body->>'ad_set') AS ad_name
  FROM public.crm_webhook_events e
  CROSS JOIN LATERAL (
    SELECT CASE WHEN jsonb_typeof(e.payload->'lead') = 'object' THEN e.payload->'lead' ELSE e.payload END AS body
  ) b
  WHERE e.deal_id IS NOT NULL AND e.status = 'created'
  ORDER BY e.deal_id, e.created_at ASC
) p
WHERE p.deal_id = d.id;
