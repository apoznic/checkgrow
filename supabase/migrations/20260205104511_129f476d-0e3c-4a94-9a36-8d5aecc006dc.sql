-- Allow org admins/owners to approve/reject requests and change roles
-- (Without this, the PATCH can return 204 but update 0 rows under RLS.)

ALTER TABLE public.cluster_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org admins can update enrollments" ON public.cluster_enrollments;
CREATE POLICY "Org admins can update enrollments"
ON public.cluster_enrollments
FOR UPDATE
USING (
  public.has_org_role(auth.uid(), cluster_id, ARRAY['owner','admin']::public.org_role[])
)
WITH CHECK (
  public.has_org_role(auth.uid(), cluster_id, ARRAY['owner','admin']::public.org_role[])
);
