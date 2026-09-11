
CREATE TABLE public.project_sticky_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'yellow',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_sticky_notes ENABLE ROW LEVEL SECURITY;

-- Members can view sticky notes in their projects
CREATE POLICY "Project members can view sticky notes" ON public.project_sticky_notes
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p JOIN profiles pr ON p.owner_id = pr.id WHERE pr.user_id = auth.uid()
      UNION
      SELECT pt.project_id FROM project_teams pt JOIN profiles pr ON pt.profile_id = pr.id WHERE pr.user_id = auth.uid() AND pt.status = 'accepted'
    )
    OR project_id IN (
      SELECT p.id FROM projects p WHERE p.cluster_id IS NOT NULL AND is_org_member(auth.uid(), p.cluster_id)
    )
  );

-- Members can create sticky notes
CREATE POLICY "Project members can create sticky notes" ON public.project_sticky_notes
  FOR INSERT WITH CHECK (
    author_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND (
      project_id IN (
        SELECT p.id FROM projects p JOIN profiles pr ON p.owner_id = pr.id WHERE pr.user_id = auth.uid()
        UNION
        SELECT pt.project_id FROM project_teams pt JOIN profiles pr ON pt.profile_id = pr.id WHERE pr.user_id = auth.uid() AND pt.status = 'accepted'
      )
      OR project_id IN (
        SELECT p.id FROM projects p WHERE p.cluster_id IS NOT NULL AND is_org_member(auth.uid(), p.cluster_id)
      )
    )
  );

-- Authors can update their own sticky notes
CREATE POLICY "Authors can update own sticky notes" ON public.project_sticky_notes
  FOR UPDATE USING (
    author_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Authors can delete their own sticky notes, owners/admins can delete any
CREATE POLICY "Authors can delete own sticky notes" ON public.project_sticky_notes
  FOR DELETE USING (
    author_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Project owners can delete any sticky notes" ON public.project_sticky_notes
  FOR DELETE USING (
    project_id IN (
      SELECT p.id FROM projects p JOIN profiles pr ON p.owner_id = pr.id WHERE pr.user_id = auth.uid()
    )
    OR project_id IN (
      SELECT p.id FROM projects p WHERE p.cluster_id IS NOT NULL AND has_org_role(auth.uid(), p.cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
    )
  );
