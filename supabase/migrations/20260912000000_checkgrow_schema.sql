-- CheckGrow schema: organizations, members, tasks, sales leads, private workspace,
-- registries, newsletters, announcements, notifications.
-- Curated from the Kolektiv.io history; only what the CheckGrow app uses.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE public.app_role AS ENUM ('admin', 'member');
CREATE TYPE public.enrollment_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'project_manager', 'participant', 'member');
CREATE TYPE public.contact_type AS ENUM ('lead', 'prospect', 'client', 'partner', 'vendor', 'other');
CREATE TYPE public.deal_stage AS ENUM ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'archived');

-- ---------------------------------------------------------------------------
-- Core: profiles, organizations, membership
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  portfolio_url TEXT,
  linkedin_url TEXT,
  city TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_available BOOLEAN DEFAULT true,
  availability_note TEXT,
  user_type TEXT NOT NULL DEFAULT 'member',
  onboarding_completed BOOLEAN DEFAULT false,
  project_types TEXT[],
  work_experience TEXT,
  years_total_experience INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  city TEXT,
  country TEXT,
  address TEXT,
  category TEXT,
  platform_fee_percent NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'member',
  cluster_id UUID REFERENCES public.clusters(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, cluster_id)
);

CREATE TABLE public.cluster_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  status public.enrollment_status NOT NULL DEFAULT 'pending',
  role public.org_role NOT NULL DEFAULT 'member',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT cluster_enrollments_profile_cluster_unique UNIQUE (profile_id, cluster_id)
);
CREATE INDEX idx_cluster_enrollments_cluster ON public.cluster_enrollments(cluster_id);
CREATE INDEX idx_cluster_enrollments_profile ON public.cluster_enrollments(profile_id);

CREATE TABLE public.cluster_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cluster_invitations_cluster ON public.cluster_invitations(cluster_id);

CREATE TABLE public.cluster_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  config JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (cluster_id, service_name)
);

CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cluster_id, role, permission_key)
);

CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  skill_level TEXT DEFAULT 'intermediate' CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  years_experience INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_skills_profile ON public.skills(profile_id);

-- ---------------------------------------------------------------------------
-- Sales leads (CRM)
-- ---------------------------------------------------------------------------
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
  lead_status TEXT,
  last_contacted_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,
  source TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_contacts_cluster ON public.crm_contacts(cluster_id);

CREATE TABLE public.crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  value NUMERIC,
  currency TEXT DEFAULT 'EUR',
  stage public.deal_stage NOT NULL DEFAULT 'lead',
  probability INTEGER DEFAULT 20,
  expected_close_date DATE,
  approval_status TEXT NOT NULL DEFAULT 'approved',
  archived_from TEXT,
  project_id UUID,
  finder_bonus_percent NUMERIC,
  org_equity NUMERIC,
  org_percentage NUMERIC,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_deals_cluster ON public.crm_deals(cluster_id);
CREATE INDEX idx_crm_deals_stage ON public.crm_deals(cluster_id, stage);

CREATE TABLE public.deal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_deal_comments_deal ON public.deal_comments(deal_id);

CREATE TABLE public.deal_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  compensation_type TEXT NOT NULL DEFAULT 'fixed',
  compensation_value NUMERIC NOT NULL DEFAULT 0,
  compensation_label TEXT,
  equity_percentage NUMERIC,
  monthly_amount NUMERIC,
  one_time_commission NUMERIC,
  is_finder_bonus BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (deal_id, profile_id)
);

CREATE TABLE public.crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT,
  activity_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_activities_cluster ON public.crm_activities(cluster_id);

-- Tasks assigned to members (Members board, My Life "assigned to me by the team")
CREATE TABLE public.crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date TIMESTAMPTZ,
  estimated_hours NUMERIC,
  actual_hours NUMERIC,
  notes TEXT,
  brief TEXT,
  brief_generated_at TIMESTAMPTZ,
  assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_tasks_cluster ON public.crm_tasks(cluster_id);
CREATE INDEX idx_crm_tasks_assigned ON public.crm_tasks(assigned_to, status);

-- ---------------------------------------------------------------------------
-- My Life: private tasks, links, meetings
-- ---------------------------------------------------------------------------
CREATE TABLE public.private_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date DATE,
  position INTEGER NOT NULL DEFAULT 0,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_private_tasks_profile ON public.private_tasks(profile_id);

