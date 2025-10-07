# 🚀 Final Production Fix - Stream Strategist Campaigns

## ⚠️ Issue
- **Migration 018** added `daily_streams` column to `stream_strategist_campaigns`
- **Migration 019** created `campaigns` view pointing to `stream_strategist_campaigns`
- **Problem**: View was created BEFORE migration 018, so it doesn't include the new columns
- **Result**: Sync script fails with "Could not find the 'daily_streams' column of 'campaigns' in the schema cache"

## ✅ Solution
Apply Migration 020 to refresh the view and pick up the new columns.

---

## 🔧 Quick Fix (Run on Droplet)

```bash
# 1. SSH into droplet
ssh root@164.90.129.146

# 2. Navigate to project
cd /root/arti-marketing-ops

# 3. Pull latest changes (includes migration 020)
git pull origin main

# 4. Apply migration 020 to refresh the campaigns view
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/020_refresh_campaigns_view.sql

# 5. Set production environment variables
export SUPABASE_URL="https://api.artistinfluence.com"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

# 6. Run sync script to load campaign data
node scripts/sync-spotify-campaigns-to-stream-strategist.js --production

# 7. Verify campaigns were synced
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT COUNT(*) as total_campaigns FROM campaigns WHERE source = 'artist_influence_spotify_campaigns';"

# 8. View sample campaigns
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT name, stream_goal, status, daily_streams, weekly_streams FROM campaigns WHERE source = 'artist_influence_spotify_campaigns' LIMIT 5;"
```

---

## 📋 What This Does

### Migration 020: Refresh Campaigns View
- Drops the existing `campaigns` view
- Recreates it to pick up ALL columns from `stream_strategist_campaigns`
- Includes the new columns added in Migration 018:
  - `daily_streams`
  - `weekly_streams`
  - `radio_streams`
  - `discover_weekly_streams`
  - `external_streaming_data`

### Sync Script
- Reads 902 campaigns from `spotify_campaigns` (Airtable import)
- Transforms data to Stream Strategist format
- Inserts campaigns into `campaigns` view (which writes to `stream_strategist_campaigns`)
- Sets `source = 'artist_influence_spotify_campaigns'`
- Sets `campaign_type = 'artist_influence_spotify_promotion'`

---

## ✅ Expected Results

After running these commands, you should see:

```
🔄 Syncing Spotify Campaigns to Stream Strategist Schema
📍 Environment: Production
✅ Using organization: Acme Music Label
📥 Fetching spotify campaigns from Airtable table...
📊 Found 902 spotify campaigns
🧹 Clearing existing campaigns...
✅ Campaign 1/902 synced successfully
✅ Campaign 2/902 synced successfully
...
📈 Sync Summary:
✅ Successfully synced: 902 campaigns
❌ Failed: 0 campaigns
```

Then verify:
```
 total_campaigns 
-----------------
             902
```

---

## 🎯 Production Frontend

After sync completes:
- Visit https://app.artistinfluence.com/spotify
- Log in as admin/manager
- Navigate to "Campaigns" tab
- **You should see 902+ campaigns** from Airtable
- No more 400 Bad Request errors
- No more "No campaigns found" message

---

## 📊 Migration Order Summary

1. **015**: Base Stream Strategist tables
2. **017**: Extended Stream Strategist schema (33 tables)
3. **018**: Add missing columns to `stream_strategist_campaigns`
4. **019**: Create `campaigns` view (initially without new columns)
5. **020**: **Refresh `campaigns` view** to include new columns ← **YOU ARE HERE**

---

## 🔍 Troubleshooting

### If sync still fails:
```bash
# Check if view has daily_streams column
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'campaigns' ORDER BY ordinal_position;"
```

### If view doesn't have daily_streams:
```bash
# Manually recreate view
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "DROP VIEW IF EXISTS public.campaigns CASCADE; CREATE VIEW public.campaigns AS SELECT * FROM public.stream_strategist_campaigns; GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated; GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO service_role;"
```

---

## 🎉 Success Criteria

✅ Migration 020 applied without errors  
✅ Sync script completes with 902 successful syncs  
✅ Production database shows 902 campaigns  
✅ Frontend at https://app.artistinfluence.com/spotify shows campaigns  
✅ No more 400 Bad Request errors  
✅ Campaign filtering and display works correctly  

---

**This is the final fix!** After applying Migration 020 and running the sync, your production environment will be fully operational.

