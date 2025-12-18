-- Migration: Add vendor_paid and custom_vendor_cost columns to youtube_campaigns
-- These columns are needed for the Vendor Payments feature

-- Add vendor_paid column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'youtube_campaigns' 
        AND column_name = 'vendor_paid'
    ) THEN
        ALTER TABLE youtube_campaigns ADD COLUMN vendor_paid BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN youtube_campaigns.vendor_paid IS 'Whether the vendor has been paid for this campaign';
    END IF;
END $$;

-- Add custom_vendor_cost column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'youtube_campaigns' 
        AND column_name = 'custom_vendor_cost'
    ) THEN
        ALTER TABLE youtube_campaigns ADD COLUMN custom_vendor_cost NUMERIC(10,2) DEFAULT NULL;
        COMMENT ON COLUMN youtube_campaigns.custom_vendor_cost IS 'Optional custom vendor cost override (if set, used instead of calculated cost)';
    END IF;
END $$;

-- Add calculated_vendor_payment column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'youtube_campaigns' 
        AND column_name = 'calculated_vendor_payment'
    ) THEN
        ALTER TABLE youtube_campaigns ADD COLUMN calculated_vendor_payment NUMERIC(10,2) DEFAULT NULL;
        COMMENT ON COLUMN youtube_campaigns.calculated_vendor_payment IS 'System-calculated vendor payment based on pricing tiers';
    END IF;
END $$;

-- Create index on vendor_paid for filtering
CREATE INDEX IF NOT EXISTS idx_youtube_campaigns_vendor_paid ON youtube_campaigns(vendor_paid);

-- Verify columns were added
DO $$
BEGIN
    RAISE NOTICE 'Migration complete. Columns added to youtube_campaigns:';
    RAISE NOTICE '  - vendor_paid: %', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'youtube_campaigns' AND column_name = 'vendor_paid');
    RAISE NOTICE '  - custom_vendor_cost: %', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'youtube_campaigns' AND column_name = 'custom_vendor_cost');
    RAISE NOTICE '  - calculated_vendor_payment: %', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'youtube_campaigns' AND column_name = 'calculated_vendor_payment');
END $$;

