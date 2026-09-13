-- Optional signing secret per inbound webhook. When set, every delivery must
-- carry an HMAC-SHA256 signature computed with this secret, or it is rejected.
ALTER TABLE public.crm_webhooks ADD COLUMN signing_secret TEXT;

-- Rejected deliveries are logged so a wrong secret or scheme is easy to spot.
ALTER TABLE public.crm_webhook_events DROP CONSTRAINT IF EXISTS crm_webhook_events_status_check;
ALTER TABLE public.crm_webhook_events
  ADD CONSTRAINT crm_webhook_events_status_check CHECK (status IN ('created', 'duplicate', 'error', 'rejected'));
