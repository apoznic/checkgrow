CREATE POLICY "Users can view tasks assigned to them"
  ON public.project_tasks
  FOR SELECT
  USING (
    assigned_to IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view projects where they have assigned tasks"
  ON public.projects
  FOR SELECT
  USING (
    id IN (
      SELECT pt.project_id FROM public.project_tasks pt
      JOIN public.profiles p ON pt.assigned_to = p.id
      WHERE p.user_id = auth.uid()
    )
  );