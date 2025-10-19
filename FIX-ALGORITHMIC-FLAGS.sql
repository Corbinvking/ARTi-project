-- Fix the is_algorithmic flags for Spotify's official algorithmic playlists

UPDATE campaign_playlists
SET is_algorithmic = TRUE
WHERE LOWER(playlist_name) IN (
    'discover weekly',
    'release radar',
    'daily mix 1',
    'daily mix 2',
    'daily mix 3',
    'daily mix 4',
    'daily mix 5',
    'daily mix 6',
    'on repeat',
    'repeat rewind',
    'your dj',
    'radio',
    'daylist',
    'smart shuffle',
    'mixes'
)
OR playlist_name ILIKE 'Daily Mix%'
OR playlist_name ILIKE 'Radio%';

-- Show the results
SELECT 
    'Updated' as status,
    COUNT(*) as updated_count
FROM campaign_playlists
WHERE is_algorithmic = TRUE;

-- Show Segan playlists after update
SELECT 
    cp.playlist_name,
    cp.streams_28d,
    cp.is_algorithmic,
    CASE WHEN cp.is_algorithmic THEN '🎵 Algorithmic' ELSE '🎸 Vendor' END as type
FROM campaign_playlists cp
JOIN spotify_campaigns sc ON cp.campaign_id = sc.id
WHERE sc.campaign LIKE '%Segan%DNBMF%'
ORDER BY cp.is_algorithmic DESC, cp.streams_28d DESC;

