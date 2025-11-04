-- Create campaigns view to map Stream Strategist frontend expectations
-- The Stream Strategist frontend expects a 'campaigns' table, but we have 'stream_strategist_campaigns'
-- This view provides the necessary mapping

-- Drop existing campaigns view or table if it exists
DROP VIEW IF EXISTS public.campaigns CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;

-- Create view that maps campaigns to stream_strategist_campaigns
CREATE VIEW public.campaigns AS 
SELECT * FROM public.stream_strategist_campaigns;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO service_role;

-- Create RLS policies for the view (inherits from underlying table)
-- Note: RLS policies on the underlying stream_strategist_campaigns table will apply
