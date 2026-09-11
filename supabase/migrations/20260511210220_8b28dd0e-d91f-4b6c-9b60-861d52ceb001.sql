ALTER TABLE public.newsletter_contacts ADD COLUMN IF NOT EXISTS audience_id text;
ALTER TABLE public.newsletter_contacts DROP CONSTRAINT IF EXISTS newsletter_contacts_cluster_id_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_contacts_cluster_audience_email_key
  ON public.newsletter_contacts(cluster_id, audience_id, email);
CREATE INDEX IF NOT EXISTS idx_newsletter_contacts_audience ON public.newsletter_contacts(audience_id);
ALTER TABLE public.newsletter_campaigns ADD COLUMN IF NOT EXISTS audience_id text;