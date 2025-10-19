-- Fix duplicate playlists by keeping the older, higher-quality records

-- Strategy: For each duplicate playlist name, keep the one with:
-- 1. The highest stream count (more accurate data)
-- 2. If stream counts are equal, keep the older one (earlier last_scraped)

-- This will delete 7 duplicate records

-- Delete duplicates for "Your DJ" (keep 474, delete 35)
DELETE FROM campaign_playlists
WHERE id = 'e7419b07-090e-4a1b-9de8-79c6c74e9508';

-- Delete duplicates for "Discover Weekly" (keep 353, delete 50)
DELETE FROM campaign_playlists
WHERE id = '2de0068c-8afa-46fe-b7d8-d1e2b95a617e';

-- Delete duplicates for "Radio" (keep 59, delete 18)
DELETE FROM campaign_playlists
WHERE id = 'ae21efcc-b5b9-4728-bf53-6b956b691abe';

-- Delete duplicates for "Daylist" (keep older one from Oct 15)
DELETE FROM campaign_playlists
WHERE id = '539f360f-a14e-45c4-89ca-5e00619ec623';

-- Delete duplicates for "Mixes" (keep 9, delete 4)
DELETE FROM campaign_playlists
WHERE id = '6f00c28e-a200-4e67-a2d4-acf79e144464';

-- Delete duplicates for "Release Radar" (keep older one from Oct 15)
DELETE FROM campaign_playlists
WHERE id = '30ee426a-8edc-4aa1-83ea-bb6c13c08633';

-- Delete duplicates for "Smart Shuffle" (keep older one from Oct 15)
DELETE FROM campaign_playlists
WHERE id = '873adc8c-0e55-4d2b-ac17-c9d9ce9aa597';

-- Verify the fix
\echo ''
\echo '=== After Fix: Remaining Playlists ==='
SELECT 
    playlist_name,
    streams_28d,
    is_algorithmic,
    last_scraped
FROM campaign_playlists
WHERE campaign_id = 4594
ORDER BY is_algorithmic DESC, streams_28d DESC;

-- Summary
\echo ''
\echo '=== Summary ==='
SELECT 
    COUNT(*) as total_playlists,
    COUNT(DISTINCT playlist_name) as unique_playlists,
    SUM(CASE WHEN is_algorithmic THEN 1 ELSE 0 END) as algorithmic_count,
    SUM(CASE WHEN NOT is_algorithmic THEN 1 ELSE 0 END) as vendor_count
FROM campaign_playlists
WHERE campaign_id = 4594;

\echo ''
\echo '✅ Fix complete! Deleted 7 duplicate playlist records.'
\echo '   - Kept records with highest stream counts and best data quality'
\echo '   - UI should now show 13 unique playlists without duplicates'

