
-- Links for project docs/pages
CREATE TABLE public.project_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_links ENABLE ROW LEVEL SECURITY;

-- Same access as other project tables
CREATE POLICY "Project members can view links"
ON public.project_links FOR SELECT
USING (
  project_id IN (
    SELECT p.id FROM projects p JOIN profiles pr ON p.owner_id = pr.id WHERE pr.user_id = auth.uid()
    UNION
    SELECT pt.project_id FROM project_teams pt JOIN profiles pr ON pt.profile_id = pr.id WHERE pr.user_id = auth.uid() AND pt.status = 'accepted'
  )
  OR project_id IN (
    SELECT p.id FROM projects p WHERE p.cluster_id IS NOT NULL AND is_org_member(auth.uid(), p.cluster_id)
  )
);

CREATE POLICY "Project members can add links"
ON public.project_links FOR INSERT
WITH CHECK (
  added_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
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

CREATE POLICY "Authors and owners can delete links"
ON public.project_links FOR DELETE
USING (
  added_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR project_id IN (
    SELECT p.id FROM projects p JOIN profiles pr ON p.owner_id = pr.id WHERE pr.user_id = auth.uid()
  )
  OR project_id IN (
    SELECT p.id FROM projects p WHERE p.cluster_id IS NOT NULL AND has_org_role(auth.uid(), p.cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
  )
);

-- Comments on doc pages
CREATE TABLE public.project_doc_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_id UUID NOT NULL REFERENCES public.project_docs(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_doc_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view doc comments"
ON public.project_doc_comments FOR SELECT
USING (
  doc_id IN (
    SELECT pd.id FROM project_docs pd WHERE pd.project_id IN (
      SELECT p.id FROM projects p JOIN profiles pr ON p.owner_id = pr.id WHERE pr.user_id = auth.uid()
      UNION
      SELECT pt.project_id FROM project_teams pt JOIN profiles pr ON pt.profile_id = pr.id WHERE pr.user_id = auth.uid() AND pt.status = 'accepted'
    )
  )
  OR doc_id IN (
    SELECT pd.id FROM project_docs pd JOIN projects p ON pd.project_id = p.id WHERE p.cluster_id IS NOT NULL AND is_org_member(auth.uid(), p.cluster_id)
  )
);

CREATE POLICY "Project members can add doc comments"
ON public.project_doc_comments FOR INSERT
WITH CHECK (
  author_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  AND (
    doc_id IN (
      SELECT pd.id FROM project_docs pd WHERE pd.project_id IN (
        SELECT p.id FROM projects p JOIN profiles pr ON p.owner_id = pr.id WHERE pr.user_id = auth.uid()
        UNION
        SELECT pt.project_id FROM project_teams pt JOIN profiles pr ON pt.profile_id = pr.id WHERE pr.user_id = auth.uid() AND pt.status = 'accepted'
      )
    )
    OR doc_id IN (
      SELECT pd.id FROM project_docs pd JOIN projects p ON pd.project_id = p.id WHERE p.cluster_id IS NOT NULL AND is_org_member(auth.uid(), p.cluster_id)
    )
  )
);

CREATE POLICY "Authors can delete own doc comments"
ON public.project_doc_comments FOR DELETE
USING (author_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
