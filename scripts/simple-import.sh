#!/bin/bash

# Simple Campaign Import - No complex logic, just basic INSERT

echo "🚀 Starting simple campaign import..."
echo ""

# Copy CSV into container
docker cp "Spotify Playlisting-Active Campaigns (1).csv" supabase_db_arti-marketing-ops:/tmp/campaigns.csv

# Import data
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres << 'EOSQL'

-- Create temp table
CREATE TEMP TABLE temp_import (
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

-- Import CSV
\COPY temp_import FROM '/tmp/campaigns.csv' WITH (FORMAT csv, HEADER true, DELIMITER ',', QUOTE '"');

-- Show how many rows loaded
SELECT COUNT(*) as "Rows in temp table" FROM temp_import;

-- Create clients first
INSERT INTO clients (name)
SELECT DISTINCT client
FROM temp_import
WHERE client IS NOT NULL AND client != ''
ON CONFLICT DO NOTHING;

-- Create vendors first
INSERT INTO vendors (name, max_daily_streams)
SELECT DISTINCT vendor, 10000
FROM temp_import
WHERE vendor IS NOT NULL AND vendor != ''
ON CONFLICT DO NOTHING;

-- Import campaigns (simplified - only essential columns)
INSERT INTO spotify_campaigns (
    campaign, client, vendor, url, status, playlists, sfa,
    goal, remaining, daily, weekly, sale_price, start_date,
    playlist_links, client_id, vendor_id
)
SELECT 
    t.campaign,
    t.client,
    t.vendor,
    t.url,
    COALESCE(t.status, 'Active'),
    t.playlists,
    t.sfa,
    COALESCE(t.goal, '0'),
    COALESCE(t.remaining, '0'),
    COALESCE(t.daily, '0'),
    COALESCE(t.weekly, '0'),
    COALESCE(t.sale_price, '$0'),
    t.start_date,
    t.sp_playlist_stuff,
    (SELECT id FROM clients WHERE name = t.client LIMIT 1),
    (SELECT id FROM vendors WHERE name = t.vendor LIMIT 1)
FROM temp_import t
WHERE t.campaign IS NOT NULL AND t.campaign != '';

-- Show results
SELECT 
    'Campaigns imported' as result,
    COUNT(*) as count 
FROM spotify_campaigns;

SELECT 
    'Campaigns with playlist links' as result,
    COUNT(*) as count 
FROM spotify_campaigns 
WHERE playlist_links IS NOT NULL AND playlist_links != '';

EOSQL

echo ""
echo "✅ Import complete!"
echo ""

