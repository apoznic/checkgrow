-- Stripe Connect accounts for freelancers/service providers
CREATE TABLE public.stripe_connect_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_account_id text NOT NULL,
  onboarding_complete boolean NOT NULL DEFAULT false,
  charges_enabled boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id)
);

-- Organization platform fee settings
ALTER TABLE public.clusters ADD COLUMN IF NOT EXISTS platform_fee_percent numeric NOT NULL DEFAULT 10;

-- Billable tasks (tasks with a fixed price attached)
CREATE TABLE public.billable_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  fixed_price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'eur',
  status text NOT NULL DEFAULT 'open',
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  assigned_to uuid REFERENCES public.profiles(id),
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  paid_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  platform_fee_percent numeric,
  platform_fee_amount numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Task ratings (5-star system)
CREATE TABLE public.task_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billable_task_id uuid NOT NULL REFERENCES public.billable_tasks(id) ON DELETE CASCADE,
  rated_by uuid NOT NULL REFERENCES public.profiles(id),
  rated_profile_id uuid NOT NULL REFERENCES public.profiles(id),
  rating integer NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(billable_task_id, rated_by)
);

-- Validation trigger for rating range
CREATE OR REPLACE FUNCTION public.validate_rating()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_task_rating
  BEFORE INSERT OR UPDATE ON public.task_ratings
  FOR EACH ROW EXECUTE FUNCTION validate_rating();

-- RLS policies
ALTER TABLE public.stripe_connect_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billable_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_ratings ENABLE ROW LEVEL SECURITY;

-- Stripe Connect: users manage own
CREATE POLICY "Users can view own stripe account" ON public.stripe_connect_accounts
  FOR SELECT USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own stripe account" ON public.stripe_connect_accounts
  FOR INSERT WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own stripe account" ON public.stripe_connect_accounts
  FOR UPDATE USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Billable tasks: project members can view, creator can manage
CREATE POLICY "Project members can view billable tasks" ON public.billable_tasks
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p JOIN profiles pr ON p.owner_id = pr.id WHERE pr.user_id = auth.uid()
      UNION
      SELECT pt.project_id FROM project_teams pt JOIN profiles pr ON pt.profile_id = pr.id WHERE pr.user_id = auth.uid() AND pt.status = 'accepted'
    )
    OR project_id IN (
      SELECT p.id FROM projects p WHERE p.cluster_id IS NOT NULL AND is_org_member(auth.uid(), p.cluster_id)
    )
  );

CREATE POLICY "Task creators can create billable tasks" ON public.billable_tasks
  FOR INSERT WITH CHECK (
    created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Task creators can update billable tasks" ON public.billable_tasks
  FOR UPDATE USING (
    created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR assigned_to IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Task creators can delete billable tasks" ON public.billable_tasks
  FOR DELETE USING (
    created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Ratings: participants can view and create
CREATE POLICY "Project members can view ratings" ON public.task_ratings
  FOR SELECT USING (
    billable_task_id IN (SELECT id FROM billable_tasks WHERE project_id IN (
      SELECT p.id FROM projects p JOIN profiles pr ON p.owner_id = pr.id WHERE pr.user_id = auth.uid()
      UNION
      SELECT pt.project_id FROM project_teams pt JOIN profiles pr ON pt.profile_id = pr.id WHERE pr.user_id = auth.uid() AND pt.status = 'accepted'
    ))
  );

CREATE POLICY "Users can create ratings" ON public.task_ratings
  FOR INSERT WITH CHECK (
    rated_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Update triggers
CREATE TRIGGER update_billable_tasks_updated_at
  BEFORE UPDATE ON public.billable_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_connect_updated_at
  BEFORE UPDATE ON public.stripe_connect_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();