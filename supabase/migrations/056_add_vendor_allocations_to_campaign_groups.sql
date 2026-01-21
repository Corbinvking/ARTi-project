-- Migration: Add vendor_allocations column to campaign_groups
-- Purpose: Store per-vendor stream allocations for campaigns
-- Date: 2026-01-21

-- Add vendor_allocations JSONB column to store per-vendor stream/budget allocations
ALTER TABLE campaign_groups 
ADD COLUMN IF NOT EXISTS vendor_allocations JSONB DEFAULT '{}'::jsonb;

-- Add helpful comment
COMMENT ON COLUMN campaign_groups.vendor_allocations IS 
'Stores per-vendor stream allocations: { "vendor_id": { "allocated_streams": 10000, "allocated_budget": 100.00 } }';

-- Create index for JSONB queries if needed
CREATE INDEX IF NOT EXISTS idx_campaign_groups_vendor_allocations 
ON campaign_groups USING gin (vendor_allocations);

