
-- Create shared calendar events table
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  all_day BOOLEAN NOT NULL DEFAULT false,
  color TEXT DEFAULT 'blue',
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  assigned_to UUID REFERENCES public.profiles(id),
  task_id UUID REFERENCES public.crm_tasks(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Org members can view events
CREATE POLICY "Org members can view calendar events"
ON public.calendar_events FOR SELECT
USING (is_org_member(auth.uid(), cluster_id) OR is_cluster_admin(auth.uid(), cluster_id));

-- Org members can create events
CREATE POLICY "Org members can create calendar events"
ON public.calendar_events FOR INSERT
WITH CHECK (is_org_member(auth.uid(), cluster_id) OR is_cluster_admin(auth.uid(), cluster_id));

-- Creators and admins can update events
CREATE POLICY "Creators and admins can update calendar events"
ON public.calendar_events FOR UPDATE
USING (
  created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
);

-- Creators and admins can delete events
CREATE POLICY "Creators and admins can delete calendar events"
ON public.calendar_events FOR DELETE
USING (
  created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
);

-- Timestamp trigger
CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
