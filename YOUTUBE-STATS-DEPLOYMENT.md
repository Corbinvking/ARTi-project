# YouTube Stats Fetcher - Production Deployment Guide

## Overview

This guide covers deploying the YouTube stats fetcher to your DigitalOcean droplet and setting up automated daily fetches.

## Prerequisites

- ✅ YouTube Data API v3 enabled in Google Cloud Console
- ✅ API key configured: `AIzaSyCo4D0knKCLCUiUxEl5e4oTwXCAJbEwccg`
- ✅ Backend API routes deployed
- ✅ Production droplet access via SSH

## Step 1: Push Changes to Git

On your local machine:

```bash
cd C:\Users\corbi\OneDrive\Documents\GitHub\ARTi-project

# Add all new files
git add scripts/fetch-youtube-stats-production.js
git add scripts/youtube-stats-cron.sh
git add YOUTUBE-STATS-DEPLOYMENT.md

# Commit
git commit -m "Add YouTube stats fetcher for production with cron job

- Production-ready fetch script with proper error handling
- Cron job wrapper script with logging
- Deployment guide with step-by-step instructions
- Batch processing with rate limiting
- Automatic retry logic"

# Push to main
git push origin main
```

## Step 2: SSH into Production Droplet

```bash
ssh root@artistinfluence.com
# or
ssh root@YOUR_DROPLET_IP
```

## Step 3: Pull Latest Changes

```bash
cd /root/arti-marketing-ops

# Pull latest code
git pull origin main

# Verify new files exist
ls -la scripts/fetch-youtube-stats-production.js
ls -la scripts/youtube-stats-cron.sh
```

## Step 4: Verify YouTube API Key in Production

```bash
# Check if API key is in production.env
cat apps/api/production.env | grep YOUTUBE_API_KEY

# Should output:
# YOUTUBE_API_KEY=AIzaSyCo4D0knKCLCUiUxEl5e4oTwXCAJbEwccg

# If missing, add it:
echo "YOUTUBE_API_KEY=AIzaSyCo4D0knKCLCUiUxEl5e4oTwXCAJbEwccg" >> apps/api/production.env
```

## Step 5: Restart API Container

The API server needs to load the new YouTube API key:

```bash
# Restart the API container to load new env vars
docker-compose restart api

# Verify it's running
docker-compose ps api

# Check logs for any errors
docker-compose logs api | tail -20
```

## Step 6: Make Scripts Executable

```bash
chmod +x scripts/fetch-youtube-stats-production.js
chmod +x scripts/youtube-stats-cron.sh
```

## Step 7: Test the Fetch Script Manually

Run a test fetch to verify everything works:

```bash
# Navigate to project root
cd /root/arti-marketing-ops

# Run the fetch script manually
node scripts/fetch-youtube-stats-production.js

# Expected output:
# 🎬 YouTube Stats Fetcher - Production
# =====================================
# 
# 📡 API URL: http://localhost:3001
# 🗄️  Supabase: http://kong:8000
# 🎯 Specific Org: All orgs
#
# 📊 Fetching all campaigns to find org IDs...
#
# 🏢 Found 1 organization(s): <org-id>
#
# [1/1] Processing org: <org-id>
# ────────────────────────────────────────────────────────────
# 🔄 Fetching stats for org: <org-id>...
# ✅ Updated: 420, Errors: 0, Skipped: 0
#
# 📋 Sample results (first 5):
#   ✓ Campaign Name 1
#     Views: 1,234,567, Likes: 12,345
#   ✓ Campaign Name 2
#     Views: 987,654, Likes: 9,876
#   ...
#
# ============================================================
# ✅ Bulk fetch complete! Duration: 45.2s
# ============================================================
```

### Troubleshooting Manual Test

**If you see "connection refused"**:
```bash
# Check if API is running
docker-compose ps api

# Check API logs
docker-compose logs api | tail -50
```

**If you see "YouTube API error"**:
```bash
# Verify API key is loaded in container
docker exec arti-api env | grep YOUTUBE_API_KEY

# If empty, add to production.env and restart
docker-compose restart api
```

**If you see "no campaigns found"**:
```bash
# Check database for campaigns
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT COUNT(*), COUNT(youtube_url) as with_url
FROM youtube_campaigns;
"
```

## Step 8: Set Up Cron Job

Once manual test succeeds, set up automated daily fetches:

```bash
# Open crontab editor
crontab -e

# Add this line (runs at 8am, 2pm, 8pm daily):
0 8,14,20 * * * /root/arti-marketing-ops/scripts/youtube-stats-cron.sh

# Save and exit (Ctrl+X, then Y, then Enter in nano)
```

### Cron Job Schedule Options

```bash
# Every 6 hours (0:00, 6:00, 12:00, 18:00)
0 */6 * * * /root/arti-marketing-ops/scripts/youtube-stats-cron.sh

# Three times daily (8am, 2pm, 8pm)
0 8,14,20 * * * /root/arti-marketing-ops/scripts/youtube-stats-cron.sh

# Twice daily (9am, 9pm)
0 9,21 * * * /root/arti-marketing-ops/scripts/youtube-stats-cron.sh

# Once daily at 8am
0 8 * * * /root/arti-marketing-ops/scripts/youtube-stats-cron.sh
```

### Verify Cron Job

