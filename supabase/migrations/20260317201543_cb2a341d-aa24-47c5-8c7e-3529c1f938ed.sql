
CREATE TABLE public.cluster_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID REFERENCES public.clusters(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  invited_by UUID REFERENCES public.profiles(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(cluster_id, email)
);

ALTER TABLE public.cluster_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view invitations"
ON public.cluster_invitations
FOR SELECT
TO authenticated
USING (public.is_org_member(auth.uid(), cluster_id));

CREATE POLICY "Org admins can insert invitations"
ON public.cluster_invitations
FOR INSERT
TO authenticated
WITH CHECK (public.has_org_role(auth.uid(), cluster_id, ARRAY['owner','admin']::org_role[]));

CREATE POLICY "Org admins can update invitations"
ON public.cluster_invitations
FOR UPDATE
TO authenticated
USING (public.has_org_role(auth.uid(), cluster_id, ARRAY['owner','admin']::org_role[]));

CREATE POLICY "Org admins can delete invitations"
ON public.cluster_invitations
FOR DELETE
TO authenticated
USING (public.has_org_role(auth.uid(), cluster_id, ARRAY['owner','admin']::org_role[]));
