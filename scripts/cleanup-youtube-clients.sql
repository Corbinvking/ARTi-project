-- ============================================================================
-- YouTube Clients Cleanup
-- Remove stale clients not in the Active Campaigns CSV
-- ============================================================================

-- Step 1: Show campaigns that are "active" but NOT from today's import
-- These are old campaigns that should be marked complete since they're
-- not in the current "YouTube-Active Campaigns.csv"
SELECT campaign_name, status, start_date, created_at::date as imported_on
FROM youtube_campaigns 
WHERE status = 'active' 
  AND created_at::date < '2026-02-12'
ORDER BY start_date DESC;

-- Step 2: Mark old active campaigns as 'complete' (they're not in the new CSV)
UPDATE youtube_campaigns
SET status = 'complete'
WHERE status = 'active'
  AND created_at::date < '2026-02-12';

-- Step 3: Unlink completed campaigns from clients we want to remove
-- (Set client_id = NULL for completed campaigns whose client has no active campaigns)
UPDATE youtube_campaigns yc
SET client_id = NULL
WHERE yc.status = 'complete'
  AND yc.client_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM youtube_campaigns active_camp
    WHERE active_camp.client_id = yc.client_id
      AND active_camp.status = 'active'
  );

-- Step 4: Delete clients that now have no campaigns referencing them
DELETE FROM youtube_clients ycl
WHERE NOT EXISTS (
  SELECT 1 FROM youtube_campaigns yc WHERE yc.client_id = ycl.id
);

-- Step 5: Verify final state
SELECT 'Remaining clients:' as info, count(*) as count FROM youtube_clients
UNION ALL
SELECT 'Active campaigns:', count(*) FROM youtube_campaigns WHERE status = 'active'
UNION ALL
SELECT 'Total campaigns:', count(*) FROM youtube_campaigns;

-- Step 6: Show final client list with campaign counts
SELECT ycl.name as client, 
       COUNT(yc.id) as total_campaigns,
       COUNT(CASE WHEN yc.status = 'active' THEN 1 END) as active_campaigns
FROM youtube_clients ycl
LEFT JOIN youtube_campaigns yc ON yc.client_id = ycl.id
GROUP BY ycl.name
ORDER BY active_campaigns DESC, ycl.name;
