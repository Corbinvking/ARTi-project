-- Add columns for storing scraped Spotify for Artists data
-- These columns track 24h and 7d stream data from playlists

-- Add columns to spotify_campaigns table
ALTER TABLE spotify_campaigns 
ADD COLUMN IF NOT EXISTS streams_24h INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS streams_7d INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS playlists_24h_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS playlists_7d_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scrape_data JSONB;

-- Add comments
COMMENT ON COLUMN spotify_campaigns.streams_24h IS 'Total streams from all playlists in last 24 hours (from S4A scraper)';
COMMENT ON COLUMN spotify_campaigns.streams_7d IS 'Total streams from all playlists in last 7 days (from S4A scraper)';
COMMENT ON COLUMN spotify_campaigns.playlists_24h_count IS 'Number of playlists with streams in last 24 hours';
COMMENT ON COLUMN spotify_campaigns.playlists_7d_count IS 'Number of playlists with streams in last 7 days';
COMMENT ON COLUMN spotify_campaigns.last_scraped_at IS 'Last time this campaign was scraped by S4A scraper';
COMMENT ON COLUMN spotify_campaigns.scrape_data IS 'Full JSON data from last scrape (for debugging/reference)';

-- Create index for querying recently scraped campaigns
CREATE INDEX IF NOT EXISTS idx_spotify_campaigns_last_scraped 
ON spotify_campaigns(last_scraped_at DESC NULLS LAST);

-- Create index for querying campaigns with SFA links
CREATE INDEX IF NOT EXISTS idx_spotify_campaigns_sfa 
ON spotify_campaigns(sfa) WHERE sfa IS NOT NULL;