CREATE TABLE public.private_link_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.private_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.private_link_groups(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_private_links_profile ON public.private_links(profile_id);

CREATE TABLE public.private_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  meeting_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  attendees TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_private_meetings_profile ON public.private_meetings(profile_id);

-- ---------------------------------------------------------------------------
-- Registry (spreadsheet-style lists)
-- ---------------------------------------------------------------------------
CREATE TABLE public.org_registries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  webhook_enabled BOOLEAN NOT NULL DEFAULT false,
  webhook_token TEXT,
  webhook_last_received_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_org_registries_cluster ON public.org_registries(cluster_id);
CREATE UNIQUE INDEX idx_org_registries_webhook_token ON public.org_registries(webhook_token) WHERE webhook_token IS NOT NULL;

CREATE TABLE public.org_registry_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_id UUID NOT NULL REFERENCES public.org_registries(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  options JSONB,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (registry_id, key)
);

CREATE TABLE public.org_registry_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_id UUID NOT NULL REFERENCES public.org_registries(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  position INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_org_registry_rows_registry ON public.org_registry_rows(registry_id, position);

-- ---------------------------------------------------------------------------
-- Newsletter (Resend audiences) and announcements
-- ---------------------------------------------------------------------------
CREATE TABLE public.newsletter_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.newsletter_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  audience_id TEXT,
  email TEXT NOT NULL,
  full_name TEXT,
  group_ids UUID[] NOT NULL DEFAULT '{}',
  resend_contact_id TEXT,
  unsubscribed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_newsletter_contacts_cluster ON public.newsletter_contacts(cluster_id, audience_id);

CREATE TABLE public.newsletter_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  audience_id TEXT,
  group_id UUID REFERENCES public.newsletter_groups(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  recipients_count INTEGER NOT NULL DEFAULT 0,
  sent_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.org_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  link_type TEXT,
  link_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_id, is_read);

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _cluster_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cluster_enrollments ce
    JOIN public.profiles p ON ce.profile_id = p.id
    WHERE p.user_id = _user_id AND ce.cluster_id = _cluster_id AND ce.status = 'approved'
  )
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_user_id UUID, _cluster_id UUID, _roles public.org_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cluster_enrollments ce
    JOIN public.profiles p ON ce.profile_id = p.id
    WHERE p.user_id = _user_id AND ce.cluster_id = _cluster_id
      AND ce.status = 'approved' AND ce.role = ANY(_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_manager(_cluster_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_org_role(auth.uid(), _cluster_id, ARRAY['owner', 'admin']::public.org_role[])
$$;

CREATE OR REPLACE FUNCTION public.deal_cluster(_deal_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cluster_id FROM public.crm_deals WHERE id = _deal_id
$$;

CREATE OR REPLACE FUNCTION public.registry_cluster(_registry_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cluster_id FROM public.org_registries WHERE id = _registry_id
$$;

-- updated_at triggers
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles', 'clusters', 'cluster_integrations', 'role_permissions', 'crm_contacts', 'crm_deals',
    'deal_members', 'private_tasks', 'private_link_groups', 'private_meetings', 'org_registries',
    'org_registry_rows', 'newsletter_contacts', 'org_announcements'
  ] LOOP
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles', 'clusters', 'user_roles', 'cluster_enrollments', 'cluster_invitations', 'cluster_integrations',
    'role_permissions', 'skills', 'crm_contacts', 'crm_deals', 'deal_comments', 'deal_members', 'crm_activities',
    'crm_tasks', 'private_tasks', 'private_link_groups', 'private_links', 'private_meetings', 'org_registries',
    'org_registry_columns', 'org_registry_rows', 'newsletter_groups', 'newsletter_contacts', 'newsletter_campaigns',
    'org_announcements', 'notifications'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- profiles
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE TO authenticated USING (user_id = auth.uid());

-- clusters
CREATE POLICY "clusters_select" ON public.clusters FOR SELECT TO authenticated USING (true);
CREATE POLICY "clusters_insert" ON public.clusters FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "clusters_update_managers" ON public.clusters FOR UPDATE TO authenticated USING (public.is_org_manager(id));
CREATE POLICY "clusters_delete_owner" ON public.clusters FOR DELETE TO authenticated
  USING (public.has_org_role(auth.uid(), id, ARRAY['owner']::public.org_role[]));

-- user_roles
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_roles_insert_own_admin" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND role = 'admin' AND cluster_id IS NOT NULL);
CREATE POLICY "user_roles_delete_own" ON public.user_roles FOR DELETE TO authenticated USING (user_id = auth.uid());

-- cluster_enrollments
CREATE POLICY "enrollments_select" ON public.cluster_enrollments FOR SELECT TO authenticated
  USING (profile_id = public.current_profile_id() OR public.is_org_member(auth.uid(), cluster_id));
CREATE POLICY "enrollments_insert_own" ON public.cluster_enrollments FOR INSERT TO authenticated
  WITH CHECK (profile_id = public.current_profile_id());
CREATE POLICY "enrollments_update_managers" ON public.cluster_enrollments FOR UPDATE TO authenticated
  USING (public.is_org_manager(cluster_id));
CREATE POLICY "enrollments_delete" ON public.cluster_enrollments FOR DELETE TO authenticated
  USING (profile_id = public.current_profile_id() OR public.is_org_manager(cluster_id));

-- cluster_invitations
CREATE POLICY "invitations_select" ON public.cluster_invitations FOR SELECT TO authenticated
  USING (public.is_org_manager(cluster_id) OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
CREATE POLICY "invitations_manage" ON public.cluster_invitations FOR ALL TO authenticated
  USING (public.is_org_manager(cluster_id)) WITH CHECK (public.is_org_manager(cluster_id));

-- cluster_integrations (keys are encrypted; only managers may read or write)
CREATE POLICY "integrations_manage" ON public.cluster_integrations FOR ALL TO authenticated
  USING (public.is_org_manager(cluster_id)) WITH CHECK (public.is_org_manager(cluster_id));

-- role_permissions
CREATE POLICY "role_permissions_select" ON public.role_permissions FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), cluster_id));
CREATE POLICY "role_permissions_manage" ON public.role_permissions FOR ALL TO authenticated
  USING (public.has_org_role(auth.uid(), cluster_id, ARRAY['owner']::public.org_role[]))
  WITH CHECK (public.has_org_role(auth.uid(), cluster_id, ARRAY['owner']::public.org_role[]));

-- skills
CREATE POLICY "skills_select" ON public.skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "skills_manage_own" ON public.skills FOR ALL TO authenticated
  USING (profile_id = public.current_profile_id()) WITH CHECK (profile_id = public.current_profile_id());

-- CRM tables scoped by cluster: members read and write, managers or creators delete
CREATE POLICY "crm_contacts_select" ON public.crm_contacts FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), cluster_id));
CREATE POLICY "crm_contacts_insert" ON public.crm_contacts FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), cluster_id));
CREATE POLICY "crm_contacts_update" ON public.crm_contacts FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), cluster_id));
CREATE POLICY "crm_contacts_delete" ON public.crm_contacts FOR DELETE TO authenticated
  USING (public.is_org_manager(cluster_id) OR created_by = public.current_profile_id());

