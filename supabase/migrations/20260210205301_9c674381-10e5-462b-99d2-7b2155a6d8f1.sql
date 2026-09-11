-- Allow same member multiple times on a deal (e.g. percentage + fixed entries)
ALTER TABLE public.deal_members DROP CONSTRAINT deal_members_deal_id_profile_id_key;

-- Enable realtime for deal_members
ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_members;
