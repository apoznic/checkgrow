-- Fix the UPDATE policy to include is_cluster_admin check
-- First drop any duplicate policies
DROP POLICY IF EXISTS "Org admins can update enrollments" ON public.cluster_enrollments;
DROP POLICY IF EXISTS "Org admins and owners can update enrollments" ON public.cluster_enrollments;

-- Create proper policy that covers both org role holders AND cluster admins
CREATE POLICY "Org admins and owners can update enrollments"
ON public.cluster_enrollments
FOR UPDATE
USING (
  has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
  OR is_cluster_admin(auth.uid(), cluster_id)
)
WITH CHECK (
  has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
  OR is_cluster_admin(auth.uid(), cluster_id)
);