-- Backfill campaign_allocations_performance from existing stream_strategist_campaigns
-- This populates vendor payout data for campaigns created before this feature

-- Parse selected_playlists JSONB and create performance entries
INSERT INTO campaign_allocations_performance (
    campaign_id,
    vendor_id,
    playlist_id,
    allocated_streams,
    predicted_streams,
    actual_streams,
    cost_per_stream,
    payment_status,
    org_id,
    created_at,
    updated_at
)
SELECT 
    c.id as campaign_id,
    p.vendor_id,
    p.id as playlist_id,
    -- Distribute stream goal evenly across selected playlists
    CASE 
        WHEN jsonb_array_length(c.selected_playlists) > 0 
        THEN (c.stream_goal / jsonb_array_length(c.selected_playlists))::integer
        ELSE 0
    END as allocated_streams,
    0 as predicted_streams,
    0 as actual_streams,  -- Will be updated by scraper
    -- Get cost per stream from vendor
    COALESCE(v.cost_per_1k_streams / 1000.0, 0.01) as cost_per_stream,
    'unpaid' as payment_status,
    c.org_id,
    NOW() as created_at,
    NOW() as updated_at
FROM stream_strategist_campaigns c
-- Parse selected_playlists JSONB array (contains playlist IDs as strings)
CROSS JOIN LATERAL jsonb_array_elements_text(c.selected_playlists) AS playlist_id_text
-- Join to playlists table to get vendor_id
JOIN playlists p ON p.id::text = playlist_id_text
-- Join to vendors to get payment rates
LEFT JOIN vendors v ON p.vendor_id = v.id
WHERE 
    c.selected_playlists IS NOT NULL 
    AND jsonb_array_length(c.selected_playlists) > 0
    AND p.vendor_id IS NOT NULL  -- Only vendor playlists
ON CONFLICT DO NOTHING;  -- Skip if already exists

-- Show summary
SELECT 
    COUNT(*) as total_entries,
    COUNT(DISTINCT campaign_id) as unique_campaigns,
    COUNT(DISTINCT vendor_id) as unique_vendors,
    SUM(allocated_streams * cost_per_stream) as total_amount_owed
FROM campaign_allocations_performance;

