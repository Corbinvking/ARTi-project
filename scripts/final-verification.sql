-- ============================================================
-- FINAL VERIFICATION: CSV vs Database Cross-Check
-- ============================================================

-- 1. Campaign data accuracy
SELECT '=== CAMPAIGN DATA CHECK ===' as section;
SELECT 
  ic.id,
  ic.campaign,
  ic.clients,
  ic.price as budget,
  ic.spend as actual_spend,
  ic.remaining,
  ic.status,
  ic.start_date,
  ic.sound_url IS NOT NULL as has_sound_url,
  ic.tracker IS NOT NULL as has_tracker,
  ic.campaign_started,
  ic.send_tracker,
  ic.send_final_report,
  ic.report_notes,
  ic.client_notes
FROM instagram_campaigns ic
ORDER BY ic.id;

-- 2. Creator data with org_id check
SELECT '=== CREATORS CHECK ===' as section;
SELECT 
  c.id,
  c.instagram_handle,
  c.org_id,
  c.base_country,
  c.music_genres,
  c.content_types
FROM creators c
ORDER BY c.instagram_handle;

-- 3. Campaign-Creator linkages with full detail
SELECT '=== LINKAGE CHECK ===' as section;
SELECT 
  icc.id as linkage_id,
  icc.campaign_id,
  ic.campaign as campaign_name,
  ic.clients as csv_client,
  icc.instagram_handle as linked_creator,
  icc.rate,
  icc.budget_allocation,
  icc.payment_status,
  icc.post_status,
  icc.approval_status,
  icc.page_status
FROM instagram_campaign_creators icc
JOIN instagram_campaigns ic ON ic.id = icc.campaign_id::integer
ORDER BY icc.sort_order;

-- 4. Orphan checks
SELECT '=== ORPHAN CAMPAIGNS (no creator linked) ===' as section;
SELECT ic.id, ic.campaign FROM instagram_campaigns ic
LEFT JOIN instagram_campaign_creators icc ON icc.campaign_id = ic.id::text
WHERE icc.id IS NULL;

SELECT '=== ORPHAN CREATORS (no campaign linked) ===' as section;
SELECT c.instagram_handle FROM creators c
LEFT JOIN instagram_campaign_creators icc ON icc.instagram_handle = c.instagram_handle
WHERE icc.id IS NULL;

-- 5. RLS policy status on all 3 tables
SELECT '=== RLS STATUS ===' as section;
SELECT 
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  count(p.policyname) as policy_count
FROM pg_class c
LEFT JOIN pg_policies p ON p.tablename = c.relname
WHERE c.relname IN ('instagram_campaigns', 'creators', 'instagram_campaign_creators')
AND c.relkind = 'r'
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relname;

-- 6. Final counts
SELECT '=== FINAL SUMMARY ===' as section;
SELECT 
  (SELECT count(*) FROM instagram_campaigns) as campaigns,
  (SELECT count(*) FROM instagram_campaigns WHERE status = 'Active') as active_campaigns,
  (SELECT count(*) FROM creators WHERE org_id IS NOT NULL) as creators_with_org,
  (SELECT count(*) FROM creators WHERE org_id IS NULL) as creators_missing_org,
  (SELECT count(*) FROM instagram_campaign_creators) as linkages,
  (SELECT count(DISTINCT campaign_id) FROM instagram_campaign_creators) as linked_campaigns,
  (SELECT count(DISTINCT instagram_handle) FROM instagram_campaign_creators) as linked_creators;
