ALTER TABLE public.org_registries
  ADD COLUMN IF NOT EXISTS webhook_token text UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  ADD COLUMN IF NOT EXISTS webhook_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS webhook_last_received_at timestamptz;

UPDATE public.org_registries SET webhook_token = encode(gen_random_bytes(24), 'hex') WHERE webhook_token IS NULL;