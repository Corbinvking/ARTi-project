-- ==========================================
-- Instagram Data Verification
-- ==========================================

-- 1. All campaigns
SELECT '=== CAMPAIGNS ===' as section;
SELECT id, campaign, clients, price as budget, status FROM instagram_campaigns ORDER BY id;

-- 2. All creators  
SELECT '=== CREATORS ===' as section;
SELECT id, instagram_handle, base_country, music_genres FROM creators ORDER BY instagram_handle;

-- 3. Campaign-Creator linkages
SELECT '=== CAMPAIGN-CREATOR LINKAGES ===' as section;
SELECT 
  icc.campaign_id,
  ic.campaign as campaign_name,
  icc.instagram_handle,
  icc.rate,
  icc.budget_allocation,
  icc.payment_status,
  icc.post_status,
  icc.page_status
FROM instagram_campaign_creators icc
JOIN instagram_campaigns ic ON ic.id = icc.campaign_id::integer
ORDER BY icc.sort_order;

-- 4. Verify all campaigns have creators
SELECT '=== CAMPAIGNS WITHOUT CREATORS ===' as section;
SELECT ic.id, ic.campaign, ic.clients 
FROM instagram_campaigns ic
LEFT JOIN instagram_campaign_creators icc ON icc.campaign_id = ic.id::text
WHERE icc.id IS NULL;

-- 5. Summary counts
SELECT '=== SUMMARY ===' as section;
SELECT 
  (SELECT count(*) FROM instagram_campaigns) as total_campaigns,
  (SELECT count(*) FROM creators) as total_creators,
  (SELECT count(*) FROM instagram_campaign_creators) as total_linkages;

-- 6. RLS policies on instagram_campaign_creators
SELECT '=== RLS POLICIES ===' as section;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'instagram_campaign_creators';
