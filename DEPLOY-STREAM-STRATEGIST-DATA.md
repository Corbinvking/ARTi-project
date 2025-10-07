# Deploy Stream Strategist Data Integration to Production

## 🚀 Quick Production Deployment Commands

Copy and paste these commands into your droplet SSH session:

```bash
# 1. SSH into droplet
ssh root@164.90.129.146

# 2. Navigate to project
cd /root/arti-marketing-ops

# 3. Pull latest changes
git pull origin main

# 4. Apply missing column migration
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/018_add_missing_stream_strategist_columns.sql

# 5. Create campaigns view (connects frontend to data)
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/019_create_campaigns_view.sql

# 6. Sync campaign data (1000+ campaigns)
node scripts/sync-spotify-campaigns-to-stream-strategist.js --production

# 7. Verify the sync worked
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT COUNT(*) as total_campaigns FROM campaigns WHERE source = 'artist_influence_spotify_campaigns';"

# 8. Check sample campaigns
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT name, stream_goal, status FROM campaigns WHERE source = 'artist_influence_spotify_campaigns' LIMIT 5;"
```

## ✅ Expected Results

After running these commands, you should see:

1. **Migration 018**: `ALTER TABLE` confirmations
2. **Migration 019**: `DROP TABLE` and `CREATE VIEW` confirmations
3. **Sync Script**: Progress updates every 100 campaigns
4. **Final Count**: Should match your spotify_campaigns count (~2,149 campaigns)
5. **Sample Data**: 5 campaigns with names, goals, and statuses

## 🎯 Success Indicators

- ✅ `Successfully synced: 2149 campaigns`
- ✅ `Failed: 0 campaigns`
- ✅ Campaign count matches expected number
- ✅ Sample campaigns display correctly

## 🔧 If You Encounter Issues

### Issue: "No organization found"
```bash
# Check orgs exist
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT id, name FROM orgs;"
```

### Issue: "Permission denied"
```bash
# Verify you're using service role key
echo $SUPABASE_SERVICE_ROLE_KEY
```

### Issue: "Column not found"
```bash
# Re-run migrations 018 and 019
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/018_add_missing_stream_strategist_columns.sql
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/019_create_campaigns_view.sql
```

## 📊 After Deployment

1. **Test Frontend**: Visit your production URL and navigate to Spotify tab
2. **Check Campaigns**: Verify campaigns load in the Campaigns section
3. **Test Filtering**: Try filtering by status, client, or salesperson
4. **Verify Data**: Click a campaign to see full details

## 🔄 For Future Updates

To re-sync data after Airtable updates:

```bash
# On droplet
cd /root/arti-marketing-ops
node scripts/sync-spotify-campaigns-to-stream-strategist.js --production
```

**Note**: The sync script clears existing `stream_strategist_campaigns` data before syncing, so it's safe to run multiple times.

---

## 📝 What's Happening

1. **Migration 018**: Adds missing columns (`daily_streams`, `weekly_streams`, etc.) to the `stream_strategist_campaigns` table
2. **Sync Script**: Transforms and migrates data from `spotify_campaigns` to `stream_strategist_campaigns` with proper formatting and validation
3. **Data Mapping**: Maps Airtable fields to Stream Strategist schema with intelligent parsing of numeric and date fields

---

**Ready to deploy? Run the commands above!** 🚀
