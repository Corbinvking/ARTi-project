-- Migration: Update Spotify campaign columns for 24h, 7d, 28d data
-- Date: 2025-11-22
-- Purpose: Store streams and playlist counts for 24h, 7d, and 28d time ranges

-- Add new columns for time-range specific data
ALTER TABLE spotify_campaigns 
  ADD COLUMN IF NOT EXISTS streams_24h INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streams_7d INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streams_28d INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS playlists_24h_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS playlists_7d_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS playlists_28d_count INTEGER DEFAULT 0;

-- Add index for last_scraped_at to improve cron job queries
CREATE INDEX IF NOT EXISTS idx_spotify_campaigns_last_scraped 
  ON spotify_campaigns(last_scraped_at);

-- Add index for sfa URLs to improve filtering
CREATE INDEX IF NOT EXISTS idx_spotify_campaigns_sfa 
  ON spotify_campaigns(sfa) WHERE sfa IS NOT NULL AND sfa != '';

-- Add comment to table
COMMENT ON TABLE spotify_campaigns IS 'Spotify campaign data with automated scraping from Spotify for Artists';

-- Add comments to columns
COMMENT ON COLUMN spotify_campaigns.streams_24h IS 'Total streams in last 24 hours';
COMMENT ON COLUMN spotify_campaigns.streams_7d IS 'Total streams in last 7 days';
COMMENT ON COLUMN spotify_campaigns.streams_28d IS 'Total streams in last 28 days';
COMMENT ON COLUMN spotify_campaigns.playlists_24h_count IS 'Number of playlists with streams in last 24 hours';
COMMENT ON COLUMN spotify_campaigns.playlists_7d_count IS 'Number of playlists with streams in last 7 days';
COMMENT ON COLUMN spotify_campaigns.playlists_28d_count IS 'Number of playlists with streams in last 28 days';
COMMENT ON COLUMN spotify_campaigns.last_scraped_at IS 'Timestamp of last successful scrape';
COMMENT ON COLUMN spotify_campaigns.scrape_data IS 'Full JSON data from last scrape including playlist details';

