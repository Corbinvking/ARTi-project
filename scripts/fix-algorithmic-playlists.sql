-- Fix misclassified algorithmic playlists in campaign_playlists table
-- This uses the authoritative list of algorithmic playlist patterns

-- First, show what will be changed
SELECT 'Playlists that SHOULD be algorithmic but are not:' as info;
SELECT id, playlist_name, is_algorithmic, vendor_id
FROM campaign_playlists
WHERE LOWER(playlist_name) SIMILAR TO '%(radio|discover weekly|your dj|mixes|on repeat|daylist|repeat rewind|your top songs|smart shuffle|blend|your daily drive|release radar|daily mix)%'
  AND (is_algorithmic = false OR is_algorithmic IS NULL)
LIMIT 20;

SELECT 'Playlists marked algorithmic but should NOT be:' as info;
SELECT id, playlist_name, is_algorithmic, vendor_id
FROM campaign_playlists
WHERE is_algorithmic = true
  AND LOWER(playlist_name) NOT SIMILAR TO '%(radio|discover weekly|your dj|mixes|on repeat|daylist|repeat rewind|your top songs|smart shuffle|blend|your daily drive|release radar|daily mix)%'
LIMIT 20;

-- Now apply the fixes
BEGIN;

-- Mark algorithmic playlists that were incorrectly classified as vendor
UPDATE campaign_playlists
SET is_algorithmic = true, vendor_id = NULL
WHERE LOWER(playlist_name) SIMILAR TO '%(radio|discover weekly|your dj|mixes|on repeat|daylist|repeat rewind|your top songs|smart shuffle|blend|your daily drive|release radar|daily mix)%'
  AND (is_algorithmic = false OR is_algorithmic IS NULL);

-- Mark non-algorithmic playlists that were incorrectly classified as algorithmic
UPDATE campaign_playlists
SET is_algorithmic = false
WHERE is_algorithmic = true
  AND LOWER(playlist_name) NOT SIMILAR TO '%(radio|discover weekly|your dj|mixes|on repeat|daylist|repeat rewind|your top songs|smart shuffle|blend|your daily drive|release radar|daily mix)%';

COMMIT;

-- Show summary
SELECT 'Summary after cleanup:' as info;
SELECT 
    COUNT(*) FILTER (WHERE is_algorithmic = true) as algorithmic_count,
    COUNT(*) FILTER (WHERE is_algorithmic = false OR is_algorithmic IS NULL) as vendor_count,
    COUNT(*) as total_count
FROM campaign_playlists;

-- Show sample of each category
SELECT 'Sample algorithmic playlists:' as info;
SELECT playlist_name, is_algorithmic FROM campaign_playlists WHERE is_algorithmic = true LIMIT 10;

SELECT 'Sample vendor playlists:' as info;
SELECT playlist_name, is_algorithmic, vendor_id FROM campaign_playlists WHERE is_algorithmic = false OR is_algorithmic IS NULL LIMIT 10;

