
-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL DEFAULT 'mention',
  title TEXT NOT NULL,
  content TEXT,
  link_type TEXT,
  link_id TEXT,
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (recipient_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));

-- Users can update (mark as read) own notifications
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (recipient_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));

-- Users can delete own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (recipient_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));

-- Org members can create notifications for others in same cluster
CREATE POLICY "Org members can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (
  sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  AND (is_org_member(auth.uid(), cluster_id) OR is_cluster_admin(auth.uid(), cluster_id))
);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Index for fast lookups
CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_id, is_read, created_at DESC);
