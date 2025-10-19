-- Check for duplicate playlists in campaign_playlists table

-- 1. Show all playlists for Segan - DNBMF with their details
SELECT 
    cp.id,
    cp.playlist_name,
    cp.streams_28d,
    cp.is_algorithmic,
    cp.date_added,
    cp.last_scraped
FROM campaign_playlists cp
WHERE cp.campaign_id = 4594
ORDER BY cp.playlist_name, cp.streams_28d DESC;

-- 2. Show duplicates by playlist name
\echo ''
\echo '=== Duplicate Playlists ==='
SELECT 
    playlist_name,
    COUNT(*) as duplicate_count,
    STRING_AGG(streams_28d::text, ', ' ORDER BY streams_28d DESC) as stream_values,
    STRING_AGG(id::text, ', ') as playlist_ids
FROM campaign_playlists
WHERE campaign_id = 4594
GROUP BY playlist_name
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, playlist_name;

-- 3. Count total vs unique playlists
\echo ''
\echo '=== Summary ==='
SELECT 
    COUNT(*) as total_playlist_records,
    COUNT(DISTINCT playlist_name) as unique_playlist_names
FROM campaign_playlists
WHERE campaign_id = 4594;

