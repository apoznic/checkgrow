
CREATE TABLE public.cluster_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id uuid NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  encrypted_key text NOT NULL,
  config jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(cluster_id, service_name)
);

ALTER TABLE public.cluster_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage integrations"
ON public.cluster_integrations
FOR ALL
TO authenticated
USING (public.has_org_role(auth.uid(), cluster_id, ARRAY['owner', 'admin']::org_role[]))
WITH CHECK (public.has_org_role(auth.uid(), cluster_id, ARRAY['owner', 'admin']::org_role[]));
