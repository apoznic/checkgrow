
-- Fix: Allow all org members to see enrollments in their organization
CREATE POLICY "Org members can view all enrollments in their cluster"
ON public.cluster_enrollments
FOR SELECT
USING (is_org_member(auth.uid(), cluster_id));

-- Fix: Set Owner role for adrian.poznic@gmail.com in KUT Agency
UPDATE public.cluster_enrollments
SET role = 'owner'
WHERE profile_id = '2a1e3ce4-f11f-43b3-acf8-fa9fbbc26d6c'
  AND cluster_id = '068aef74-a07e-4a29-8765-4a65c72ba828';
