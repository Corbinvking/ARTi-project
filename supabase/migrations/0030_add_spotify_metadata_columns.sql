-- Migration: Add Spotify Web API metadata columns
-- This migration adds columns to store enriched metadata from Spotify Web API

-- Add genre column to spotify_campaigns (storing primary genre)
ALTER TABLE spotify_campaigns 
ADD COLUMN IF NOT EXISTS primary_genre TEXT,
ADD COLUMN IF NOT EXISTS all_genres TEXT[]; -- Array of all genres from all artists

-- Add track metadata columns if not already present
ALTER TABLE spotify_campaigns 
ADD COLUMN IF NOT EXISTS track_name TEXT,
ADD COLUMN IF NOT EXISTS artist_name TEXT,
ADD COLUMN IF NOT EXISTS track_popularity INTEGER,
ADD COLUMN IF NOT EXISTS track_duration_ms INTEGER,
ADD COLUMN IF NOT EXISTS release_date DATE;

-- Add genre column to campaign_groups (for campaign-level genre tracking)
ALTER TABLE campaign_groups
ADD COLUMN IF NOT EXISTS primary_genre TEXT,
ADD COLUMN IF NOT EXISTS all_genres TEXT[];

-- Create index on genres for faster filtering
CREATE INDEX IF NOT EXISTS idx_spotify_campaigns_primary_genre ON spotify_campaigns(primary_genre);
CREATE INDEX IF NOT EXISTS idx_campaign_groups_primary_genre ON campaign_groups(primary_genre);

-- Add comment for documentation
COMMENT ON COLUMN spotify_campaigns.all_genres IS 'All genres from all artists on this track, fetched from Spotify Web API';
COMMENT ON COLUMN spotify_campaigns.primary_genre IS 'Primary genre for this track, typically the first genre from the main artist';
COMMENT ON COLUMN spotify_campaigns.track_popularity IS 'Spotify popularity score (0-100) from Spotify Web API';

