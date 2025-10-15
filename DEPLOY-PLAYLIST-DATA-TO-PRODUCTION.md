# Deploy Playlist Data to Production

## Overview
This guide will help you deploy the scraped playlist data and populate the production database with vendor playlists.

## Prerequisites
- SSH access to production server (root@artistinfluence.com)
- Production environment variables set
- Latest code pulled from main branch ✅ (Already done)

## Step 1: Apply Database Migrations

The migrations are already in place from previous deployments, but let's verify:

```bash
# On production server
cd ~/arti-marketing-ops

# Check current migration status
docker exec arti-marketing-ops-db-1 psql -U postgres -d postgres -c "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;"

# The key migration we need is:
# - 029_create_campaign_playlists_table.sql (creates campaign_playlists table)
```

If migration 029 is not applied:
```bash
# Apply it manually
docker exec -i arti-marketing-ops-db-1 psql -U postgres -d postgres < supabase/migrations/029_create_campaign_playlists_table.sql
```

## Step 2: Verify Data Prerequisites

```bash
# Check if we have the necessary base data
docker exec arti-marketing-ops-db-1 psql -U postgres -d postgres -c "
SELECT 
  (SELECT COUNT(*) FROM spotify_campaigns) as campaigns,
  (SELECT COUNT(*) FROM vendors) as vendors,
  (SELECT COUNT(*) FROM clients) as clients,
  (SELECT COUNT(*) FROM campaign_groups) as campaign_groups;
"
```

**Expected Output:**
- campaigns: ~2149
- vendors: 7
- clients: ~458
- campaign_groups: ~203

If any are missing or low, you'll need to run the data loading scripts first.

## Step 3: Check for Scraped Data

The scraped Spotify data should be in the `spotify_scraper/data/` directory:

```bash
ls -la spotify_scraper/data/ | head -20
```

If you don't see `song_*.json` files, you'll need to either:
- Copy them from your local machine, OR
- Re-run the scraper on production

## Step 4: Set Environment Variables

```bash
# Get the service role key from production
export SUPABASE_SERVICE_ROLE_KEY="your-production-service-role-key"
export SUPABASE_URL="https://your-production-supabase-url.supabase.co"

# Or use the local Docker instance
export SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
```

## Step 5: Populate Playlist Data

Run the scripts in order:

### 5.1: Process Scraped Data and Link to Campaigns
```bash
node scripts/populate-playlist-vendor-data.js
```

**Expected Output:**
```
✅ Found 7 vendors
📁 Found 26 scraped files
✅ Added X playlists to Club Restricted
📊 Total playlists processed: 51
✅ Matched to vendors: 51
```

### 5.2: Sync to Main Playlists Table
```bash
node scripts/sync-campaign-playlists-to-playlists.js
```

**Expected Output:**
```
📦 Grouped into 14 unique playlists
✅ Inserted: 14
📊 Playlists per Vendor:
   Club Restricted      14 playlists
```

## Step 6: Verify Data in Production

```bash
# Check campaign_playlists table
docker exec arti-marketing-ops-db-1 psql -U postgres -d postgres -c "
SELECT COUNT(*) as total_campaign_playlists FROM campaign_playlists;
"

# Check playlists table
docker exec arti-marketing-ops-db-1 psql -U postgres -d postgres -c "
SELECT v.name as vendor, COUNT(p.id) as playlist_count, SUM(p.avg_daily_streams) as total_daily_streams
FROM vendors v
LEFT JOIN playlists p ON p.vendor_id = v.id
GROUP BY v.id, v.name
ORDER BY playlist_count DESC;
"

# View top playlists
docker exec arti-marketing-ops-db-1 psql -U postgres -d postgres -c "
SELECT p.name, v.name as vendor, p.avg_daily_streams
FROM playlists p
JOIN vendors v ON p.vendor_id = v.id
ORDER BY p.avg_daily_streams DESC
LIMIT 10;
"
```

## Step 7: Test Frontend

Navigate to your production URL:
```
https://your-production-domain.com/spotify/playlists
```

You should see:
1. **Vendor Cards View**: Club Restricted should show 14 playlists
2. **All Playlists Table**: Should show all 14 playlists with stream data

## Step 8: Restart Services (if needed)

If the frontend isn't updating:

```bash
# Restart frontend
cd ~/arti-marketing-ops
docker compose restart frontend

# Or restart everything
docker compose restart
```

## Troubleshooting

### No playlists showing in production

1. **Check if data exists:**
   ```bash
   docker exec arti-marketing-ops-db-1 psql -U postgres -d postgres -c "SELECT COUNT(*) FROM playlists;"
   ```

2. **Check RLS policies:**
   ```bash
   docker exec arti-marketing-ops-db-1 psql -U postgres -d postgres -c "
   SELECT schemaname, tablename, policyname 
   FROM pg_policies 
   WHERE tablename = 'playlists';
   "
   ```

3. **Check user org_id:**
   Ensure playlists have the correct org_id matching your production users.

### Scraped files missing

If you don't have the scraped data on production, you have two options:

**Option A: Copy from local**
```bash
# From your local machine
scp -r spotify_scraper/data/*.json root@artistinfluence.com:~/arti-marketing-ops/spotify_scraper/data/
```

**Option B: Re-run scraper on production**
```bash
cd ~/arti-marketing-ops/spotify_scraper
# Run your scraper
```

## Success Criteria

✅ Migration 029 applied successfully
✅ 18 records in `campaign_playlists` table
✅ 14 records in `playlists` table  
✅ Club Restricted shows 14 playlists in frontend
✅ All playlists visible in table view with stream counts

## Notes

- The playlist data is aggregated from `campaign_playlists` (raw scraped data) to `playlists` (frontend display)
- Stream counts are averaged from 28-day data
- Placeholder URLs are used since we don't have actual Spotify playlist URLs from scraping
- Only Club Restricted has data currently (based on available scraped songs)

