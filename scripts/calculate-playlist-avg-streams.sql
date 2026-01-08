-- Calculate average daily streams for playlists based on scraped campaign data
-- This aggregates streams_24h from campaign_playlists to update playlists.avg_daily_streams

-- First, let's see what data we have
SELECT 'Campaign playlists with stream data:' as info;
SELECT 
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE streams_24h > 0) as with_24h_data,
    COUNT(*) FILTER (WHERE streams_7d > 0) as with_7d_data
FROM campaign_playlists;

-- Calculate average daily streams per playlist
-- Using streams_7d / 7 as daily average (more stable than 24h)
-- Falls back to streams_24h if 7d is not available
WITH playlist_stats AS (
    SELECT 
        COALESCE(playlist_spotify_id, LOWER(TRIM(playlist_name))) as playlist_key,
        playlist_name,
        playlist_spotify_id,
        COUNT(*) as appearance_count,
        AVG(CASE 
            WHEN streams_7d > 0 THEN streams_7d / 7.0
            WHEN streams_24h > 0 THEN streams_24h
            ELSE 0 
        END)::integer as calc_avg_daily
    FROM campaign_playlists
    WHERE playlist_name IS NOT NULL
    GROUP BY COALESCE(playlist_spotify_id, LOWER(TRIM(playlist_name))), playlist_name, playlist_spotify_id
    HAVING AVG(CASE 
            WHEN streams_7d > 0 THEN streams_7d / 7.0
            WHEN streams_24h > 0 THEN streams_24h
            ELSE 0 
        END) > 0
)
SELECT 'Playlists with calculated averages:' as info;
SELECT * FROM playlist_stats ORDER BY calc_avg_daily DESC LIMIT 20;

-- Update playlists table with calculated averages
-- Match by spotify_id first, then by name
SELECT 'Updating playlists table...' as info;

-- Update by spotify_id match
UPDATE playlists p
SET avg_daily_streams = ps.calc_avg_daily
FROM (
    SELECT 
        playlist_spotify_id,
        AVG(CASE 
            WHEN streams_7d > 0 THEN streams_7d / 7.0
            WHEN streams_24h > 0 THEN streams_24h
            ELSE 0 
        END)::integer as calc_avg_daily
    FROM campaign_playlists
    WHERE playlist_spotify_id IS NOT NULL
    GROUP BY playlist_spotify_id
    HAVING AVG(CASE 
            WHEN streams_7d > 0 THEN streams_7d / 7.0
            WHEN streams_24h > 0 THEN streams_24h
            ELSE 0 
        END) > 0
) ps
WHERE p.spotify_id = ps.playlist_spotify_id;

-- Update by name match for playlists without spotify_id match
UPDATE playlists p
SET avg_daily_streams = ps.calc_avg_daily
FROM (
    SELECT 
        LOWER(TRIM(playlist_name)) as normalized_name,
        AVG(CASE 
            WHEN streams_7d > 0 THEN streams_7d / 7.0
            WHEN streams_24h > 0 THEN streams_24h
            ELSE 0 
        END)::integer as calc_avg_daily
    FROM campaign_playlists
    WHERE playlist_spotify_id IS NULL AND playlist_name IS NOT NULL
    GROUP BY LOWER(TRIM(playlist_name))
    HAVING AVG(CASE 
            WHEN streams_7d > 0 THEN streams_7d / 7.0
            WHEN streams_24h > 0 THEN streams_24h
            ELSE 0 
        END) > 0
) ps
WHERE LOWER(TRIM(p.name)) = ps.normalized_name
  AND (p.avg_daily_streams IS NULL OR p.avg_daily_streams = 0);

-- Show results
SELECT 'Updated playlists with avg_daily_streams:' as info;
SELECT 
    name, 
    avg_daily_streams, 
    follower_count,
    spotify_id
FROM playlists 
WHERE avg_daily_streams > 0 
ORDER BY avg_daily_streams DESC 
LIMIT 20;

SELECT 'Summary:' as info;
SELECT 
    COUNT(*) as total_playlists,
    COUNT(*) FILTER (WHERE avg_daily_streams > 0) as with_stream_data,
    COUNT(*) FILTER (WHERE avg_daily_streams IS NULL OR avg_daily_streams = 0) as without_stream_data
FROM playlists;

