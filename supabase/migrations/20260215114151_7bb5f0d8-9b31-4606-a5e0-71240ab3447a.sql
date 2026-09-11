
-- Add new compensation columns to deal_members
ALTER TABLE public.deal_members 
  ADD COLUMN monthly_amount numeric DEFAULT 0,
  ADD COLUMN equity_percentage numeric DEFAULT 0,
  ADD COLUMN is_finder_bonus boolean DEFAULT false,
  ADD COLUMN compensation_label text DEFAULT null;

-- Add org percentage and finder bonus to crm_deals
ALTER TABLE public.crm_deals
  ADD COLUMN org_percentage numeric DEFAULT 0,
  ADD COLUMN finder_bonus_percent numeric DEFAULT 15;
