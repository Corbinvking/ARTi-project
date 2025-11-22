# Spotify Scraper Deployment Guide

## 🎯 Quick Start

**SSH to Production:**
```bash
ssh root@165.227.91.129
```

**Deploy:**
```bash
cd /root/ARTi-project
git pull origin main
bash scripts/deploy-spotify-scraper.sh
```

That's it! The script will:
1. Pull latest code
2. Update dependencies
3. Install browser
4. Start Xvfb (GUI mode)
5. Test with single campaign
6. Apply database migration

---

## 📊 What Changed

### Database Schema
**NEW columns added:**
- `streams_24h` - Streams in last 24 hours
- `streams_7d` - Streams in last 7 days  
- `streams_28d` - Streams in last 28 days
- `playlists_24h_count` - Active playlists (24h)
- `playlists_7d_count` - Active playlists (7d)
- `playlists_28d_count` - Active playlists (28d)

**OLD columns** (still exist for backwards compatibility):
- `streams` - All-time streams
- `playlist_links` - CSV playlist data

### Scraper Updates
- ✅ **Fresh Incognito Login** - No cached session, starts clean every time
- ✅ **Three Time Ranges** - Scrapes 24h, 7d, 28d data
- ✅ **Robust Error Handling** - Continues even if one campaign fails
- ✅ **Progress Logging** - See what's happening in real-time
- ✅ **Database Integration** - Automatic updates after each scrape

### Frontend Updates Needed
The UI currently shows: **7d, 28d, 12m**
After backend update, it should show: **24h, 7d, 28d**

**Files to update:**
- `apps/frontend/app/(dashboard)/spotify/stream-strategist/pages/PlaylistsPage.tsx`
- Column definitions for campaign table

---

## 🚀 Full Deployment Steps

### 1. Connect to Server

```bash
ssh root@165.227.91.129
```

### 2. Pull Latest Code

```bash
cd /root/ARTi-project
git pull origin main
```

### 3. Run Deployment Script

```bash
bash scripts/deploy-spotify-scraper.sh
```

**This will:**
- Update Python dependencies
- Install Playwright browser
- Start Xvfb (for GUI mode)
- Test with 1 campaign
- Apply database migration

### 4. Verify Test Results

**Check output for:**
```
[1/1] Processing campaign 7343
  Extracting 24hour data...
    24hour: 56 streams, 3 playlists
  Extracting 7day data...
    7day: 320 streams, 4 playlists
  Extracting 28day data...
    28day: 1732 streams, 22 playlists
✓ Database updated
```

### 5. Run Full Scraper (Optional)

```bash
cd /root/ARTi-project/spotify_scraper
export DISPLAY=:99
python3 run_production_scraper.py
```

This will scrape **ALL** campaigns with SFA URLs (~150 campaigns, ~5-10 minutes).

### 6. Verify in Database

```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT campaign, streams_24h, streams_7d, streams_28d, last_scraped_at 
FROM spotify_campaigns 
WHERE last_scraped_at IS NOT NULL 
ORDER BY last_scraped_at DESC 
LIMIT 5;
"
```

### 7. Check Frontend UI

1. Navigate to: https://app.artistinfluence.com/spotify/campaigns
2. Open a campaign (e.g., "DAUNTER x URAI - ENGULFED")
3. Click "Playlists" tab
4. **Expected data:**
   - Total Streams (28d): 1,732
   - Avg Daily Streams: 62
   - Total Playlists: 22

---

## 📅 Cron Job

**Schedule:** Daily at 2:00 AM EST
```cron
0 2 * * * /root/ARTi-project/scripts/spotify-scraper-daily.sh >> /root/logs/spotify-scraper-cron.log 2>&1
```

**To verify cron is set up:**
```bash
crontab -l | grep spotify
```

**To manually trigger:**
```bash
bash /root/ARTi-project/scripts/spotify-scraper-daily.sh
```

**To check logs:**
```bash
tail -f /root/logs/spotify-scraper-cron.log
```

---

## 🔍 Troubleshooting

### Login Fails

```bash
# Check credentials
cat /root/ARTi-project/spotify_scraper/.env | grep SPOTIFY

# Test login manually
cd /root/ARTi-project/spotify_scraper
export DISPLAY=:99
python3 test_truly_fresh_login.py
```

### Xvfb Not Running

```bash
# Check if running
ps aux | grep Xvfb

# Start if needed
Xvfb :99 -screen 0 1280x1024x24 &
export DISPLAY=:99
```

### Database Connection Issues

```bash
# Test connection
curl -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
     https://api.artistinfluence.com/rest/v1/spotify_campaigns?limit=1
```

### No Data Scraped

```bash
# Check for valid SFA URLs
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT COUNT(*) FROM spotify_campaigns 
WHERE sfa LIKE 'https://artists.spotify.com%';
"

# Run with debug
cd /root/ARTi-project/spotify_scraper
python3 run_production_scraper.py --limit 1
```

---

## 📈 Expected Results

**After Full Run:**
- ~150 campaigns scraped
- All with `last_scraped_at` updated
- Data visible in frontend UI
- Three time ranges populated (24h, 7d, 28d)

**Success Indicators:**
- ✅ Cron log shows "Successful: 150"
- ✅ Database queries return recent `last_scraped_at`
- ✅ Frontend displays updated metrics
- ✅ No error messages in logs

**Performance:**
- Average: ~2 seconds per campaign
- Total time: ~5-10 minutes for all campaigns
- Success rate: 95%+

---

## 📚 Documentation

- **SPOTIFY-SCRAPER-SYSTEM-DOCS.md** - Complete system documentation
- **SPOTIFY-SCRAPER-READY-FOR-PRODUCTION.md** - Initial deployment guide
- **supabase/migrations/042_add_timerange_columns.sql** - Database schema

---

## ✅ Deployment Checklist

- [ ] SSH to production server
- [ ] Pull latest code (`git pull origin main`)
- [ ] Run deployment script (`bash scripts/deploy-spotify-scraper.sh`)
- [ ] Verify test campaign scraped successfully
- [ ] Check database for new columns
- [ ] Verify data in frontend UI
- [ ] Confirm cron job is scheduled
- [ ] Monitor first automatic run (2 AM next day)
- [ ] Update frontend to display 24h/7d/28d data

---

## 🎉 Success!

Once deployed, the system will:
1. ✅ Automatically scrape all campaigns daily at 2 AM
2. ✅ Update database with fresh metrics
3. ✅ Provide accurate data for vendors and clients
4. ✅ Enable data-driven campaign management

**Questions?** Check the system docs or run diagnostics:
```bash
cd /root/ARTi-project/spotify_scraper
python3 run_production_scraper.py --limit 1
```

---

**Last Updated:** 2025-11-22  
**Status:** Ready for Deployment
