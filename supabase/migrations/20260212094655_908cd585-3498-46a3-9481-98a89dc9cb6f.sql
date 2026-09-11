
-- Drop the existing overly permissive SELECT policy for crm_contacts
DROP POLICY IF EXISTS "Org members can view contacts" ON public.crm_contacts;

-- Create new policy: Managers (owner/admin/pm) see all org contacts, regular members see only their own
CREATE POLICY "Org members can view contacts"
ON public.crm_contacts
FOR SELECT
USING (
  has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role, 'project_manager'::org_role])
  OR is_cluster_admin(auth.uid(), cluster_id)
  OR (created_by IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()))
);
