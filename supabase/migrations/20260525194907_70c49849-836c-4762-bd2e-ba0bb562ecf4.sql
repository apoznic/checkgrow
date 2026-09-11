
-- 1. user_roles: prevent admin self-escalation on existing clusters
DROP POLICY IF EXISTS "Users can add themselves as admin when creating org" ON public.user_roles;

CREATE POLICY "Users can bootstrap admin for new cluster"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'admin'::app_role
  AND cluster_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.cluster_id = user_roles.cluster_id
      AND ur.role = 'admin'::app_role
  )
);

CREATE POLICY "Existing admins can grant roles in their cluster"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  cluster_id IS NOT NULL
  AND public.is_cluster_admin(auth.uid(), cluster_id)
);

-- 2. projects: require authentication to read
DROP POLICY IF EXISTS "Users can view all projects" ON public.projects;
CREATE POLICY "Authenticated users can view projects"
ON public.projects
FOR SELECT
TO authenticated
USING (true);

-- 3. project_teams: require authentication to read
DROP POLICY IF EXISTS "Users can view project teams" ON public.project_teams;
CREATE POLICY "Authenticated users can view project teams"
ON public.project_teams
FOR SELECT
TO authenticated
USING (true);

-- 4. skills: require authentication to read
DROP POLICY IF EXISTS "Users can view all skills" ON public.skills;
CREATE POLICY "Authenticated users can view skills"
ON public.skills
FOR SELECT
TO authenticated
USING (true);

-- 5. clusters: require authentication to read
DROP POLICY IF EXISTS "Everyone can view clusters" ON public.clusters;
CREATE POLICY "Authenticated users can view clusters"
ON public.clusters
FOR SELECT
TO authenticated
USING (true);

-- 6. messages: require project membership for INSERT
DROP POLICY IF EXISTS "Project participants can send messages" ON public.messages;
CREATE POLICY "Project members can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  AND public.is_project_member(auth.uid(), project_id)
);

-- 7. project_activities: require project membership for INSERT
DROP POLICY IF EXISTS "Project participants can create activities" ON public.project_activities;
CREATE POLICY "Project members can create activities"
ON public.project_activities
FOR INSERT
TO authenticated
WITH CHECK (
  actor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  AND public.is_project_member(auth.uid(), project_id)
);

-- 8. storage: org-logos require owner/admin role for that cluster
DROP POLICY IF EXISTS "Org admins can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can delete logos" ON storage.objects;

CREATE POLICY "Org owners/admins can upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'org-logos'
  AND public.has_org_role(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid,
    ARRAY['owner'::org_role, 'admin'::org_role]
  )
);

CREATE POLICY "Org owners/admins can update logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'org-logos'
  AND public.has_org_role(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid,
    ARRAY['owner'::org_role, 'admin'::org_role]
  )
);

CREATE POLICY "Org owners/admins can delete logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'org-logos'
  AND public.has_org_role(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid,
    ARRAY['owner'::org_role, 'admin'::org_role]
  )
);

-- 9. storage: make task-attachments private and require auth to read
UPDATE storage.buckets SET public = false WHERE id = 'task-attachments';

DROP POLICY IF EXISTS "Anyone can view task attachments" ON storage.objects;
CREATE POLICY "Authenticated users can view task attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'task-attachments');
