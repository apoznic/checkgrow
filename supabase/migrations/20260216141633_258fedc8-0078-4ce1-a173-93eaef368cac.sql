
-- Project wiki/docs pages
CREATE TABLE public.project_docs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id),
  title text NOT NULL,
  content text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Images/attachments per doc page
CREATE TABLE public.project_doc_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_id uuid NOT NULL REFERENCES public.project_docs(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_doc_images ENABLE ROW LEVEL SECURITY;

-- Project members can view docs (owner + accepted team members + org members if cluster project)
CREATE POLICY "Project members can view docs"
ON public.project_docs FOR SELECT
USING (
  (project_id IN (
    SELECT p.id FROM projects p JOIN profiles pr ON p.owner_id = pr.id WHERE pr.user_id = auth.uid()
    UNION
    SELECT pt.project_id FROM project_teams pt JOIN profiles pr ON pt.profile_id = pr.id WHERE pr.user_id = auth.uid() AND pt.status = 'accepted'
  ))
  OR
  (project_id IN (
    SELECT p.id FROM projects p WHERE p.cluster_id IS NOT NULL AND is_org_member(auth.uid(), p.cluster_id)
  ))
);

-- Project members can create docs
CREATE POLICY "Project members can create docs"
ON public.project_docs FOR INSERT
WITH CHECK (
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

-- Project members can update docs
CREATE POLICY "Project members can update docs"
ON public.project_docs FOR UPDATE
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

-- Owner and org admins can delete docs
CREATE POLICY "Owners and admins can delete docs"
ON public.project_docs FOR DELETE
USING (
  (author_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  OR (project_id IN (
    SELECT p.id FROM projects p JOIN profiles pr ON p.owner_id = pr.id WHERE pr.user_id = auth.uid()
  ))
  OR (project_id IN (
    SELECT p.id FROM projects p WHERE p.cluster_id IS NOT NULL AND has_org_role(auth.uid(), p.cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
  ))
);

-- Doc images: same access as parent doc
CREATE POLICY "Members can view doc images"
ON public.project_doc_images FOR SELECT
USING (
  doc_id IN (SELECT id FROM project_docs)
);

CREATE POLICY "Members can add doc images"
ON public.project_doc_images FOR INSERT
WITH CHECK (
  doc_id IN (SELECT id FROM project_docs)
);

CREATE POLICY "Members can delete doc images"
ON public.project_doc_images FOR DELETE
USING (
  doc_id IN (SELECT id FROM project_docs)
);

-- Updated_at trigger
CREATE TRIGGER update_project_docs_updated_at
BEFORE UPDATE ON public.project_docs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
