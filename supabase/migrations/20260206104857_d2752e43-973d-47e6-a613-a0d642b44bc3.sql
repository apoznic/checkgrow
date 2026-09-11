-- Allow org admins/owners to remove members from their organization
CREATE POLICY "Admins can remove members from organization"
ON public.cluster_enrollments
FOR DELETE
USING (
  has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
  OR is_cluster_admin(auth.uid(), cluster_id)
);