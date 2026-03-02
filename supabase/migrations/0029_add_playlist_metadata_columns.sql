-- Migration: Add Spotify playlist metadata columns
-- This migration adds columns to store enriched metadata from Spotify Web API
-- for both playlists and campaign_playlists tables

-- Add playlist URL and metadata to campaign_playlists for linking
ALTER TABLE campaign_playlists 
ADD COLUMN IF NOT EXISTS playlist_url TEXT,
ADD COLUMN IF NOT EXISTS playlist_follower_count INTEGER,
ADD COLUMN IF NOT EXISTS playlist_description TEXT,
ADD COLUMN IF NOT EXISTS playlist_owner TEXT,
ADD COLUMN IF NOT EXISTS playlist_track_count INTEGER,
ADD COLUMN IF NOT EXISTS playlist_spotify_id VARCHAR(22); -- The base62 Spotify ID

-- Ensure playlists table has all needed columns (should already exist but being safe)
ALTER TABLE playlists 
ADD COLUMN IF NOT EXISTS spotify_id VARCHAR(22) UNIQUE,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS owner_name TEXT,
ADD COLUMN IF NOT EXISTS track_count INTEGER,
ADD COLUMN IF NOT EXISTS is_algorithmic BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMP;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_campaign_playlists_playlist_url ON campaign_playlists(playlist_url);
CREATE INDEX IF NOT EXISTS idx_campaign_playlists_spotify_id ON campaign_playlists(playlist_spotify_id);
CREATE INDEX IF NOT EXISTS idx_playlists_spotify_id ON playlists(spotify_id);
CREATE INDEX IF NOT EXISTS idx_playlists_follower_count ON playlists(follower_count DESC);

-- Add comments for documentation
COMMENT ON COLUMN campaign_playlists.playlist_url IS 'Full Spotify playlist URL for this placement';
COMMENT ON COLUMN campaign_playlists.playlist_follower_count IS 'Follower count at time of last scrape/enrichment';
COMMENT ON COLUMN campaign_playlists.playlist_description IS 'Playlist description from Spotify';
COMMENT ON COLUMN campaign_playlists.playlist_owner IS 'Playlist owner display name from Spotify';
COMMENT ON COLUMN campaign_playlists.playlist_track_count IS 'Total number of tracks in playlist';
COMMENT ON COLUMN campaign_playlists.playlist_spotify_id IS 'Base62 Spotify playlist ID (22 characters)';

COMMENT ON COLUMN playlists.spotify_id IS 'Base62 Spotify playlist ID (22 characters) for API lookups';
COMMENT ON COLUMN playlists.description IS 'Playlist description from Spotify Web API';
COMMENT ON COLUMN playlists.owner_name IS 'Display name of playlist owner';
COMMENT ON COLUMN playlists.track_count IS 'Total number of tracks in the playlist';
COMMENT ON COLUMN playlists.is_algorithmic IS 'TRUE if this is a Spotify algorithmic playlist (Radio, Discover Weekly, etc.)';
COMMENT ON COLUMN playlists.last_enriched_at IS 'Timestamp of last successful metadata fetch from Spotify API';

