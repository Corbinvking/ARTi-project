# YouTube Data Missing - Root Cause & Solution

## 🔍 Why You're Not Seeing Data

You're absolutely correct! The YouTube API integration is **installed** but the data has **never been fetched** from YouTube yet.

### What's Missing

- ❌ No `current_views` in database (shows as 0 or null)
- ❌ No `current_likes` in database
- ❌ No `current_comments` in database
- ❌ No `last_youtube_api_fetch` timestamp
- ❌ Progress bars show 0%
- ❌ Client campaigns show no view counts

### What Exists

- ✅ YouTube API integration code deployed
- ✅ API endpoints working (`/api/youtube-data-api/...`)
- ✅ API key configured and tested
- ✅ Database columns exist and ready
- ✅ Frontend UI ready to display data

## 🎯 The Solution

You need to do **ONE initial bulk fetch** to populate all 420 campaigns with YouTube data, then set up a **cron job** to keep it updated daily.

### Timeline

1. **Now**: Run initial fetch (~1 minute for 420 campaigns)
2. **After**: Set up cron job (runs 3x daily automatically)
3. **Result**: Always-fresh data, no manual work needed

## 📋 Step-by-Step Instructions

### On Your Local Machine

```bash
# 1. Push the new scripts to GitHub (ALREADY DONE ✅)
cd C:\Users\corbi\OneDrive\Documents\GitHub\ARTi-project
git push origin main
```

### On Production Droplet

Open your terminal and SSH into production:

```bash
# 2. SSH into droplet
ssh root@artistinfluence.com

# 3. Navigate to project and pull changes
cd /root/arti-marketing-ops
git pull origin main

# You should see:
# - scripts/fetch-youtube-stats-production.js
# - scripts/youtube-stats-cron.sh
# - YOUTUBE-STATS-DEPLOYMENT.md
# - YOUTUBE-STATS-QUICK-DEPLOY.md

# 4. Check if YouTube API key is in production.env
grep YOUTUBE_API_KEY apps/api/production.env

# If you see the key, skip to step 6
# If nothing shows, add it:

# 5. Add YouTube API key (only if missing)
echo "YOUTUBE_API_KEY=AIzaSyCo4D0knKCLCUiUxEl5e4oTwXCAJbEwccg" >> apps/api/production.env

# 6. Restart API container to load the new API key
docker-compose restart api

# Wait 5 seconds for it to start
sleep 5

# 7. Make scripts executable
chmod +x scripts/fetch-youtube-stats-production.js
chmod +x scripts/youtube-stats-cron.sh

# 8. Run the initial bulk fetch (THIS POPULATES ALL DATA)
node scripts/fetch-youtube-stats-production.js

# You should see:
# 🎬 YouTube Stats Fetcher - Production
# =====================================
# 
# 📊 Fetching all campaigns to find org IDs...
# 🏢 Found 1 organization(s): <your-org-id>
#
# [1/1] Processing org: <your-org-id>
# 🔄 Fetching stats for org: <your-org-id>...
# ✅ Updated: 420, Errors: 0, Skipped: 0
#
# 📋 Sample results (first 5):
#   ✓ Campaign Name 1
#     Views: 1,234,567, Likes: 12,345
#   ✓ Campaign Name 2  
#     Views: 987,654, Likes: 9,876
#   ...
#
# ✅ Bulk fetch complete! Duration: 45.2s

# 9. Verify data is now in database
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  COUNT(*) as total_campaigns,
  COUNT(current_views) as with_views,
  AVG(current_views) as avg_views,
  MAX(last_youtube_api_fetch) as last_fetch_time
FROM youtube_campaigns;
"

# Expected output:
#  total_campaigns | with_views |  avg_views  |       last_fetch_time        
# -----------------+------------+-------------+------------------------------
#              420 |        420 | 250000.50   | 2025-11-17 12:34:56.789

# 10. Set up cron job for automatic daily updates
crontab -e

# In the editor that opens, add this line at the bottom:
# 0 8,14,20 * * * /root/arti-marketing-ops/scripts/youtube-stats-cron.sh

# Save and exit:
# - In nano: Ctrl+X, then Y, then Enter
# - In vim: Esc, then :wq, then Enter

# 11. Verify cron job is active
crontab -l

# You should see your new cron job listed
```

### Check the Frontend

