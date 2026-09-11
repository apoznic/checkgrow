DROP POLICY IF EXISTS "Authors can update own sticky notes" ON public.project_sticky_notes;
DROP POLICY IF EXISTS "Authors can delete own sticky notes" ON public.project_sticky_notes;

CREATE POLICY "Project members can update sticky notes"
ON public.project_sticky_notes
FOR UPDATE
USING (
  project_id IN (
    SELECT p.id FROM projects p JOIN profiles pr ON p.owner_id = pr.id WHERE pr.user_id = auth.uid()
    UNION
    SELECT pt.project_id FROM project_teams pt JOIN profiles pr ON pt.profile_id = pr.id
      WHERE pr.user_id = auth.uid() AND pt.status = 'accepted'
  )
  OR project_id IN (
    SELECT p.id FROM projects p WHERE p.cluster_id IS NOT NULL AND is_org_member(auth.uid(), p.cluster_id)
  )
);

CREATE POLICY "Project members can delete sticky notes"
ON public.project_sticky_notes
FOR DELETE
USING (
  project_id IN (
    SELECT p.id FROM projects p JOIN profiles pr ON p.owner_id = pr.id WHERE pr.user_id = auth.uid()
    UNION
    SELECT pt.project_id FROM project_teams pt JOIN profiles pr ON pt.profile_id = pr.id
      WHERE pr.user_id = auth.uid() AND pt.status = 'accepted'
  )
  OR project_id IN (
    SELECT p.id FROM projects p WHERE p.cluster_id IS NOT NULL AND is_org_member(auth.uid(), p.cluster_id)
  )
);