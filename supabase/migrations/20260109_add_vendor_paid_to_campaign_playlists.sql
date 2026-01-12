-- Migration: Add vendor_paid field to campaign_playlists
-- Purpose: Track payment status per vendor per campaign (not at campaign level)
-- This fixes the bug where marking one vendor as paid marked all vendors as paid

-- Add vendor_paid column to campaign_playlists
ALTER TABLE campaign_playlists 
ADD COLUMN IF NOT EXISTS vendor_paid BOOLEAN DEFAULT FALSE;

-- Add payment_date column for tracking when payment was made
ALTER TABLE campaign_playlists 
ADD COLUMN IF NOT EXISTS vendor_payment_date DATE;

-- Add payment_amount for the actual amount paid
ALTER TABLE campaign_playlists 
ADD COLUMN IF NOT EXISTS vendor_payment_amount DECIMAL(10,2);

-- Create index for efficient lookups of unpaid vendors
CREATE INDEX IF NOT EXISTS idx_campaign_playlists_vendor_paid 
ON campaign_playlists(vendor_paid, vendor_id) 
WHERE vendor_paid = FALSE;

-- Add comments
COMMENT ON COLUMN campaign_playlists.vendor_paid IS 'Whether the vendor has been paid for this playlist placement';
COMMENT ON COLUMN campaign_playlists.vendor_payment_date IS 'Date when the vendor was paid';
COMMENT ON COLUMN campaign_playlists.vendor_payment_amount IS 'Amount paid to the vendor for this placement';

