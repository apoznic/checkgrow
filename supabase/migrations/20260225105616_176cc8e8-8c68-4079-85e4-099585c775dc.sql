CREATE POLICY "Users can withdraw own applications"
ON public.project_teams
FOR DELETE
USING (
  profile_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid())
  AND status = 'applied'
);