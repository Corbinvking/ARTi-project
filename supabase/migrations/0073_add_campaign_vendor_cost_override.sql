-- Add campaign-specific cost per 1k streams override
-- This allows different campaigns to have different rates for the same vendor
-- When NULL, falls back to the vendor's default rate

-- Add cost override column to campaign_playlists
ALTER TABLE campaign_playlists 
ADD COLUMN IF NOT EXISTS cost_per_1k_override DECIMAL(10,4) DEFAULT NULL;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_campaign_playlists_cost_override 
ON campaign_playlists(campaign_id, vendor_id) 
WHERE cost_per_1k_override IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN campaign_playlists.cost_per_1k_override IS 
'Campaign-specific cost per 1k streams. When set, overrides vendor default rate. NULL means use vendor default.';

-- Create a view that shows effective cost (override or default)
CREATE OR REPLACE VIEW campaign_playlist_costs AS
SELECT 
    cp.id,
    cp.campaign_id,
    cp.vendor_id,
    cp.playlist_name,
    cp.playlist_spotify_id,
    cp.streams_24h,
    cp.streams_7d,
    cp.streams_28d,
    cp.cost_per_1k_override,
    v.cost_per_1k_streams as vendor_default_cost,
    COALESCE(cp.cost_per_1k_override, v.cost_per_1k_streams) as effective_cost_per_1k,
    v.name as vendor_name
FROM campaign_playlists cp
LEFT JOIN vendors v ON cp.vendor_id = v.id;

