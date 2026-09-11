
-- Allow org admins and owners to delete projects within their cluster
CREATE POLICY "Org admins can delete cluster projects"
ON public.projects
FOR DELETE
USING (
  cluster_id IS NOT NULL
  AND has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
);

-- Allow org admins to also manage (update) cluster projects
CREATE POLICY "Org admins can update cluster projects"
ON public.projects
FOR UPDATE
USING (
  cluster_id IS NOT NULL
  AND has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
);
