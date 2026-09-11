-- Allow any authenticated user to create a new cluster/organization
CREATE POLICY "Authenticated users can create clusters"
ON public.clusters
FOR INSERT
TO authenticated
WITH CHECK (true);