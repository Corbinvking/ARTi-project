-- Migration: Create vendor_playlists table for caching vendor playlist ownership
-- Purpose: Store authoritative mapping of playlists to vendors for auto-matching
-- Date: 2025-01-07

-- Create vendor_playlists table
CREATE TABLE IF NOT EXISTS vendor_playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    playlist_name TEXT NOT NULL,
    playlist_name_normalized TEXT, -- Lowercase, trimmed for matching
    genres TEXT[] DEFAULT '{}', -- PostgreSQL array of genre strings
    spotify_url TEXT, -- Optional, can be enriched later
    spotify_id VARCHAR(22), -- Optional, extracted from URL
    follower_count INTEGER, -- Optional, from Spotify API
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate playlist names per vendor
    CONSTRAINT unique_vendor_playlist UNIQUE (vendor_id, playlist_name_normalized)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_vendor_playlists_vendor_id ON vendor_playlists(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_playlists_name ON vendor_playlists(playlist_name);
CREATE INDEX IF NOT EXISTS idx_vendor_playlists_name_normalized ON vendor_playlists(playlist_name_normalized);
CREATE INDEX IF NOT EXISTS idx_vendor_playlists_spotify_id ON vendor_playlists(spotify_id) WHERE spotify_id IS NOT NULL;

-- GIN index for genre array searches
CREATE INDEX IF NOT EXISTS idx_vendor_playlists_genres ON vendor_playlists USING GIN(genres);

-- Function to auto-update normalized name and updated_at
CREATE OR REPLACE FUNCTION update_vendor_playlist_normalized()
RETURNS TRIGGER AS $$
BEGIN
    NEW.playlist_name_normalized := LOWER(TRIM(NEW.playlist_name));
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-normalize playlist name
DROP TRIGGER IF EXISTS trigger_vendor_playlist_normalize ON vendor_playlists;
CREATE TRIGGER trigger_vendor_playlist_normalize
    BEFORE INSERT OR UPDATE ON vendor_playlists
    FOR EACH ROW
    EXECUTE FUNCTION update_vendor_playlist_normalized();

-- Enable RLS
ALTER TABLE vendor_playlists ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view vendor playlists" ON vendor_playlists;
CREATE POLICY "Users can view vendor playlists"
ON vendor_playlists
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can insert vendor playlists" ON vendor_playlists;
CREATE POLICY "Users can insert vendor playlists"
ON vendor_playlists
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update vendor playlists" ON vendor_playlists;
CREATE POLICY "Users can update vendor playlists"
ON vendor_playlists
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete vendor playlists" ON vendor_playlists;
CREATE POLICY "Users can delete vendor playlists"
ON vendor_playlists
FOR DELETE
TO authenticated
USING (true);

-- Service role has full access
DROP POLICY IF EXISTS "Service role has full access to vendor_playlists" ON vendor_playlists;
CREATE POLICY "Service role has full access to vendor_playlists"
ON vendor_playlists
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function to find vendor by playlist name (for auto-matching)
CREATE OR REPLACE FUNCTION find_vendor_by_playlist_name(p_playlist_name TEXT)
RETURNS TABLE (
    vendor_id UUID,
    vendor_name TEXT,
    playlist_id UUID,
    playlist_name TEXT,
    genres TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vp.vendor_id,
        v.name as vendor_name,
        vp.id as playlist_id,
        vp.playlist_name,
        vp.genres
    FROM vendor_playlists vp
    JOIN vendors v ON v.id = vp.vendor_id
    WHERE vp.playlist_name_normalized = LOWER(TRIM(p_playlist_name))
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE vendor_playlists IS 'Cache of playlists owned/managed by vendors for auto-matching during imports and scraping';
COMMENT ON COLUMN vendor_playlists.playlist_name_normalized IS 'Lowercase, trimmed version of playlist name for case-insensitive matching';
COMMENT ON COLUMN vendor_playlists.genres IS 'Array of genre tags associated with the playlist';
COMMENT ON FUNCTION find_vendor_by_playlist_name IS 'Find vendor ownership info for a playlist by name (case-insensitive)';

