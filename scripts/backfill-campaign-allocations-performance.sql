-- Backfill campaign_allocations_performance from existing campaign_playlists
-- This populates vendor payout data for campaigns created before this feature

-- Insert performance records for all campaign-playlist combinations
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
    sc.campaign_group_id as campaign_id,  -- Link to campaign_groups
    cp.vendor_id,
    cp.id as playlist_id,  -- campaign_playlists.id serves as playlist_id
    -- Calculate allocated streams (distribute campaign goal evenly across playlists)
    COALESCE(
        (cg.total_goal / NULLIF(
            (SELECT COUNT(*) 
             FROM campaign_playlists cp2 
             JOIN spotify_campaigns sc2 ON cp2.campaign_id = sc2.id
             WHERE sc2.campaign_group_id = cg.id 
             AND cp2.vendor_id IS NOT NULL), 
            0)
        ),
        0
    )::integer as allocated_streams,
    0 as predicted_streams,
    -- Use scraped stream data if available
    COALESCE(cp.streams_28d, 0) as actual_streams,
    -- Get cost per stream from vendor (convert from per-1k to per-stream)
    COALESCE(v.cost_per_1k_streams / 1000.0, 0.01) as cost_per_stream,
    'unpaid' as payment_status,
    '00000000-0000-0000-0000-000000000001'::uuid as org_id,
    NOW() as created_at,
    NOW() as updated_at
FROM campaign_playlists cp
JOIN spotify_campaigns sc ON cp.campaign_id = sc.id
JOIN campaign_groups cg ON sc.campaign_group_id = cg.id
LEFT JOIN vendors v ON cp.vendor_id = v.id
WHERE cp.vendor_id IS NOT NULL  -- Only vendor playlists (not algorithmic)
    AND NOT cp.is_algorithmic  -- Exclude Spotify algorithmic playlists
ON CONFLICT DO NOTHING;  -- Skip if already exists

-- Show summary
SELECT 
    COUNT(*) as total_entries,
    COUNT(DISTINCT campaign_id) as unique_campaigns,
    COUNT(DISTINCT vendor_id) as unique_vendors,
    SUM(allocated_streams * cost_per_stream) as total_amount_owed
FROM campaign_allocations_performance;

