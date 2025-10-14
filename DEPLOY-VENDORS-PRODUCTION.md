# Deploy Vendors to Production

## Overview
This deployment populates the vendors table from campaign data and links campaigns to their vendors.

## What's Being Deployed
1. ✅ Vendor records (Club Restricted, Glenn, Golden Nugget, etc.)
2. ✅ Vendor metrics (max daily streams, cost per 1k, concurrent campaigns)
3. ✅ vendor_id column on spotify_campaigns
4. ✅ Campaign-to-vendor relationships

## Step-by-Step Deployment

### Step 1: SSH into Production
```bash
ssh root@artistinfluence.com
cd ~/arti-marketing-ops
```

### Step 2: Pull Latest Changes
```bash
git pull origin main
```

### Step 3: Apply Vendor Linking Migration
```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/029_link_vendors_to_campaigns.sql
```

**Expected Output:**
```
ALTER TABLE
CREATE INDEX
COMMENT
```

### Step 4: Populate Vendors from Campaign Data
```bash
# Set environment variable
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

# Run vendor population script
node scripts/populate-vendors.js
```

**Expected Output:**
```
✅ Vendor population complete!
   🏢 Created 7-8 vendors

📊 Vendor Summary:
──────────────────────────────────────────────────────────────
Vendor               Max Daily    Active   Cost/1k    Status
──────────────────────────────────────────────────────────────
Club Restricted      5000+        100+     $20-30     ✅ Active
Glenn                3000+        20+      $30-40     ✅ Active
...
```

### Step 5: Link Campaigns to Vendors
```bash
node scripts/link-campaigns-to-vendors.js
```

**Expected Output:**
```
✅ Linking complete!
   ✅ Linked: 250-300
   ⚠️  No vendor match: 700+ (these are ok - campaigns without vendors)

📊 Verification:
   Club Restricted: 180+ campaigns linked
   Glenn: 25+ campaigns linked
   Golden Nugget: 30+ campaigns linked
   Moon: 15+ campaigns linked
   ...
```

### Step 6: Verify Vendors
```bash
# Check vendor count
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT COUNT(*) FROM vendors;"

# View vendor details
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT name, max_daily_streams, max_concurrent_campaigns, cost_per_1k_streams, is_active FROM vendors ORDER BY max_daily_streams DESC;"

# Check campaign linkage
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT v.name, COUNT(sc.id) as linked_campaigns FROM vendors v LEFT JOIN spotify_campaigns sc ON sc.vendor_id = v.id GROUP BY v.id, v.name ORDER BY linked_campaigns DESC;"
```

**Expected Output:**
```
✅ 7-8 vendors total
✅ All vendors have max_daily_streams > 0
✅ All active vendors have linked campaigns
✅ Club Restricted has most campaigns (180+)
```

### Step 7: Test Frontend
1. Navigate to https://app.artistinfluence.com/spotify/playlists
2. Click "Vendor Cards" view
3. Verify vendor cards show:
   - ✅ Vendor name (Club Restricted, Glenn, etc.)
   - ✅ Cost per 1k streams
   - ✅ Max Daily Streams
   - ✅ Active status badge
   - ✅ "View Playlists" button
4. Click "View Playlists" on a vendor to see their playlists

## Expected Results

### Vendors Created:
- **Club Restricted** - ~180 campaigns, ~90,000 daily streams, $22/1k
- **Glenn** - ~28 campaigns, ~10,000 daily streams, $35/1k
- **Golden Nugget** - ~30 campaigns, ~3,000 daily streams, $23/1k
- **Moon** - ~19 campaigns, ~2,600 daily streams, $25/1k
- **Levianth** - ~9 campaigns, ~1,200 daily streams, $34/1k
- **House Views** - ~8 campaigns, ~700 daily streams, $56/1k
- **Alekk** - ~5 campaigns, ~700 daily streams, $45/1k

### Vendor Metrics:
- **Max Daily Streams** = Highest daily streams from any single campaign
- **Max Concurrent Campaigns** = Number of currently active campaigns
- **Cost per 1k** = Average cost per 1,000 streams delivered
- **Is Active** = TRUE if vendor has active campaigns

## Troubleshooting

### Issue: Script fails with "SUPABASE_SERVICE_ROLE_KEY required"
**Solution:**
```bash
export SUPABASE_SERVICE_ROLE_KEY="your-actual-production-key"
# Get the key from production.env or Supabase dashboard
```

### Issue: No vendors created
**Solution:**
```bash
# Check if campaigns have vendor data
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT DISTINCT vendor FROM spotify_campaigns WHERE vendor IS NOT NULL LIMIT 10;"

# If vendors exist, re-run the script
node scripts/populate-vendors.js
```

### Issue: Campaigns not linked to vendors
**Solution:**
```bash
# Verify vendor_id column exists
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "\d spotify_campaigns" | grep vendor_id

# Re-run linking script
node scripts/link-campaigns-to-vendors.js
```

## Rollback (if needed)

```bash
# Remove vendor linkage
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "UPDATE spotify_campaigns SET vendor_id = NULL;"

# Clear vendors table
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "DELETE FROM vendors;"

# Remove column
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "ALTER TABLE spotify_campaigns DROP COLUMN IF EXISTS vendor_id;"
```

## Notes

- The vendor UI already exists in the frontend (`/spotify/playlists` page)
- Vendors are extracted from the "Vendor" column in spotify_campaigns
- Metrics are calculated from actual campaign data
- Frontend will show vendor cards matching the screenshot structure
- The Playlists page shows both vendor cards and playlists table views

