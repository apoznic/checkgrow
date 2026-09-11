-- Create project tasks table for milestone/task tracking
CREATE TABLE public.project_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project activities table for activity timeline
CREATE TABLE public.project_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_activities ENABLE ROW LEVEL SECURITY;

-- RLS for project_tasks - project participants can view and manage
CREATE POLICY "Project participants can view tasks"
ON public.project_tasks
FOR SELECT
USING (
  project_id IN (
    SELECT p.id FROM projects p
    JOIN profiles pr ON p.owner_id = pr.id
    WHERE pr.user_id = auth.uid()
    UNION
    SELECT pt.project_id FROM project_teams pt
    JOIN profiles pr ON pt.profile_id = pr.id
    WHERE pr.user_id = auth.uid() AND pt.status = 'accepted'
  )
);

CREATE POLICY "Project owners can manage tasks"
ON public.project_tasks
FOR ALL
USING (
  project_id IN (
    SELECT p.id FROM projects p
    JOIN profiles pr ON p.owner_id = pr.id
    WHERE pr.user_id = auth.uid()
  )
);

CREATE POLICY "Assigned members can update their tasks"
ON public.project_tasks
FOR UPDATE
USING (
  assigned_to IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

-- RLS for project_activities - project participants can view
CREATE POLICY "Project participants can view activities"
ON public.project_activities
FOR SELECT
USING (
  project_id IN (
    SELECT p.id FROM projects p
    JOIN profiles pr ON p.owner_id = pr.id
    WHERE pr.user_id = auth.uid()
    UNION
    SELECT pt.project_id FROM project_teams pt
    JOIN profiles pr ON pt.profile_id = pr.id
    WHERE pr.user_id = auth.uid() AND pt.status = 'accepted'
  )
);

CREATE POLICY "Project participants can create activities"
ON public.project_activities
FOR INSERT
WITH CHECK (
  actor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Add triggers for updated_at
CREATE TRIGGER update_project_tasks_updated_at
BEFORE UPDATE ON public.project_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for activities
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_activities;