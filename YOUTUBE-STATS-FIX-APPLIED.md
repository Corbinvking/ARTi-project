# YouTube Stats Fetcher - Fix Applied ✅

## Problem Identified

The script was trying to connect to `kong:8000` which is the **internal Docker network** hostname. Since the script runs on the host machine (not inside Docker), it couldn't resolve that hostname.

**Error**: `getaddrinfo EAI_AGAIN kong`

## Fix Applied

Changed the script to use **external URLs** instead:
- ❌ Old: `http://kong:8000` (Docker internal)
- ✅ New: `https://api.artistinfluence.com` (external)

- ❌ Old: `http://localhost:3001` (local)
- ✅ New: `https://api.artistinfluence.com` (production)

## Run This On Your Droplet

You're already SSH'd in, so just:

```bash
# 1. Pull the fix
cd /root/arti-marketing-ops
git pull origin main

# You should see:
# scripts/fetch-youtube-stats-production.js updated

# 2. Re-run the fetch script
node scripts/fetch-youtube-stats-production.js
```

## What You Should See Now

```
🎬 YouTube Stats Fetcher - Production
=====================================

📡 API URL: https://api.artistinfluence.com
🗄️  Supabase: https://api.artistinfluence.com
🎯 Specific Org: All orgs

📊 Fetching all campaigns to find org IDs...

🏢 Found 1 organization(s): <your-org-id>

[1/1] Processing org: <your-org-id>
────────────────────────────────────────────────────────────
🔄 Fetching stats for org: <your-org-id>...
✅ Updated: 420, Errors: 0, Skipped: 0

📋 Sample results (first 5):
  ✓ Campaign Name 1
    Views: 1,234,567, Likes: 12,345
  ✓ Campaign Name 2
    Views: 987,654, Likes: 9,876
  ...

============================================================
✅ Bulk fetch complete! Duration: 45.2s
============================================================
```

## If You Still See Errors

### Error: "Cannot connect to API"

Check if the API is accessible:
```bash
curl https://api.artistinfluence.com/api/youtube-data-api/extract-video-id?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ

# Should return: {"videoId":"dQw4w9WgXcQ"}
```

### Error: "Unauthorized" or "Invalid API key"

The YouTube API key might not be loaded in the API container. Skip restarting the container for now - the script loads the env vars directly from the file, which already has the key.

### Error: "No campaigns found"

Check database:
```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT COUNT(*) as total, COUNT(youtube_url) as with_url 
FROM youtube_campaigns;
"
```

## After Successful Fetch

1. **Verify database has data**:
```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT COUNT(*) as with_views, MAX(last_youtube_api_fetch) as last_fetch 
FROM youtube_campaigns WHERE current_views IS NOT NULL;
"
```

2. **Check frontend**: 
   - Go to https://app.artistinfluence.com/youtube/campaigns
   - Hard refresh: Ctrl+Shift+R
   - Should see all data populated!

3. **Set up cron job** (if fetch succeeded):
```bash
crontab -e
# Add: 0 8,14,20 * * * /root/arti-marketing-ops/scripts/youtube-stats-cron.sh
```

## What Changed in the Fix

### Before (Broken)
```javascript
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://kong:8000';
const API_URL = 'http://localhost:3001';
```

### After (Fixed)
```javascript
const SUPABASE_URL = 'https://api.artistinfluence.com';
const API_URL = 'https://api.artistinfluence.com';
```

The script now uses your production API endpoints that are publicly accessible, instead of trying to reach Docker internal networks.

---

**Status**: Fix committed and pushed ✅  
**Action**: Pull and re-run on droplet  
**ETA**: 2 minutes

