# Deploy Campaign Groups to Production

## Overview
This deployment implements the campaign grouping structure in production, matching the local instance.

## Changes Being Deployed
1. ✅ New `campaign_groups` table
2. ✅ New columns on `spotify_campaigns` (campaign_group_id, plays_last_7d, plays_last_3m, plays_last_12m, playlist_adds, saves)
3. ✅ SQL functions for querying campaign groups with songs
4. ✅ Data migration scripts to populate campaign names and group songs
5. ✅ Frontend updates (will auto-deploy via Vercel)

## Step-by-Step Deployment

### Step 1: SSH into Production Server
```bash
ssh root@artistinfluence.com
cd ~/arti-marketing-ops
```

### Step 2: Pull Latest Changes
```bash
git pull origin main
```

### Step 3: Apply Database Migration
```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/028_create_campaign_groups.sql
```

**Expected Output:**
```
CREATE TABLE
ALTER TABLE
ALTER TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
ALTER TABLE
CREATE POLICY
CREATE POLICY
CREATE POLICY
CREATE POLICY
CREATE FUNCTION
CREATE FUNCTION
COMMENT
COMMENT
COMMENT
```

### Step 4: Verify Migration Applied
```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "\d campaign_groups"
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'spotify_campaigns' AND column_name IN ('campaign_group_id', 'plays_last_7d', 'plays_last_3m', 'plays_last_12m', 'playlist_adds', 'saves');"
```

**Expected Output:**
```
Table "public.campaign_groups" exists with all columns
6 new columns exist in spotify_campaigns
```

### Step 5: Populate Campaign Names from CSV
```bash
# First, check if campaign names are already populated
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT COUNT(*) FROM spotify_campaigns WHERE campaign IS NOT NULL AND campaign != '';"

# If count is 0 or low, run the population script
node scripts/populate-campaign-names.js
```

**Expected Output:**
```
✅ Matching complete!
   ✅ Updated: 200-300 campaigns
   ⚠️  No match: 700-1800 (these are ok - they're from other sources or have missing data)
```

### Step 6: Group Songs into Campaigns
```bash
node scripts/group-campaigns.js
```

**Expected Output:**
```
✅ Campaign grouping complete!
   📦 Created 200+ campaign groups
   🔗 Linked 250+ songs to campaigns
```

### Step 7: Verify Campaign Groups
```bash
# Check campaign groups were created
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT COUNT(*) FROM campaign_groups;"

# View sample campaign groups
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT cg.name, c.name as client, cg.total_goal, cg.status, (SELECT COUNT(*) FROM spotify_campaigns sc WHERE sc.campaign_group_id = cg.id) as songs FROM campaign_groups cg LEFT JOIN clients c ON cg.client_id = c.id ORDER BY cg.start_date DESC LIMIT 15;"
```

**Expected Output:**
```
✅ 200+ campaign groups
✅ Sample campaigns showing client names, goals, and song counts
✅ Multi-song campaigns showing song_count > 1
```

### Step 8: Verify Client Emails (from previous deployment)
```bash
# Populate client emails if not already done
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < scripts/populate-client-emails.sql
```

### Step 9: Test Frontend
1. Navigate to https://app.artistinfluence.com/spotify/campaigns
2. Verify campaigns are displayed (not individual songs)
3. Check that metrics show: daily streams, weekly streams, remaining, progress %
4. Click on a client in `/spotify/clients`
5. Verify their campaigns appear grouped correctly

### Step 10: Verify Data Integrity
```bash
# Check that all campaign groups have associated songs
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT cg.id, cg.name, COUNT(sc.id) as song_count FROM campaign_groups cg LEFT JOIN spotify_campaigns sc ON sc.campaign_group_id = cg.id GROUP BY cg.id, cg.name HAVING COUNT(sc.id) = 0;"
```

**Expected Output:**
```
(0 rows)  -- All campaigns should have at least 1 song
```

## Troubleshooting

### Issue: Campaign names not populating
**Solution:**
```bash
# Check if CSV file is accessible
ls -la "Spotify Playlisting-All Campaigns.csv"

# If missing, the CSV might be in a different location
find ~ -name "Spotify Playlisting-All Campaigns.csv"

# Re-run with correct path
node scripts/populate-campaign-names.js
```

### Issue: No campaign groups created
**Solution:**
```bash
# Check if campaign names exist
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT COUNT(*) FROM spotify_campaigns WHERE campaign IS NOT NULL AND campaign != '';"

# If 0, run populate script first, then grouping script
node scripts/populate-campaign-names.js
node scripts/group-campaigns.js
```

### Issue: Frontend shows no campaigns
**Solution:**
```bash
# Check Vercel deployment status
# Ensure the latest commit was deployed
# Check browser console for errors
# Verify database has campaign_groups data
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT COUNT(*) FROM campaign_groups;"
```

## Rollback (if needed)

```bash
# Remove campaign grouping
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
UPDATE spotify_campaigns SET campaign_group_id = NULL;
DROP TABLE IF EXISTS campaign_groups CASCADE;
ALTER TABLE spotify_campaigns DROP COLUMN IF EXISTS plays_last_7d;
ALTER TABLE spotify_campaigns DROP COLUMN IF EXISTS plays_last_3m;
ALTER TABLE spotify_campaigns DROP COLUMN IF EXISTS plays_last_12m;
ALTER TABLE spotify_campaigns DROP COLUMN IF EXISTS playlist_adds;
ALTER TABLE spotify_campaigns DROP COLUMN IF EXISTS saves;
"
```

## Success Criteria

✅ `campaign_groups` table exists with 200+ rows
✅ `spotify_campaigns` has `campaign_group_id` linking to campaigns
✅ Stream analytics columns exist (plays_last_7d, etc.)
✅ Frontend at `/spotify/campaigns` shows grouped campaigns
✅ Client tab shows campaign group counts
✅ Clicking clients shows their campaigns with aggregated metrics
✅ Campaign names appear as "Artist - Song" format
✅ Multi-song campaigns show total metrics across all songs

## Notes

- The grouping script groups by: `client_id`, `campaign name`, `start_date`, `sale_price`
- Songs with the same track going to different vendors are grouped into one campaign
- Total metrics = SUM of all songs' individual metrics
- Progress % = (total_goal - total_remaining) / total_goal × 100
- Some campaigns won't have names from CSV (they're ok - might be from other sources)
- Client emails should also be populated (previous deployment step)

