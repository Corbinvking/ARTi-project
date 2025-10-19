-- Fix the Segan campaign routing issue
-- Problem: All songs are under generic "Segan" group, but UI shows separate groups for each song

-- 1. Move "Segan - DNBMF" song to its correct campaign group
UPDATE spotify_campaigns
SET campaign_group_id = 'be7da8c7-4195-443b-91fa-425182876d82'
WHERE id = 4594
AND campaign = 'Segan - DNBMF';

-- 2. Move "Segan - Tempo" song to its correct campaign group
UPDATE spotify_campaigns
SET campaign_group_id = '0ddd031c-0ef3-408a-b069-a7d3e9d0b812'
WHERE id = 4321
AND campaign = 'Segan - Tempo';

-- 3. Check if the generic "Segan" group still has any songs
SELECT 
    'Remaining songs in generic Segan group:' as status,
    COUNT(*) as count
FROM spotify_campaigns
WHERE campaign_group_id = 'ef98b550-4722-4dcb-ad24-951565b7ff15';

-- 4. If it only has "Segan - The Same", we can leave it or rename the group

-- 5. Verify the fix - show distribution after update
\echo ''
\echo '=== After Fix: Songs per Campaign Group ==='
SELECT 
    cg.id,
    cg.name,
    COUNT(sc.id) as song_count,
    SUM((SELECT COUNT(*) FROM campaign_playlists WHERE campaign_id = sc.id)) as total_playlists
FROM campaign_groups cg
LEFT JOIN spotify_campaigns sc ON sc.campaign_group_id = cg.id
WHERE cg.name LIKE '%Segan%'
GROUP BY cg.id, cg.name
ORDER BY cg.name;

-- 6. Show the songs under each group
\echo ''
\echo '=== Songs Under "Segan - DNBMF" (should have 1 song with 20 playlists) ==='
SELECT 
    sc.id,
    sc.campaign,
    (SELECT COUNT(*) FROM campaign_playlists WHERE campaign_id = sc.id) as playlist_count
FROM spotify_campaigns sc
WHERE sc.campaign_group_id = 'be7da8c7-4195-443b-91fa-425182876d82';

\echo ''
\echo '=== Songs Under "Segan - Tempo" (should have 1 song with 2 playlists) ==='
SELECT 
    sc.id,
    sc.campaign,
    (SELECT COUNT(*) FROM campaign_playlists WHERE campaign_id = sc.id) as playlist_count
FROM spotify_campaigns sc
WHERE sc.campaign_group_id = '0ddd031c-0ef3-408a-b069-a7d3e9d0b812';

\echo ''
\echo '✅ Fix complete! Now "Segan - DNBMF" campaign group should show 20 playlists.'

