-- Migration: Create youtube_pricing_tiers table
-- Purpose: Store pricing rates for different YouTube service types and view tiers
-- Date: 2025-11-14

-- Drop existing table if exists (for idempotency)
DROP TABLE IF EXISTS youtube_pricing_tiers CASCADE;

-- Create youtube_pricing_tiers table
CREATE TABLE youtube_pricing_tiers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type youtube_service_type NOT NULL,
    tier_min_views integer NOT NULL DEFAULT 0,
    tier_max_views integer DEFAULT NULL, -- NULL means unlimited
    cost_per_1k_views numeric(10, 4) NOT NULL,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Ensure no overlapping view ranges for same service type
    CONSTRAINT valid_tier_range CHECK (tier_max_views IS NULL OR tier_max_views >= tier_min_views),
    CONSTRAINT unique_service_tier UNIQUE (service_type, tier_min_views)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_service_views 
ON youtube_pricing_tiers(service_type, tier_min_views, tier_max_views);

-- Enable RLS
ALTER TABLE youtube_pricing_tiers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin full access to pricing tiers" ON youtube_pricing_tiers;
DROP POLICY IF EXISTS "Users can read pricing tiers" ON youtube_pricing_tiers;

-- RLS Policies
CREATE POLICY "Admin full access to pricing tiers"
ON youtube_pricing_tiers
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

CREATE POLICY "Users can read pricing tiers"
ON youtube_pricing_tiers
FOR SELECT
TO authenticated
USING (true);

-- Insert default pricing rates (matching the hardcoded values in vendorPaymentCalculator.ts)
INSERT INTO youtube_pricing_tiers (service_type, tier_min_views, tier_max_views, cost_per_1k_views, notes) VALUES
    -- Worldwide
    ('ww_display', 0, NULL, 1.20, 'Worldwide Display Ads'),
    ('ww_website', 0, NULL, 1.20, 'Worldwide Website'),
    ('ww_skip', 0, NULL, 1.40, 'Worldwide Skippable Ads'),
    ('ww_website_ads', 0, NULL, 1.20, 'Worldwide Website Ads'),
    
    -- United States
    ('us_display', 0, NULL, 6.50, 'US Display Ads'),
    ('us_website', 0, NULL, 6.50, 'US Website'),
    ('us_website_ads', 0, NULL, 6.50, 'US Website Ads'),
    ('us_skip', 0, NULL, 6.50, 'US Skippable Ads'),
    ('us_eur_website', 0, NULL, 6.50, 'US/EUR Website'),
    
    -- Latin America
    ('latam_display', 0, NULL, 2.80, 'Latin America Display Ads'),
    ('latam_website', 0, NULL, 2.80, 'Latin America Website'),
    ('latam_skip', 0, NULL, 2.80, 'Latin America Skippable Ads'),
    
    -- Europe
    ('eur_display', 0, NULL, 6.50, 'Europe Display Ads'),
    ('eur_website', 0, NULL, 6.50, 'Europe Website'),
    ('eur_skip', 0, NULL, 6.50, 'Europe Skippable Ads'),
    
    -- Asia
    ('asia_website', 0, NULL, 3.00, 'Asia Website'),
    
    -- Middle East & North Africa
    ('mena_display', 0, NULL, 3.50, 'MENA Display Ads'),
    
    -- Canada
    ('cad_display', 0, NULL, 6.50, 'Canada Display Ads'),
    ('cad_website', 0, NULL, 6.50, 'Canada Website'),
    ('cad_skip', 0, NULL, 6.50, 'Canada Skippable Ads'),
    
    -- Australia
    ('aus_display', 0, NULL, 6.50, 'Australia Display Ads'),
    ('aus_website', 0, NULL, 6.50, 'Australia Website'),
    ('aus_skip', 0, NULL, 6.50, 'Australia Skippable Ads'),
    
    -- Special
    ('youtube_eng_ad', 0, NULL, 0.00, 'YouTube Engagement Ad - No charge'),
    ('engagements_only', 0, NULL, 0.00, 'Engagements Only - No charge'),
    ('custom', 0, NULL, 0.00, 'Custom - Calculate manually')
ON CONFLICT (service_type, tier_min_views) DO NOTHING;

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_youtube_pricing_tiers_updated_at ON youtube_pricing_tiers;
CREATE TRIGGER update_youtube_pricing_tiers_updated_at
    BEFORE UPDATE ON youtube_pricing_tiers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE youtube_pricing_tiers IS 'Pricing rates for YouTube campaigns based on service type and view tiers';

