-- Merge enriched playlist data into vendor playlists
-- This updates playlists that have vendor_id with data from enriched playlists

-- Step 1: Update by spotify_id match
UPDATE playlists AS vendor_playlist
SET 
    follower_count = enriched.follower_count,
    genres = enriched.genres,
    spotify_id = enriched.spotify_id,
    track_count = enriched.track_count,
    owner_name = enriched.owner_name,
    updated_at = NOW()
FROM playlists AS enriched
WHERE 
    vendor_playlist.vendor_id IS NOT NULL
    AND enriched.vendor_id IS NULL
    AND enriched.follower_count > 0
    AND enriched.spotify_id IS NOT NULL
    AND vendor_playlist.spotify_id = enriched.spotify_id;

-- Step 2: Update by URL match (for playlists without spotify_id)
UPDATE playlists AS vendor_playlist
SET 
    follower_count = enriched.follower_count,
    genres = enriched.genres,
    spotify_id = enriched.spotify_id,
    track_count = enriched.track_count,
    owner_name = enriched.owner_name,
    updated_at = NOW()
FROM playlists AS enriched
WHERE 
    vendor_playlist.vendor_id IS NOT NULL
    AND enriched.vendor_id IS NULL
    AND enriched.follower_count > 0
    AND vendor_playlist.url = enriched.url
    AND vendor_playlist.follower_count = 0;  -- Only update if not already enriched

-- Step 3: Delete duplicate enriched playlists (keep vendor ones)
DELETE FROM playlists
WHERE 
    vendor_id IS NULL
    AND follower_count > 0
    AND (
        spotify_id IN (SELECT spotify_id FROM playlists WHERE vendor_id IS NOT NULL AND spotify_id IS NOT NULL)
        OR url IN (SELECT url FROM playlists WHERE vendor_id IS NOT NULL)
    );

-- Show results
SELECT 
    COUNT(*) as total_playlists,
    COUNT(*) FILTER (WHERE vendor_id IS NOT NULL) as with_vendor_id,
    COUNT(*) FILTER (WHERE follower_count > 0) as with_followers,
    COUNT(*) FILTER (WHERE array_length(genres, 1) > 0) as with_genres,
    COUNT(*) FILTER (WHERE vendor_id IS NOT NULL AND follower_count > 0) as vendor_playlists_enriched
FROM playlists;

