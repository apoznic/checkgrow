
-- Character traits table for profiling
CREATE TABLE public.profile_traits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trait_name text NOT NULL,
  trait_category text NOT NULL,
  confidence text NOT NULL DEFAULT 'inferred',
  confirmed boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'skill_mapper',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, trait_name)
);

ALTER TABLE public.profile_traits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own traits"
  ON public.profile_traits FOR SELECT TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own traits"
  ON public.profile_traits FOR INSERT TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own traits"
  ON public.profile_traits FOR UPDATE TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own traits"
  ON public.profile_traits FOR DELETE TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Service role needs access for edge functions
CREATE POLICY "Service role full access to traits"
  ON public.profile_traits FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Allow other authenticated users to read traits (for matchmaking)
CREATE POLICY "Authenticated users can view all traits"
  ON public.profile_traits FOR SELECT TO authenticated
  USING (true);
