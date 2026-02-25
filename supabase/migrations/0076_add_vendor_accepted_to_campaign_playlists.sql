-- Migration: Add vendor_accepted field to campaign_playlists
-- This keeps backward compatibility for older clients that still send vendor_accepted
ALTER TABLE campaign_playlists
ADD COLUMN IF NOT EXISTS vendor_accepted boolean;

COMMENT ON COLUMN campaign_playlists.vendor_accepted IS
'Legacy flag for vendor acceptance. Prefer campaign_vendor_requests.status.';
