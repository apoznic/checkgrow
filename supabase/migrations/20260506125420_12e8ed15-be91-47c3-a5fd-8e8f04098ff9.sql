
-- Link groups for My Life
CREATE TABLE public.private_link_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.private_link_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own private link groups" ON public.private_link_groups
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

ALTER TABLE public.private_links
  ADD COLUMN group_id uuid REFERENCES public.private_link_groups(id) ON DELETE SET NULL;

-- Key people for projects
CREATE TABLE public.project_key_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES crm_contacts(id) ON DELETE SET NULL,
  name text NOT NULL,
  role text,
  email text,
  phone text,
  company text,
  avatar_url text,
  notes text,
  position integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_key_people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view key people"
ON public.project_key_people FOR SELECT
USING (
  project_id IN (
    SELECT p.id FROM projects p
    JOIN profiles pr ON p.owner_id = pr.id
    WHERE pr.user_id = auth.uid()
    UNION
    SELECT pt.project_id FROM project_teams pt
    JOIN profiles pr ON pt.profile_id = pr.id
    WHERE pr.user_id = auth.uid() AND pt.status = 'accepted'
  )
  OR project_id IN (
    SELECT p.id FROM projects p
    WHERE p.cluster_id IS NOT NULL AND is_org_member(auth.uid(), p.cluster_id)
  )
);

CREATE POLICY "Project members can create key people"
ON public.project_key_people FOR INSERT
WITH CHECK (
  created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  AND (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON p.owner_id = pr.id
      WHERE pr.user_id = auth.uid()
      UNION
      SELECT pt.project_id FROM project_teams pt
      JOIN profiles pr ON pt.profile_id = pr.id
      WHERE pr.user_id = auth.uid() AND pt.status = 'accepted'
    )
    OR project_id IN (
      SELECT p.id FROM projects p
      WHERE p.cluster_id IS NOT NULL AND has_org_role(auth.uid(), p.cluster_id, ARRAY['owner'::org_role, 'admin'::org_role, 'project_manager'::org_role])
    )
  )
);

CREATE POLICY "Project members can update key people"
ON public.project_key_people FOR UPDATE
USING (
  project_id IN (
    SELECT p.id FROM projects p
    JOIN profiles pr ON p.owner_id = pr.id
    WHERE pr.user_id = auth.uid()
    UNION
    SELECT pt.project_id FROM project_teams pt
    JOIN profiles pr ON pt.profile_id = pr.id
    WHERE pr.user_id = auth.uid() AND pt.status = 'accepted'
  )
  OR project_id IN (
    SELECT p.id FROM projects p
    WHERE p.cluster_id IS NOT NULL AND has_org_role(auth.uid(), p.cluster_id, ARRAY['owner'::org_role, 'admin'::org_role, 'project_manager'::org_role])
  )
);

CREATE POLICY "Project members can delete key people"
ON public.project_key_people FOR DELETE
USING (
  created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR project_id IN (
    SELECT p.id FROM projects p
    JOIN profiles pr ON p.owner_id = pr.id
    WHERE pr.user_id = auth.uid()
  )
  OR project_id IN (
    SELECT p.id FROM projects p
    WHERE p.cluster_id IS NOT NULL AND has_org_role(auth.uid(), p.cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
  )
);

-- Allow tasks to be assigned to a key person instead of a team member
ALTER TABLE public.project_tasks
  ADD COLUMN key_person_id uuid REFERENCES public.project_key_people(id) ON DELETE SET NULL;
