-- Create CRM contact type enum
CREATE TYPE public.contact_type AS ENUM ('lead', 'prospect', 'client', 'partner', 'vendor', 'other');

-- Create deal stage enum
CREATE TYPE public.deal_stage AS ENUM ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost');

-- CRM Contacts table
CREATE TABLE public.crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  position TEXT,
  contact_type public.contact_type NOT NULL DEFAULT 'lead',
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  assigned_to UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CRM Deals table
CREATE TABLE public.crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  value DECIMAL(12,2),
  currency TEXT DEFAULT 'USD',
  stage public.deal_stage NOT NULL DEFAULT 'lead',
  probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  assigned_to UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- CRM Activities (communication history)
CREATE TABLE public.crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'email', 'call', 'meeting', 'note'
  subject TEXT NOT NULL,
  content TEXT,
  activity_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CRM Tasks (follow-up reminders)
CREATE TABLE public.crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  assigned_to UUID NOT NULL REFERENCES public.profiles(id),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS on all CRM tables
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;

-- Enable realtime for CRM tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_deals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_tasks;

-- RLS Policies for crm_contacts
CREATE POLICY "Org members can view contacts"
ON public.crm_contacts FOR SELECT
USING (is_org_member(auth.uid(), cluster_id));

CREATE POLICY "PMs and above can create contacts"
ON public.crm_contacts FOR INSERT
WITH CHECK (has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role, 'project_manager'::org_role]));

CREATE POLICY "PMs and above can update contacts"
ON public.crm_contacts FOR UPDATE
USING (has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role, 'project_manager'::org_role]));

CREATE POLICY "Admins can delete contacts"
ON public.crm_contacts FOR DELETE
USING (has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role]));

-- RLS Policies for crm_deals
CREATE POLICY "Org members can view deals"
ON public.crm_deals FOR SELECT
USING (is_org_member(auth.uid(), cluster_id));

CREATE POLICY "PMs and above can create deals"
ON public.crm_deals FOR INSERT
WITH CHECK (has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role, 'project_manager'::org_role]));

CREATE POLICY "PMs and above can update deals"
ON public.crm_deals FOR UPDATE
USING (has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role, 'project_manager'::org_role]));

CREATE POLICY "Admins can delete deals"
ON public.crm_deals FOR DELETE
USING (has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role]));

-- RLS Policies for crm_activities
CREATE POLICY "Org members can view activities"
ON public.crm_activities FOR SELECT
USING (is_org_member(auth.uid(), cluster_id));

CREATE POLICY "Org members can create activities"
ON public.crm_activities FOR INSERT
WITH CHECK (is_org_member(auth.uid(), cluster_id));

CREATE POLICY "Admins can delete activities"
ON public.crm_activities FOR DELETE
USING (has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role]));

-- RLS Policies for crm_tasks
CREATE POLICY "Org members can view tasks"
ON public.crm_tasks FOR SELECT
USING (is_org_member(auth.uid(), cluster_id));

CREATE POLICY "Org members can create tasks"
ON public.crm_tasks FOR INSERT
WITH CHECK (is_org_member(auth.uid(), cluster_id));

CREATE POLICY "Assigned users and creators can update tasks"
ON public.crm_tasks FOR UPDATE
USING (
  assigned_to IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role])
);

CREATE POLICY "Admins can delete tasks"
ON public.crm_tasks FOR DELETE
USING (has_org_role(auth.uid(), cluster_id, ARRAY['owner'::org_role, 'admin'::org_role]));

-- Add updated_at triggers
CREATE TRIGGER update_crm_contacts_updated_at
  BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_deals_updated_at
  BEFORE UPDATE ON public.crm_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();