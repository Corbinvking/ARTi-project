-- Debug why playlists aren't showing

-- 1. Check if campaign_playlists have org_id set
SELECT 
  id,
  campaign_id,
  playlist_name,
  org_id,
  is_algorithmic
FROM campaign_playlists
WHERE campaign_id IN (
  SELECT id 
  FROM spotify_campaigns 
  WHERE campaign LIKE '%Segan%DNBMF%'
)
LIMIT 5;

-- 2. Check what org_id the user's memberships have
SELECT 
  user_id,
  org_id,
  role
FROM memberships
WHERE user_id = '97bf0622-6d2f-4bed-931d-e9134307545f';

-- 3. Check if there's a default org
SELECT id, name FROM organizations LIMIT 5;

-- 4. See how many campaign_playlists have NULL org_id
SELECT 
  COUNT(*) as total_playlists,
  COUNT(org_id) as playlists_with_org_id,
  COUNT(*) - COUNT(org_id) as playlists_without_org_id
FROM campaign_playlists;

