-- Refresh campaigns view to pick up new columns added in migration 018
-- This fixes the "Could not find the 'daily_streams' column" error

-- Drop the existing view
DROP VIEW IF EXISTS public.campaigns CASCADE;

-- Recreate the view to pick up all new columns from stream_strategist_campaigns
CREATE VIEW public.campaigns AS 
SELECT * FROM public.stream_strategist_campaigns;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO service_role;

-- RLS policies inherited from underlying stream_strategist_campaigns table

