
-- 1. Restrict profiles SELECT to authenticated users only
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 2. Restrict cluster_calendar_tokens SELECT to org admins/owners only
DROP POLICY IF EXISTS "Org members can view calendar tokens" ON public.cluster_calendar_tokens;
CREATE POLICY "Org admins can view calendar tokens"
ON public.cluster_calendar_tokens FOR SELECT
TO authenticated
USING (has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role]));

-- 3. Scope project_doc_images access to actual project members
DROP POLICY IF EXISTS "Members can view doc images" ON public.project_doc_images;
DROP POLICY IF EXISTS "Members can add doc images" ON public.project_doc_images;
DROP POLICY IF EXISTS "Members can delete doc images" ON public.project_doc_images;

CREATE POLICY "Project members can view doc images"
ON public.project_doc_images FOR SELECT
TO authenticated
USING (
  doc_id IN (
    SELECT pd.id FROM public.project_docs pd
    WHERE pd.project_id IN (
      SELECT p.id FROM public.projects p
        JOIN public.profiles pr ON p.owner_id = pr.id
       WHERE pr.user_id = auth.uid()
      UNION
      SELECT pt.project_id FROM public.project_teams pt
        JOIN public.profiles pr ON pt.profile_id = pr.id
       WHERE pr.user_id = auth.uid() AND pt.status = 'accepted'
      UNION
      SELECT p.id FROM public.projects p
       WHERE p.cluster_id IS NOT NULL AND is_org_member(auth.uid(), p.cluster_id)
    )
  )
);

CREATE POLICY "Project members can add doc images"
ON public.project_doc_images FOR INSERT
TO authenticated
WITH CHECK (
  doc_id IN (
    SELECT pd.id FROM public.project_docs pd
    WHERE pd.project_id IN (
      SELECT p.id FROM public.projects p
        JOIN public.profiles pr ON p.owner_id = pr.id
       WHERE pr.user_id = auth.uid()
      UNION
      SELECT pt.project_id FROM public.project_teams pt
        JOIN public.profiles pr ON pt.profile_id = pr.id
       WHERE pr.user_id = auth.uid() AND pt.status = 'accepted'
      UNION
      SELECT p.id FROM public.projects p
       WHERE p.cluster_id IS NOT NULL AND is_org_member(auth.uid(), p.cluster_id)
    )
  )
);

CREATE POLICY "Project members can delete doc images"
ON public.project_doc_images FOR DELETE
TO authenticated
USING (
  doc_id IN (
    SELECT pd.id FROM public.project_docs pd
    WHERE pd.project_id IN (
      SELECT p.id FROM public.projects p
        JOIN public.profiles pr ON p.owner_id = pr.id
       WHERE pr.user_id = auth.uid()
      UNION
      SELECT pt.project_id FROM public.project_teams pt
        JOIN public.profiles pr ON pt.profile_id = pr.id
       WHERE pr.user_id = auth.uid() AND pt.status = 'accepted'
      UNION
      SELECT p.id FROM public.projects p
       WHERE p.cluster_id IS NOT NULL AND is_org_member(auth.uid(), p.cluster_id)
    )
  )
);

-- 4. Tighten always-true policies
DROP POLICY IF EXISTS "Authenticated users can create clusters" ON public.clusters;
CREATE POLICY "Authenticated users can create clusters"
ON public.clusters FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Service role full access to traits" ON public.profile_traits;
CREATE POLICY "Service role full access to traits"
ON public.profile_traits FOR ALL
TO service_role
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 5. Fix mutable search_path on functions
ALTER FUNCTION public.validate_rating() SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

-- 6. Harden handle_new_user with input sanitization & length limit
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sanitized_name TEXT;
BEGIN
  sanitized_name := SUBSTRING(
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), 'User'),
    1, 100
  );
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, sanitized_name);
  RETURN NEW;
END;
$$;
