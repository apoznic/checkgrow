-- Fix: When creating an organization, the admin needs to be in cluster_enrollments too
-- This migration adds an INSERT policy that allows admins (via user_roles) to also create org announcements, resources, etc.

-- Drop and recreate the INSERT policy for org_announcements to allow both:
-- 1. Users with org_role via cluster_enrollments
-- 2. Users who are cluster admins via user_roles (for new org creators)
DROP POLICY IF EXISTS "Admins and owners can create announcements" ON public.org_announcements;

CREATE POLICY "Admins and owners can create announcements"
ON public.org_announcements FOR INSERT
TO authenticated
WITH CHECK (
  has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
  OR is_cluster_admin(auth.uid(), cluster_id)
);

-- Same fix for resources
DROP POLICY IF EXISTS "Managers can create resources" ON public.org_resources;

CREATE POLICY "Managers and admins can create resources"
ON public.org_resources FOR INSERT
TO authenticated
WITH CHECK (
  has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role, 'project_manager'::org_role])
  OR is_cluster_admin(auth.uid(), cluster_id)
);

-- Fix DELETE policy for resources
DROP POLICY IF EXISTS "Admins can manage resources" ON public.org_resources;

CREATE POLICY "Admins can delete resources"
ON public.org_resources FOR DELETE
TO authenticated
USING (
  has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
  OR is_cluster_admin(auth.uid(), cluster_id)
);

-- Fix the UPDATE and DELETE for announcements too
DROP POLICY IF EXISTS "Admins and owners can update announcements" ON public.org_announcements;
DROP POLICY IF EXISTS "Admins and owners can delete announcements" ON public.org_announcements;

CREATE POLICY "Admins and owners can update announcements"
ON public.org_announcements FOR UPDATE
TO authenticated
USING (
  has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
  OR is_cluster_admin(auth.uid(), cluster_id)
);

CREATE POLICY "Admins and owners can delete announcements"
ON public.org_announcements FOR DELETE
TO authenticated
USING (
  has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
  OR is_cluster_admin(auth.uid(), cluster_id)
);

-- Fix SELECT policies to also allow cluster admins
DROP POLICY IF EXISTS "Org members can view announcements" ON public.org_announcements;
DROP POLICY IF EXISTS "Org members can view resources" ON public.org_resources;

CREATE POLICY "Org members can view announcements"
ON public.org_announcements FOR SELECT
TO authenticated
USING (
  is_org_member(auth.uid(), cluster_id)
  OR is_cluster_admin(auth.uid(), cluster_id)
);

CREATE POLICY "Org members can view resources"
ON public.org_resources FOR SELECT
TO authenticated
USING (
  is_org_member(auth.uid(), cluster_id)
  OR is_cluster_admin(auth.uid(), cluster_id)
);

-- Same fixes for CRM tables
DROP POLICY IF EXISTS "Org members can view contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Managers can create contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Managers can update contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Admins can delete contacts" ON public.crm_contacts;

CREATE POLICY "Org members can view contacts"
ON public.crm_contacts FOR SELECT
TO authenticated
USING (
  is_org_member(auth.uid(), cluster_id)
  OR is_cluster_admin(auth.uid(), cluster_id)
);

CREATE POLICY "Managers can create contacts"
ON public.crm_contacts FOR INSERT
TO authenticated
WITH CHECK (
  has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role, 'project_manager'::org_role])
  OR is_cluster_admin(auth.uid(), cluster_id)
);

CREATE POLICY "Managers can update contacts"
ON public.crm_contacts FOR UPDATE
TO authenticated
USING (
  has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role, 'project_manager'::org_role])
  OR is_cluster_admin(auth.uid(), cluster_id)
);

CREATE POLICY "Admins can delete contacts"
ON public.crm_contacts FOR DELETE
TO authenticated
USING (
  has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
  OR is_cluster_admin(auth.uid(), cluster_id)
);

-- CRM Deals
DROP POLICY IF EXISTS "Org members can view deals" ON public.crm_deals;
DROP POLICY IF EXISTS "Managers can create deals" ON public.crm_deals;
DROP POLICY IF EXISTS "Managers can update deals" ON public.crm_deals;
DROP POLICY IF EXISTS "Admins can delete deals" ON public.crm_deals;

CREATE POLICY "Org members can view deals"
ON public.crm_deals FOR SELECT
TO authenticated
USING (
  is_org_member(auth.uid(), cluster_id)
  OR is_cluster_admin(auth.uid(), cluster_id)
);

CREATE POLICY "Managers can create deals"
ON public.crm_deals FOR INSERT
TO authenticated
WITH CHECK (
  has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role, 'project_manager'::org_role])
  OR is_cluster_admin(auth.uid(), cluster_id)
);

CREATE POLICY "Managers can update deals"
ON public.crm_deals FOR UPDATE
TO authenticated
USING (
  has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role, 'project_manager'::org_role])
  OR is_cluster_admin(auth.uid(), cluster_id)
);

CREATE POLICY "Admins can delete deals"
ON public.crm_deals FOR DELETE
TO authenticated
USING (
  has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
  OR is_cluster_admin(auth.uid(), cluster_id)
);

-- CRM Activities
DROP POLICY IF EXISTS "Org members can view activities" ON public.crm_activities;
DROP POLICY IF EXISTS "Org members can create activities" ON public.crm_activities;

CREATE POLICY "Org members can view activities"
ON public.crm_activities FOR SELECT
TO authenticated
USING (
  is_org_member(auth.uid(), cluster_id)
  OR is_cluster_admin(auth.uid(), cluster_id)
);

CREATE POLICY "Org members can create activities"
ON public.crm_activities FOR INSERT
TO authenticated
WITH CHECK (
  is_org_member(auth.uid(), cluster_id)
  OR is_cluster_admin(auth.uid(), cluster_id)
);

-- CRM Tasks
DROP POLICY IF EXISTS "Org members can view tasks" ON public.crm_tasks;
DROP POLICY IF EXISTS "Org members can create tasks" ON public.crm_tasks;
DROP POLICY IF EXISTS "Task owners can update their tasks" ON public.crm_tasks;

CREATE POLICY "Org members can view tasks"
ON public.crm_tasks FOR SELECT
TO authenticated
USING (
  is_org_member(auth.uid(), cluster_id)
  OR is_cluster_admin(auth.uid(), cluster_id)
);

CREATE POLICY "Org members can create tasks"
ON public.crm_tasks FOR INSERT
TO authenticated
WITH CHECK (
  is_org_member(auth.uid(), cluster_id)
  OR is_cluster_admin(auth.uid(), cluster_id)
);

CREATE POLICY "Task owners can update their tasks"
ON public.crm_tasks FOR UPDATE
TO authenticated
USING (
  is_org_member(auth.uid(), cluster_id)
  OR is_cluster_admin(auth.uid(), cluster_id)
);