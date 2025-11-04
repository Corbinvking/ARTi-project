#!/bin/bash

# Import Campaigns via Docker PostgreSQL COPY
# This script uses PostgreSQL's COPY command to bulk import data

echo "🚀 Starting campaign import via Docker PostgreSQL..."
echo ""

# Check if CSV exists
if [ ! -f "Spotify Playlisting-Active Campaigns (1).csv" ]; then
    echo "❌ Error: CSV file not found!"
    echo "Please upload the CSV file first:"
    echo "  scp 'Spotify Playlisting-Active Campaigns (1).csv' root@157.230.82.234:/root/arti-marketing-ops/"
    exit 1
fi

echo "📄 CSV file found"
echo "📊 Creating import table and loading data..."
echo ""

# Copy CSV into Docker container
docker cp "Spotify Playlisting-Active Campaigns (1).csv" supabase_db_arti-marketing-ops:/tmp/campaigns.csv

# Create temp table and import via SQL
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres << 'EOSQL'

-- Create temporary import table matching CSV structure
CREATE TEMP TABLE temp_campaigns (
    campaign TEXT,
    client TEXT,
    update_client TEXT,
    goal TEXT,
    remaining TEXT,
    start_date TEXT,
    daily TEXT,
    weekly TEXT,
    url TEXT,
    playlists TEXT,
    status TEXT,
    vendor TEXT,
    sale_price TEXT,
    paid_vendor TEXT,
    curator_status TEXT,
    sfa TEXT,
    notify_vendor TEXT,
    ask_for_sfa TEXT,
    notes TEXT,
    last_modified TEXT,
    email_2 TEXT,
    email_3 TEXT,
    sp_playlist_stuff TEXT
);

-- Import CSV data
\COPY temp_campaigns FROM '/tmp/campaigns.csv' WITH (FORMAT csv, HEADER true, DELIMITER ',', QUOTE '"', ESCAPE '"');

-- Get default org
DO $$
DECLARE
    default_org_id UUID;
    import_count INT := 0;
    skip_count INT := 0;
BEGIN
    -- Get or use default org
    SELECT id INTO default_org_id FROM orgs LIMIT 1;
    IF default_org_id IS NULL THEN
        default_org_id := '00000000-0000-0000-0000-000000000001'::UUID;
    END IF;

    -- Import campaigns
    INSERT INTO spotify_campaigns (
        campaign, client, vendor, url, goal, remaining, daily, weekly,
        sale_price, start_date, status, curator_status, playlists, sfa,
        notes, historical_playlists, playlist_links, paid_vendor,
        update_client_verified, notify_vendor, ask_for_sfa, org_id, client_id, vendor_id
    )
    SELECT 
        t.campaign,
        t.client,
        t.vendor,
        t.url,
        t.goal,
        t.remaining,
        t.daily,
        t.weekly,
        t.sale_price,
        CASE 
            WHEN t.start_date IS NOT NULL AND t.start_date != '' THEN
                TO_DATE(t.start_date, 'MM/DD/YYYY')
            ELSE NULL
        END,
        t.status,
        t.curator_status,
        t.playlists,
        t.sfa,
        t.notes,
        t.playlists,
        t.sp_playlist_stuff,
        t.paid_vendor = 'checked',
        t.update_client = 'checked',
        t.notify_vendor = 'checked',
        t.ask_for_sfa = 'checked',
        default_org_id,
        (SELECT id FROM clients WHERE name = t.client LIMIT 1),
        (SELECT id FROM vendors WHERE name = t.vendor LIMIT 1)
    FROM temp_campaigns t
    WHERE t.campaign IS NOT NULL AND t.campaign != ''
    ON CONFLICT (campaign) DO NOTHING;

    GET DIAGNOSTICS import_count = ROW_COUNT;
    
    RAISE NOTICE '✅ Imported % campaigns', import_count;
    
    -- Create missing clients
    INSERT INTO clients (name, org_id)
    SELECT DISTINCT t.client, default_org_id
    FROM temp_campaigns t
    WHERE t.client IS NOT NULL 
      AND t.client != ''
      AND NOT EXISTS (SELECT 1 FROM clients WHERE name = t.client)
    ON CONFLICT DO NOTHING;
    
    -- Create missing vendors
    INSERT INTO vendors (name, org_id, max_daily_streams)
    SELECT DISTINCT t.vendor, default_org_id, 10000
    FROM temp_campaigns t
    WHERE t.vendor IS NOT NULL 
      AND t.vendor != ''
      AND NOT EXISTS (SELECT 1 FROM vendors WHERE name = t.vendor)
    ON CONFLICT DO NOTHING;
    
    -- Update campaign client_id and vendor_id references
    UPDATE spotify_campaigns sc
    SET client_id = c.id
    FROM clients c
    WHERE sc.client = c.name AND sc.client_id IS NULL;
    
    UPDATE spotify_campaigns sc
    SET vendor_id = v.id
    FROM vendors v
    WHERE sc.vendor = v.name AND sc.vendor_id IS NULL;

END $$;

-- Show summary
SELECT 
    'Campaigns' as table_name, 
    COUNT(*) as count 
FROM spotify_campaigns
UNION ALL
SELECT 'Clients', COUNT(*) FROM clients
UNION ALL
SELECT 'Vendors', COUNT(*) FROM vendors;

EOSQL

echo ""
echo "============================================================"
echo "✅ Import complete!"
echo "============================================================"
echo ""
echo "Next step: Run playlist enrichment"
echo "  npx tsx scripts/enrich-campaign-playlists.ts"
echo ""

