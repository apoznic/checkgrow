
-- Fix crm_tasks UPDATE policies: drop restrictive ones and create proper permissive ones
DROP POLICY IF EXISTS "Assigned users and creators can update tasks" ON public.crm_tasks;
DROP POLICY IF EXISTS "Task owners can update their tasks" ON public.crm_tasks;

CREATE POLICY "Assigned users creators and members can update tasks" 
ON public.crm_tasks 
FOR UPDATE 
USING (
  (assigned_to IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()))
  OR (created_by IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()))
  OR has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
  OR is_org_member(auth.uid(), cluster_id)
);
