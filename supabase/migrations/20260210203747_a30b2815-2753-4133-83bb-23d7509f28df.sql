-- Update any deals currently in 'qualified' or 'proposal' stages to 'negotiation'
UPDATE public.crm_deals SET stage = 'negotiation' WHERE stage IN ('qualified', 'proposal');

-- We can't easily remove enum values in Postgres, so we'll leave the enum as-is
-- but the UI will only show lead, negotiation, won, lost
