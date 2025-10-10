# 🚨 URGENT: Fix Production Campaign Data

## Problem Identified
Production shows "No campaigns found" because:
1. **400 Bad Request** on campaigns API endpoint
2. Migrations 018 & 019 not applied to production
3. Campaigns view not created in production database

## 🔧 Quick Fix Commands

SSH into your droplet and run these commands:

```bash
# 1. SSH into droplet
ssh root@164.90.129.146

# 2. Navigate to project
cd /root/arti-marketing-ops

# 3. Pull latest changes (includes migrations 018 & 019)
git pull origin main

# 4. Apply missing column migration (018)
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/018_add_missing_stream_strategist_columns.sql

# 5. Create campaigns view (019) - CRITICAL FIX
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/019_create_campaigns_view.sql

# 6. Sync campaign data
node scripts/sync-spotify-campaigns-to-stream-strategist.js --production

# 7. Verify the fix worked
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT COUNT(*) as total_campaigns FROM campaigns WHERE source = 'artist_influence_spotify_campaigns';"

# 8. Check campaigns view exists
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT table_name FROM information_schema.tables WHERE table_name = 'campaigns';"
```

## ✅ Expected Results

After running these commands:
- ✅ Migration 018: `ALTER TABLE` confirmations
- ✅ Migration 019: `DROP TABLE` and `CREATE VIEW` confirmations  
- ✅ Sync: `Successfully synced: 2149 campaigns`
- ✅ Verification: Campaign count matches expected number
- ✅ View check: Shows `campaigns` as a view

## 🎯 Success Indicators

- ✅ `Successfully synced: 2149 campaigns`
- ✅ `Failed: 0 campaigns`
- ✅ Campaign count shows 2149+ campaigns
- ✅ `campaigns` appears as a view in database
- ✅ Frontend shows campaigns instead of "No campaigns found"

## 🚨 If Commands Fail

### Issue: "No such file or directory"
```bash
# Check if migrations exist
ls -la supabase/migrations/018_*
ls -la supabase/migrations/019_*
```

### Issue: "Permission denied"
```bash
# Check Docker is running
docker ps
```

### Issue: "Node command not found"
```bash
# Check Node.js is installed
node --version
# If not installed, run sync locally with production credentials
```

## 🔄 Alternative: Run Sync Locally for Production

If Node.js isn't available on droplet:

```bash
# On your local machine, set production environment variables:
export SUPABASE_URL="your-production-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-production-service-role-key"

# Run sync locally for production
node scripts/sync-spotify-campaigns-to-stream-strategist.js --production
```

## 📊 After Fix

1. **Refresh browser** on production site
2. **Navigate to Spotify tab** → Campaigns
3. **Should see 2149+ campaigns** instead of "No campaigns found"
4. **Test filtering and search** functionality

---

**The 400 Bad Request error will be fixed once the campaigns view is created in production!** 🚀