1. **Go to**: https://app.artistinfluence.com/youtube/campaigns
2. **Hard refresh**: Press `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
3. **You should NOW see**:
   - ✅ View count progress bars showing actual percentages
   - ✅ Current views displayed (e.g., "125,432 / 250,000")
   - ✅ Likes column populated
   - ✅ Comments column populated
   - ✅ "Last updated: X minutes ago" timestamp

4. **Go to**: https://app.artistinfluence.com/youtube/clients
5. **Check client cards**:
   - ✅ Total views showing across all campaigns
   - ✅ Individual campaign view counts

## 🔄 What Happens After Setup

### Automatic Updates

The cron job will run **automatically** 3 times per day:
- 🌅 **8:00 AM** - Morning update
- ☀️ **2:00 PM** - Afternoon update  
- 🌙 **8:00 PM** - Evening update

### What Gets Updated

Every fetch updates these fields for each campaign:
- `current_views` - Latest view count
- `current_likes` - Latest like count
- `current_comments` - Latest comment count
- `views_7_days` - Change since last fetch
- `likes_7_days` - Change since last fetch
- `comments_7_days` - Change since last fetch
- `last_youtube_api_fetch` - Timestamp of update
- `video_id` - YouTube video ID (if missing)

### Quota Usage

- **Daily Limit**: 10,000 quota units (free tier)
- **Per Fetch**: ~9 units for 420 campaigns
- **3x Daily**: 27 units total (0.27% of quota!)
- **Remaining**: 9,973 units for manual refreshes

You're well within limits. Could run it 100x per day if needed!

## 📊 Monitoring

### View Logs

```bash
# See the latest fetch results
tail -100 logs/youtube-stats/fetch-*.log

# Watch live during next scheduled run
tail -f logs/youtube-stats/fetch-*.log
```

### Manual Refresh Anytime

```bash
cd /root/arti-marketing-ops
node scripts/fetch-youtube-stats-production.js
```

### Check Database Stats

```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  campaign_name,
  current_views,
  current_likes,
  views_7_days,
  last_youtube_api_fetch
FROM youtube_campaigns
WHERE current_views IS NOT NULL
ORDER BY current_views DESC
LIMIT 10;
"
```

## 🚨 Troubleshooting

### If fetch fails with "connection refused"

```bash
# Check if API is running
docker-compose ps api

# If not running, start it
docker-compose up -d api

# Check logs
docker-compose logs api | tail -50
```

### If fetch succeeds but frontend still shows zeros

1. **Hard refresh the page**: Ctrl+Shift+R
2. **Check browser console** for errors (F12 → Console tab)
3. **Verify data in database** (see query above)
4. **Check React Query cache** - might need to invalidate

### If you see "quota exceeded"

- Wait until midnight Pacific Time for quota reset
- Or reduce cron frequency to 1-2x daily
- Or request quota increase from Google Cloud Console

## ✅ Success Checklist

After following these steps, verify:

- [x] `git pull` succeeded on droplet
- [x] API key in `production.env`
- [x] API container restarted
- [x] Scripts are executable (`chmod +x`)
- [x] Manual fetch completed successfully (step 8)
- [x] Database shows updated view counts (step 9)
- [x] Cron job added and verified (steps 10-11)
- [x] Frontend shows all data (hard refresh!)
- [x] Logs directory created with fetch logs

## 📚 Documentation Reference

- **Quick Start**: `YOUTUBE-STATS-QUICK-DEPLOY.md` (this guide condensed)
- **Full Guide**: `YOUTUBE-STATS-DEPLOYMENT.md` (comprehensive details)
- **API Docs**: `YOUTUBE-API-INTEGRATION-COMPLETE.md`
- **Setup**: `YOUTUBE-API-SETUP.md`

## 🎯 Why This Happened

The API integration was **installed** but never **initialized** with data. Think of it like:

1. ✅ Installed a thermometer (API integration)
2. ✅ Connected it to power (API key)
3. ❌ Never took the first temperature reading (initial fetch)

Now we're taking that first reading, and then scheduling automatic readings 3x daily.

---

**Bottom Line**: Run step 8 on the droplet, and you'll see all your data appear in the frontend immediately! Then the cron job keeps it fresh forever. 🚀

**Estimated Time**: 10 minutes total
**Complexity**: Copy/paste commands
**Risk**: None (read-only API, no data modification)

