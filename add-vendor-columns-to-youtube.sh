#!/bin/bash
# Add vendor_paid, custom_vendor_cost, and calculated_vendor_payment columns to youtube_campaigns

set -e

echo "=========================================="
echo "Adding Vendor Columns to youtube_campaigns"
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
echo "Running migration..."

docker exec -i "$CONTAINER" psql -U postgres -d postgres << 'SQL'
-- Add vendor_paid column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'youtube_campaigns' 
        AND column_name = 'vendor_paid'
    ) THEN
        ALTER TABLE youtube_campaigns ADD COLUMN vendor_paid BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added vendor_paid column';
    ELSE
        RAISE NOTICE 'vendor_paid column already exists';
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
        RAISE NOTICE 'Added custom_vendor_cost column';
    ELSE
        RAISE NOTICE 'custom_vendor_cost column already exists';
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
        RAISE NOTICE 'Added calculated_vendor_payment column';
    ELSE
        RAISE NOTICE 'calculated_vendor_payment column already exists';
    END IF;
END $$;

-- Create index on vendor_paid for filtering
CREATE INDEX IF NOT EXISTS idx_youtube_campaigns_vendor_paid ON youtube_campaigns(vendor_paid);

-- Verify columns
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'youtube_campaigns' 
AND column_name IN ('vendor_paid', 'custom_vendor_cost', 'calculated_vendor_payment')
ORDER BY column_name;
SQL

echo ""
echo "=========================================="
echo "✅ Migration complete!"
echo "=========================================="
echo ""
echo "The youtube_campaigns table now has:"
echo "  - vendor_paid: Boolean (default FALSE)"
echo "  - custom_vendor_cost: Numeric (nullable)"
echo "  - calculated_vendor_payment: Numeric (nullable)"
echo ""
