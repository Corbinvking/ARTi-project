-- Migration: Add 12-month streaming columns to spotify_campaigns
-- Date: 2026-01-12
-- Purpose: Replace 28-day data with 12-month data for better long-term tracking

-- Add 12-month columns to spotify_campaigns (campaign_playlists already has streams_12m)
ALTER TABLE spotify_campaigns 
  ADD COLUMN IF NOT EXISTS streams_12m INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS playlists_12m_count INTEGER DEFAULT 0;

-- Add index for the new column
CREATE INDEX IF NOT EXISTS idx_spotify_campaigns_streams_12m 
  ON spotify_campaigns(streams_12m DESC);

-- Add comments
COMMENT ON COLUMN spotify_campaigns.streams_12m IS 'Total streams in last 12 months';
COMMENT ON COLUMN spotify_campaigns.playlists_12m_count IS 'Number of playlists with streams in last 12 months';