CREATE POLICY "crm_deals_select" ON public.crm_deals FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), cluster_id));
CREATE POLICY "crm_deals_insert" ON public.crm_deals FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), cluster_id));
CREATE POLICY "crm_deals_update" ON public.crm_deals FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), cluster_id));
CREATE POLICY "crm_deals_delete" ON public.crm_deals FOR DELETE TO authenticated
  USING (public.is_org_manager(cluster_id) OR created_by = public.current_profile_id());

CREATE POLICY "deal_comments_select" ON public.deal_comments FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), public.deal_cluster(deal_id)));
CREATE POLICY "deal_comments_insert" ON public.deal_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = public.current_profile_id() AND public.is_org_member(auth.uid(), public.deal_cluster(deal_id)));
CREATE POLICY "deal_comments_delete" ON public.deal_comments FOR DELETE TO authenticated
  USING (author_id = public.current_profile_id() OR public.is_org_manager(public.deal_cluster(deal_id)));

CREATE POLICY "deal_members_select" ON public.deal_members FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), public.deal_cluster(deal_id)));
CREATE POLICY "deal_members_manage" ON public.deal_members FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), public.deal_cluster(deal_id)))
  WITH CHECK (public.is_org_member(auth.uid(), public.deal_cluster(deal_id)));

CREATE POLICY "crm_activities_select" ON public.crm_activities FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), cluster_id));
CREATE POLICY "crm_activities_insert" ON public.crm_activities FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), cluster_id));
CREATE POLICY "crm_activities_delete" ON public.crm_activities FOR DELETE TO authenticated
  USING (public.is_org_manager(cluster_id) OR created_by = public.current_profile_id());

