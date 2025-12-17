-- Backfill campaign_allocations_performance from spotify_campaigns
-- This populates vendor payout data from the legacy system

INSERT INTO campaign_allocations_performance (
    campaign_id,
    vendor_id,
    allocated_streams,
    actual_streams,
    cost_per_stream,
    payment_status,
    created_at,
    updated_at
)
SELECT 
    -- Map to stream_strategist_campaigns.id (UUID) via campaign_group_id
    ssc.id as campaign_id,
    v.id as vendor_id,
    0 as allocated_streams,  -- Legacy system didn't track allocations
    0 as actual_streams,     -- Will be updated by scraper
    -- Calculate cost per stream from sale price (remove $ and convert to float)
    CASE 
        WHEN sc.sale_price IS NOT NULL AND sc.sale_price != '' 
        THEN (REPLACE(sc.sale_price, '$', '')::numeric / 1000.0)  -- Assuming ~1000 streams
        ELSE COALESCE(v.cost_per_1k_streams / 1000.0, 0.01)
    END as cost_per_stream,
    CASE 
        WHEN sc.paid_vendor = 'true' THEN 'paid'::text
        ELSE 'unpaid'::text
    END as payment_status,
    NOW() as created_at,
    NOW() as updated_at
FROM spotify_campaigns sc
-- Join to campaign_groups via campaign_group_id
INNER JOIN stream_strategist_campaigns ssc ON ssc.id = sc.campaign_group_id
-- Join to vendors by name
LEFT JOIN vendors v ON LOWER(TRIM(v.name)) = LOWER(TRIM(sc.vendor))
WHERE 
    sc.sale_price IS NOT NULL 
    AND sc.sale_price != ''
    AND sc.sale_price != '$0.00'
    AND v.id IS NOT NULL  -- Only if we found a matching vendor
ON CONFLICT (campaign_id, vendor_id) DO UPDATE SET
    payment_status = EXCLUDED.payment_status,
    cost_per_stream = EXCLUDED.cost_per_stream,
    updated_at = NOW();

-- Show summary
SELECT 
    COUNT(*) as total_entries,
    COUNT(DISTINCT campaign_id) as unique_campaigns,
    COUNT(DISTINCT vendor_id) as unique_vendors,
    COUNT(*) FILTER (WHERE payment_status = 'unpaid') as unpaid_count,
    COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_count,
    SUM(CASE WHEN payment_status = 'unpaid' THEN allocated_streams * cost_per_stream ELSE 0 END) as total_unpaid_amount
FROM campaign_allocations_performance;

