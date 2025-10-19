-- Check local database for the same Segan routing issue

-- Campaign groups
SELECT 
    id,
    name,
    status
FROM campaign_groups 
WHERE name LIKE '%Segan%'
ORDER BY name;

-- Songs under each group
\echo ''
\echo '=== Songs Distribution ==='
SELECT 
    cg.name as campaign_group,
    sc.id as song_id,
    sc.campaign as song_name,
    COUNT(cp.id) as playlist_count
FROM campaign_groups cg
LEFT JOIN spotify_campaigns sc ON sc.campaign_group_id = cg.id
LEFT JOIN campaign_playlists cp ON cp.campaign_id = sc.id
WHERE cg.name LIKE '%Segan%'
GROUP BY cg.name, sc.id, sc.campaign
ORDER BY cg.name, sc.campaign;

