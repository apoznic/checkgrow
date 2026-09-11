-- Allow users to insert their own admin role when creating an organization
CREATE POLICY "Users can add themselves as admin when creating org"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND role = 'admin'
  AND cluster_id IS NOT NULL
);