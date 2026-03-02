-- Add missing columns to stream_strategist_campaigns table
-- These columns were referenced in the schema but not included in the original migration

ALTER TABLE public.stream_strategist_campaigns 
ADD COLUMN IF NOT EXISTS daily_streams INTEGER DEFAULT 0;

ALTER TABLE public.stream_strategist_campaigns 
ADD COLUMN IF NOT EXISTS weekly_streams INTEGER DEFAULT 0;

-- Add radio and discover weekly columns from the original schema
ALTER TABLE public.stream_strategist_campaigns 
ADD COLUMN IF NOT EXISTS radio_streams INTEGER DEFAULT 0;

ALTER TABLE public.stream_strategist_campaigns 
ADD COLUMN IF NOT EXISTS discover_weekly_streams INTEGER DEFAULT 0;

ALTER TABLE public.stream_strategist_campaigns 
ADD COLUMN IF NOT EXISTS external_streaming_data JSONB DEFAULT '{}'::jsonb;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_stream_strategist_campaigns_daily_streams 
ON public.stream_strategist_campaigns(daily_streams);

CREATE INDEX IF NOT EXISTS idx_stream_strategist_campaigns_weekly_streams 
ON public.stream_strategist_campaigns(weekly_streams);
