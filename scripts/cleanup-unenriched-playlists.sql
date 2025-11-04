-- Cleanup script to remove old unenriched playlists with fake URLs
-- These are playlists that were imported from CSV but never enriched with Spotify data

-- First, let's see what we're about to delete
SELECT 
    COUNT(*) as total_to_delete,
    COUNT(DISTINCT vendor_id) as vendors_affected
FROM playlists
WHERE 
    follower_count = 0
    AND array_length(genres, 1) IS NULL
    AND vendor_id IS NOT NULL
    AND NOT url ~* 'open\.spotify\.com/playlist/[a-zA-Z0-9]{22}';

-- Show some examples
SELECT id, name, url, vendor_id, follower_count
FROM playlists
WHERE 
    follower_count = 0
    AND array_length(genres, 1) IS NULL
    AND vendor_id IS NOT NULL
    AND NOT url ~* 'open\.spotify\.com/playlist/[a-zA-Z0-9]{22}'
LIMIT 10;

-- Delete old unenriched playlists with fake URLs
-- These are safe to delete because:
-- 1. They have 0 followers (not enriched)
-- 2. They have no genres (not enriched)
-- 3. They have fake/slugified URLs (not real Spotify URLs)
-- 4. The enriched versions exist with real data
DELETE FROM playlists
WHERE 
    follower_count = 0
    AND array_length(genres, 1) IS NULL
    AND vendor_id IS NOT NULL
    AND NOT url ~* 'open\.spotify\.com/playlist/[a-zA-Z0-9]{22}';

-- Show final stats
SELECT 
    COUNT(*) as total_playlists,
    COUNT(*) FILTER (WHERE vendor_id IS NOT NULL) as with_vendor_id,
    COUNT(*) FILTER (WHERE follower_count > 0) as with_followers,
    COUNT(*) FILTER (WHERE array_length(genres, 1) > 0) as with_genres,
    COUNT(*) FILTER (WHERE url ~* 'open\.spotify\.com/playlist/[a-zA-Z0-9]{22}') as with_real_urls
FROM playlists;