CREATE POLICY "crm_tasks_select" ON public.crm_tasks FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), cluster_id));
CREATE POLICY "crm_tasks_insert" ON public.crm_tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), cluster_id) AND created_by = public.current_profile_id());
CREATE POLICY "crm_tasks_update" ON public.crm_tasks FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), cluster_id));
CREATE POLICY "crm_tasks_delete" ON public.crm_tasks FOR DELETE TO authenticated
  USING (public.is_org_manager(cluster_id) OR created_by = public.current_profile_id() OR assigned_to = public.current_profile_id());

-- My Life: strictly private
CREATE POLICY "private_tasks_own" ON public.private_tasks FOR ALL TO authenticated
  USING (profile_id = public.current_profile_id()) WITH CHECK (profile_id = public.current_profile_id());
CREATE POLICY "private_link_groups_own" ON public.private_link_groups FOR ALL TO authenticated
  USING (profile_id = public.current_profile_id()) WITH CHECK (profile_id = public.current_profile_id());
CREATE POLICY "private_links_own" ON public.private_links FOR ALL TO authenticated
  USING (profile_id = public.current_profile_id()) WITH CHECK (profile_id = public.current_profile_id());
CREATE POLICY "private_meetings_own" ON public.private_meetings FOR ALL TO authenticated
  USING (profile_id = public.current_profile_id()) WITH CHECK (profile_id = public.current_profile_id());

-- Registry: members read; managers manage lists and columns; members edit rows
CREATE POLICY "registries_select" ON public.org_registries FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), cluster_id));
CREATE POLICY "registries_manage" ON public.org_registries FOR ALL TO authenticated
  USING (public.is_org_manager(cluster_id)) WITH CHECK (public.is_org_manager(cluster_id));
CREATE POLICY "registry_columns_select" ON public.org_registry_columns FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), public.registry_cluster(registry_id)));
CREATE POLICY "registry_columns_manage" ON public.org_registry_columns FOR ALL TO authenticated
  USING (public.is_org_manager(public.registry_cluster(registry_id)))
  WITH CHECK (public.is_org_manager(public.registry_cluster(registry_id)));
CREATE POLICY "registry_rows_select" ON public.org_registry_rows FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), public.registry_cluster(registry_id)));
CREATE POLICY "registry_rows_write" ON public.org_registry_rows FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), public.registry_cluster(registry_id)));
CREATE POLICY "registry_rows_update" ON public.org_registry_rows FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), public.registry_cluster(registry_id)));
CREATE POLICY "registry_rows_delete" ON public.org_registry_rows FOR DELETE TO authenticated
  USING (public.is_org_manager(public.registry_cluster(registry_id)));

-- Newsletter: managers only
CREATE POLICY "newsletter_groups_manage" ON public.newsletter_groups FOR ALL TO authenticated
  USING (public.is_org_manager(cluster_id)) WITH CHECK (public.is_org_manager(cluster_id));
CREATE POLICY "newsletter_contacts_manage" ON public.newsletter_contacts FOR ALL TO authenticated
  USING (public.is_org_manager(cluster_id)) WITH CHECK (public.is_org_manager(cluster_id));
CREATE POLICY "newsletter_campaigns_manage" ON public.newsletter_campaigns FOR ALL TO authenticated
  USING (public.is_org_manager(cluster_id)) WITH CHECK (public.is_org_manager(cluster_id));

-- Announcements
CREATE POLICY "announcements_select" ON public.org_announcements FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), cluster_id));
CREATE POLICY "announcements_manage" ON public.org_announcements FOR ALL TO authenticated
  USING (public.is_org_manager(cluster_id)) WITH CHECK (public.is_org_manager(cluster_id));

-- Notifications
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT TO authenticated USING (recipient_id = public.current_profile_id());
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (sender_id = public.current_profile_id() AND public.is_org_member(auth.uid(), cluster_id));
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated USING (recipient_id = public.current_profile_id());
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE TO authenticated USING (recipient_id = public.current_profile_id());

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.crm_tasks, public.crm_deals, public.crm_contacts, public.crm_activities,
  public.deal_members, public.notifications, public.org_announcements;

-- ---------------------------------------------------------------------------
-- Storage: avatars
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
