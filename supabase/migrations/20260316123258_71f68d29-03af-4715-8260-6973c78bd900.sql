-- Create cluster-level Google Calendar tokens table
CREATE TABLE public.cluster_calendar_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id uuid NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  connected_by uuid NOT NULL REFERENCES public.profiles(id),
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  calendar_id text DEFAULT 'primary',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cluster_id)
);

-- Enable RLS
ALTER TABLE public.cluster_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Only org admins/owners can manage calendar tokens
CREATE POLICY "Org admins can manage calendar tokens"
  ON public.cluster_calendar_tokens
  FOR ALL
  TO authenticated
  USING (has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role]))
  WITH CHECK (has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role]));

-- Org members can view (to check connection status)
CREATE POLICY "Org members can view calendar tokens"
  ON public.cluster_calendar_tokens
  FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), cluster_id));