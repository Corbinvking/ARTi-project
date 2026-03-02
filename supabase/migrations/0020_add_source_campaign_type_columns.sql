-- Add source and campaign_type columns to spotify_campaigns table
-- These columns are used by the Stream Strategist frontend for filtering

ALTER TABLE public.spotify_campaigns 
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'airtable_import',
  ADD COLUMN IF NOT EXISTS campaign_type text DEFAULT 'spotify_promotion';

-- Update existing records to have the correct source/type for Stream Strategist
UPDATE public.spotify_campaigns 
SET 
  source = 'artist_influence_spotify_campaigns',
  campaign_type = 'artist_influence_spotify_promotion'
WHERE source = 'airtable_import' OR source IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_spotify_campaigns_source ON public.spotify_campaigns(source);
CREATE INDEX IF NOT EXISTS idx_spotify_campaigns_campaign_type ON public.spotify_campaigns(campaign_type);

-- Add comment
COMMENT ON COLUMN public.spotify_campaigns.source IS 'Source of the campaign data (e.g., airtable_import, campaign_intake, artist_influence_spotify_campaigns)';
COMMENT ON COLUMN public.spotify_campaigns.campaign_type IS 'Type of campaign (e.g., spotify_promotion, artist_influence_spotify_promotion)';