```bash
# List current cron jobs
crontab -l

# Should show:
# 0 8,14,20 * * * /root/arti-marketing-ops/scripts/youtube-stats-cron.sh
```

## Step 9: Monitor Logs

Check logs to ensure cron job runs successfully:

```bash
# View latest log
tail -f logs/youtube-stats/fetch-*.log | tail -100

# List all logs
ls -lh logs/youtube-stats/

# View specific log
cat logs/youtube-stats/fetch-20251117-080001.log
```

## Step 10: Verify Data in Database

After the first successful run, verify data is populated:

```bash
# Check campaign stats
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  campaign_name,
  current_views,
  current_likes,
  current_comments,
  last_youtube_api_fetch
FROM youtube_campaigns
WHERE last_youtube_api_fetch IS NOT NULL
ORDER BY last_youtube_api_fetch DESC
LIMIT 10;
"

# Check total updated campaigns
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  COUNT(*) as total_campaigns,
  COUNT(current_views) as with_views,
  COUNT(last_youtube_api_fetch) as recently_fetched,
  MAX(last_youtube_api_fetch) as last_fetch_time
FROM youtube_campaigns;
"
```

## Step 11: Check Frontend

After data is populated, verify it shows in the UI:

1. **Go to**: https://app.artistinfluence.com/youtube/campaigns
2. **Check**:
   - View count bar shows current/goal progress
   - Likes and comments columns populated
   - Client campaigns show view counts
   - Last updated timestamp displayed

If data doesn't show, hard refresh the page (Ctrl+Shift+R).

## Manual Fetch Commands

### Fetch All Campaigns

```bash
cd /root/arti-marketing-ops
node scripts/fetch-youtube-stats-production.js
```

### Fetch for Specific Org

```bash
node scripts/fetch-youtube-stats-production.js --org-id=YOUR_ORG_ID
```

### Force Update Now (bypass cron schedule)

```bash
/root/arti-marketing-ops/scripts/youtube-stats-cron.sh
```

## Quota Management

### Check Current Usage

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" → "Dashboard"
3. Click "YouTube Data API v3"
4. View "Queries per day" chart

### Quota Limits

- **Free Tier**: 10,000 units/day
- **Per Bulk Fetch**: ~9 units for 420 campaigns
- **3x Daily**: 27 units/day (0.27% of quota)
- **Remaining**: 9,973 units for manual refreshes

### If Quota Exceeded

```bash
# Reduce cron frequency to 1x daily
crontab -e
# Change to: 0 8 * * * /root/arti-marketing-ops/scripts/youtube-stats-cron.sh

# Or request quota increase from Google
```

## Maintenance

### View Recent Logs

```bash
# Last 3 fetch logs
ls -lt logs/youtube-stats/ | head -4

# View last log
cat $(ls -t logs/youtube-stats/fetch-*.log | head -1)
```

### Clean Old Logs Manually

```bash
# Remove logs older than 30 days (automatic in cron script)
find logs/youtube-stats -name "fetch-*.log" -mtime +30 -delete
```

### Disable Cron Job Temporarily

```bash
# Comment out the line
crontab -e
# Add # at start of line:
# 0 8,14,20 * * * /root/arti-marketing-ops/scripts/youtube-stats-cron.sh
```

### Update Script After Changes

```bash
cd /root/arti-marketing-ops
git pull origin main
# Changes take effect on next cron run
```

## Troubleshooting

### Problem: Cron job not running

**Check cron service**:
```bash
systemctl status cron
# or
service cron status

# Restart if needed
service cron restart
```

**Check cron logs**:
```bash
grep CRON /var/log/syslog | tail -20
```

### Problem: Script runs but no updates

**Check API endpoint**:
```bash
curl http://localhost:3001/api/youtube-data-api/extract-video-id?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ

# Should return: {"videoId":"dQw4w9WgXcQ"}
```

**Check database connection**:
```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT COUNT(*) FROM youtube_campaigns;"
```

### Problem: High error rate

**Check specific errors in logs**:
```bash
grep "❌" logs/youtube-stats/fetch-*.log | tail -20
```

**Common issues**:
- Invalid YouTube URLs → Update campaign youtube_url
- Private videos → Cannot fetch stats
- Deleted videos → Mark campaign as inactive
- API quota exceeded → Reduce fetch frequency

## Success Criteria

After deployment, you should have:

- ✅ Cron job running 3x daily (8am, 2pm, 8pm)
- ✅ Logs showing successful fetches
- ✅ Database populated with views, likes, comments
- ✅ Frontend displaying all stats correctly
- ✅ Last updated timestamps showing
- ✅ Progress bars showing current/goal percentages

## Next Steps

1. **Monitor first few cron runs** to ensure stability
2. **Check quota usage** after 24 hours
3. **Adjust frequency** if needed based on needs/quota
4. **Set up alerting** if errors exceed threshold (optional)

## Support

If issues persist after following this guide:

1. Check logs: `tail -100 logs/youtube-stats/fetch-*.log`
2. Verify API key: `docker exec arti-api env | grep YOUTUBE_API_KEY`
3. Test manual fetch: `node scripts/fetch-youtube-stats-production.js`
4. Check API logs: `docker-compose logs api | tail -100`

---

**Deployment Date**: 2025-11-17  
**Status**: Ready for production  
**Estimated Setup Time**: 15 minutes

