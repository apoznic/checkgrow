CREATE POLICY "Users can leave accepted project memberships"
ON public.project_teams
FOR DELETE
TO public
USING (
  profile_id IN (
    SELECT p.id
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
  )
  AND status = 'accepted'
  AND EXISTS (
    SELECT 1
    FROM public.projects proj
    WHERE proj.id = project_teams.project_id
      AND proj.owner_id <> project_teams.profile_id
  )
);