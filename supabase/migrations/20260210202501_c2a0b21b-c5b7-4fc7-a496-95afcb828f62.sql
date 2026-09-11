
-- Add approval_status to crm_deals for member request workflow
ALTER TABLE public.crm_deals ADD COLUMN approval_status text NOT NULL DEFAULT 'approved';

-- Allow all org members to create contacts (not just PMs)
DROP POLICY IF EXISTS "Managers can create contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "PMs and above can create contacts" ON public.crm_contacts;
CREATE POLICY "Org members can create contacts"
ON public.crm_contacts
FOR INSERT
WITH CHECK (is_org_member(auth.uid(), cluster_id) OR is_cluster_admin(auth.uid(), cluster_id));

-- Members can delete their own contacts
CREATE POLICY "Members can delete own contacts"
ON public.crm_contacts
FOR DELETE
USING (created_by IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()));

-- Allow all org members to create deals (as requests)
DROP POLICY IF EXISTS "Managers can create deals" ON public.crm_deals;
DROP POLICY IF EXISTS "PMs and above can create deals" ON public.crm_deals;
CREATE POLICY "Org members can create deals"
ON public.crm_deals
FOR INSERT
WITH CHECK (is_org_member(auth.uid(), cluster_id) OR is_cluster_admin(auth.uid(), cluster_id));
