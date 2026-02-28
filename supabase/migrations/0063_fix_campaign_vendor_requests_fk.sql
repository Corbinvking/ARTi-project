-- Migration: Fix campaign_vendor_requests foreign key
-- Purpose: Change FK from stream_strategist_campaigns to campaign_groups
-- Date: 2025-01-19

-- Drop the existing FK constraint if it exists
ALTER TABLE public.campaign_vendor_requests
DROP CONSTRAINT IF EXISTS campaign_vendor_requests_campaign_id_fkey;

-- Add new FK referencing campaign_groups (which is what we actually use)
-- Use a nullable constraint since campaign_groups might not exist yet in all cases
ALTER TABLE public.campaign_vendor_requests
ADD CONSTRAINT campaign_vendor_requests_campaign_group_fkey
FOREIGN KEY (campaign_id) REFERENCES public.campaign_groups(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_campaign_vendor_requests_campaign_id 
ON public.campaign_vendor_requests(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_vendor_requests_vendor_id 
ON public.campaign_vendor_requests(vendor_id);

CREATE INDEX IF NOT EXISTS idx_campaign_vendor_requests_status 
ON public.campaign_vendor_requests(status);

-- Add comment for clarity
COMMENT ON TABLE public.campaign_vendor_requests IS 'Vendor requests for campaign participation. campaign_id references campaign_groups.id';

