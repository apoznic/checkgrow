-- Allow users to delete their own enrollment (leave organization)
CREATE POLICY "Users can delete their own enrollments"
ON public.cluster_enrollments
FOR DELETE
USING (profile_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));