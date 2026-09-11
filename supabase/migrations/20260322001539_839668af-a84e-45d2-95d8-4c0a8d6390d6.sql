
-- Connect requests table
CREATE TABLE public.connect_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE(sender_profile_id, receiver_profile_id)
);

ALTER TABLE public.connect_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connect requests"
  ON public.connect_requests FOR SELECT TO authenticated
  USING (
    sender_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR receiver_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create connect requests"
  ON public.connect_requests FOR INSERT TO authenticated
  WITH CHECK (
    sender_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Receivers can update connect requests"
  ON public.connect_requests FOR UPDATE TO authenticated
  USING (
    receiver_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own sent requests"
  ON public.connect_requests FOR DELETE TO authenticated
  USING (
    sender_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Direct message threads
CREATE TABLE public.dm_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_2 uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(participant_1, participant_2)
);

ALTER TABLE public.dm_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view own threads"
  ON public.dm_threads FOR SELECT TO authenticated
  USING (
    participant_1 IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR participant_2 IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated users can create threads"
  ON public.dm_threads FOR INSERT TO authenticated
  WITH CHECK (
    participant_1 IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR participant_2 IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Direct messages
CREATE TABLE public.dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.dm_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_read boolean NOT NULL DEFAULT false
);

ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Thread participants can view messages"
  ON public.dm_messages FOR SELECT TO authenticated
  USING (
    thread_id IN (
      SELECT id FROM dm_threads
      WHERE participant_1 IN (SELECT id FROM profiles WHERE user_id = auth.uid())
         OR participant_2 IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Thread participants can send messages"
  ON public.dm_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND thread_id IN (
      SELECT id FROM dm_threads
      WHERE participant_1 IN (SELECT id FROM profiles WHERE user_id = auth.uid())
         OR participant_2 IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update own messages read status"
  ON public.dm_messages FOR UPDATE TO authenticated
  USING (
    thread_id IN (
      SELECT id FROM dm_threads
      WHERE participant_1 IN (SELECT id FROM profiles WHERE user_id = auth.uid())
         OR participant_2 IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_threads;
