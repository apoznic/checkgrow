
-- Project-level comments (visible on the org projects tab before joining)
CREATE TABLE public.project_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;

-- All org members can view comments on cluster projects
CREATE POLICY "Org members can view project comments"
  ON public.project_comments FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.cluster_id IS NOT NULL AND is_org_member(auth.uid(), p.cluster_id)
    )
  );

-- All org members can add comments on cluster projects
CREATE POLICY "Org members can add project comments"
  ON public.project_comments FOR INSERT
  WITH CHECK (
    author_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid())
    AND project_id IN (
      SELECT p.id FROM projects p
      WHERE p.cluster_id IS NOT NULL AND is_org_member(auth.uid(), p.cluster_id)
    )
  );

-- Authors can delete their own comments
CREATE POLICY "Authors can delete own project comments"
  ON public.project_comments FOR DELETE
  USING (
    author_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid())
  );

-- Org admins can delete any comment
CREATE POLICY "Admins can delete project comments"
  ON public.project_comments FOR DELETE
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.cluster_id IS NOT NULL AND has_org_role(auth.uid(), p.cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
    )
  );
