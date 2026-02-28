-- Migration: Add time range columns to campaign_playlists table
-- Date: 2025-11-23
-- Purpose: Support 24h, 7d, 28d stream data in campaign_playlists for UI display

-- Add time-range specific stream columns
ALTER TABLE campaign_playlists 
  ADD COLUMN IF NOT EXISTS streams_24h INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streams_7d INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streams_28d INTEGER DEFAULT 0;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_playlists_campaign_id 
  ON campaign_playlists(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_playlists_streams_28d 
  ON campaign_playlists(streams_28d DESC);

-- Add comments
COMMENT ON COLUMN campaign_playlists.streams_24h IS 'Streams in last 24 hours for this playlist';
COMMENT ON COLUMN campaign_playlists.streams_7d IS 'Streams in last 7 days for this playlist';
COMMENT ON COLUMN campaign_playlists.streams_28d IS 'Streams in last 28 days for this playlist';

