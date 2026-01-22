-- Backfill performance_entries from existing campaign_playlists data
-- This creates initial entries using the streams_24h data and last_scraped timestamp

-- First, let's see what we have to work with
-- SELECT count(*), count(CASE WHEN streams_24h > 0 THEN 1 END) as with_streams
-- FROM campaign_playlists;

-- Insert performance entries for each campaign_playlist that has streams_24h > 0
-- Use ON CONFLICT to avoid duplicates if run multiple times
INSERT INTO performance_entries (playlist_id, daily_streams, date_recorded, created_at)
SELECT 
    cp.id as playlist_id,
    cp.streams_24h as daily_streams,
    COALESCE(cp.last_scraped::date, cp.updated_at::date, CURRENT_DATE) as date_recorded,
    COALESCE(cp.last_scraped, cp.updated_at, NOW()) as created_at
FROM campaign_playlists cp
WHERE cp.streams_24h > 0
  AND cp.id IS NOT NULL
ON CONFLICT (playlist_id, date_recorded) DO UPDATE 
SET daily_streams = EXCLUDED.daily_streams,
    created_at = EXCLUDED.created_at;

-- Show summary of what was inserted
SELECT 
    'Backfill complete' as status,
    count(*) as total_entries,
    count(DISTINCT playlist_id) as unique_playlists
FROM performance_entries;
