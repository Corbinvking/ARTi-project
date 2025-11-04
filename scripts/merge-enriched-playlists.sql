-- Merge enriched playlist data into vendor playlists
-- This updates playlists that have vendor_id with data from enriched playlists

-- Step 1: Temporarily store enriched data in a temp table
CREATE TEMP TABLE enriched_data AS
SELECT 
    name,
    follower_count,
    genres,
    url,
    spotify_id,
    track_count,
    owner_name
FROM playlists
WHERE vendor_id IS NULL AND follower_count > 0;

-- Step 2: Delete enriched playlists (will recreate data in vendor playlists)
DELETE FROM playlists
WHERE vendor_id IS NULL AND follower_count > 0;

-- Step 3: Update vendor playlists with enriched data
UPDATE playlists AS vendor_playlist
SET 
    follower_count = enriched.follower_count,
    genres = enriched.genres,
    spotify_id = enriched.spotify_id,
    url = enriched.url,
    track_count = enriched.track_count,
    owner_name = enriched.owner_name,
    updated_at = NOW()
FROM enriched_data AS enriched
WHERE 
    vendor_playlist.vendor_id IS NOT NULL
    AND vendor_playlist.name = enriched.name;

-- Show results
SELECT 
    COUNT(*) as total_playlists,
    COUNT(*) FILTER (WHERE vendor_id IS NOT NULL) as with_vendor_id,
    COUNT(*) FILTER (WHERE follower_count > 0) as with_followers,
    COUNT(*) FILTER (WHERE array_length(genres, 1) > 0) as with_genres,
    COUNT(*) FILTER (WHERE vendor_id IS NOT NULL AND follower_count > 0) as vendor_playlists_enriched
FROM playlists;
