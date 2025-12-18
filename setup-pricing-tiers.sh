#!/bin/bash
# Setup youtube_pricing_tiers table with default data

set -e

echo "=========================================="
echo "Setting up YouTube Pricing Tiers"
echo "=========================================="
echo ""

# Find the Supabase database container
CONTAINER=""
if docker ps | grep -q "supabase_db_arti"; then
    CONTAINER=$(docker ps | grep "supabase_db_arti" | awk '{print $1}' | head -1)
elif docker ps | grep -q "supabase-db"; then
    CONTAINER=$(docker ps | grep "supabase-db" | awk '{print $1}' | head -1)
elif docker ps | grep -q "postgres"; then
    CONTAINER=$(docker ps | grep "postgres" | awk '{print $1}' | head -1)
fi

if [ -z "$CONTAINER" ]; then
    echo "❌ Cannot find Supabase PostgreSQL container."
    echo "Available containers:"
    docker ps --format "table {{.Names}}\t{{.Image}}"
    exit 1
fi

echo "Found database container: $CONTAINER"
echo ""
echo "Checking if table exists..."

docker exec -i "$CONTAINER" psql -U postgres -d postgres << 'SQL'
-- Check if table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'youtube_pricing_tiers') THEN
        RAISE NOTICE 'Table does not exist. Creating...';
        
        -- Create youtube_pricing_tiers table
        CREATE TABLE youtube_pricing_tiers (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            service_type text NOT NULL,
            tier_min_views integer NOT NULL DEFAULT 0,
            tier_max_views integer DEFAULT NULL,
            cost_per_1k_views numeric(10, 4) NOT NULL,
            notes text,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now(),
            CONSTRAINT valid_tier_range CHECK (tier_max_views IS NULL OR tier_max_views >= tier_min_views),
            CONSTRAINT unique_service_tier UNIQUE (service_type, tier_min_views)
        );
        
        -- Create index
        CREATE INDEX idx_pricing_tiers_service_views 
        ON youtube_pricing_tiers(service_type, tier_min_views, tier_max_views);
        
        -- Enable RLS
        ALTER TABLE youtube_pricing_tiers ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Users can read pricing tiers"
        ON youtube_pricing_tiers
        FOR SELECT
        TO authenticated
        USING (true);
        
        CREATE POLICY "Authenticated users can manage pricing tiers"
        ON youtube_pricing_tiers
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
        
        RAISE NOTICE 'Table created successfully';
    ELSE
        RAISE NOTICE 'Table already exists';
    END IF;
END $$;

-- Check current row count
SELECT COUNT(*) as current_rows FROM youtube_pricing_tiers;

-- Insert default pricing if table is empty
INSERT INTO youtube_pricing_tiers (service_type, tier_min_views, tier_max_views, cost_per_1k_views, notes) 
SELECT * FROM (VALUES
    ('ww_display', 0, NULL::integer, 3.50, 'Worldwide Display Ads'),
    ('ww_website', 0, NULL::integer, 2.00, 'Worldwide Website'),
    ('ww_skip', 0, NULL::integer, 1.40, 'Worldwide Skippable Ads'),
    ('us_display', 0, NULL::integer, 5.00, 'US Display Ads'),
    ('us_website', 0, NULL::integer, 6.50, 'US Website'),
    ('us_skip', 0, NULL::integer, 5.00, 'US Skippable Ads'),
    ('us_eur_website', 0, NULL::integer, 6.50, 'US/EUR Website'),
    ('latam_display', 0, NULL::integer, 2.80, 'Latin America Display Ads'),
    ('latam_website', 0, NULL::integer, 2.80, 'Latin America Website'),
    ('latam_skip', 0, NULL::integer, 2.80, 'Latin America Skippable Ads'),
    ('eur_display', 0, NULL::integer, 6.00, 'Europe Display Ads'),
    ('eur_website', 0, NULL::integer, 6.00, 'Europe Website'),
    ('eur_skip', 0, NULL::integer, 6.00, 'Europe Skippable Ads'),
    ('asia_website', 0, NULL::integer, 3.00, 'Asia Website'),
    ('mena_display', 0, NULL::integer, 3.50, 'MENA Display Ads'),
    ('cad_display', 0, NULL::integer, 6.50, 'Canada Display Ads'),
    ('cad_website', 0, NULL::integer, 6.50, 'Canada Website'),
    ('cad_skip', 0, NULL::integer, 6.50, 'Canada Skippable Ads'),
    ('aus_display', 0, NULL::integer, 6.50, 'Australia Display Ads'),
    ('aus_website', 0, NULL::integer, 6.50, 'Australia Website'),
    ('aus_skip', 0, NULL::integer, 6.50, 'Australia Skippable Ads'),
    ('youtube_eng_ad', 0, NULL::integer, 0.00, 'YouTube Engagement Ad - No charge'),
    ('engagements_only', 0, NULL::integer, 0.00, 'Engagements Only - No charge'),
    ('custom', 0, NULL::integer, 0.00, 'Custom - Calculate manually')
) AS new_data(service_type, tier_min_views, tier_max_views, cost_per_1k_views, notes)
WHERE NOT EXISTS (SELECT 1 FROM youtube_pricing_tiers LIMIT 1)
ON CONFLICT (service_type, tier_min_views) DO NOTHING;

-- Show final row count
SELECT COUNT(*) as total_rows FROM youtube_pricing_tiers;

-- Show all pricing tiers
SELECT 
    service_type,
    tier_min_views,
    tier_max_views,
    cost_per_1k_views,
    notes
FROM youtube_pricing_tiers
ORDER BY service_type;
SQL

echo ""
echo "=========================================="
echo "✅ Pricing tiers setup complete!"
echo "=========================================="

