# ✅ Production Cron Job - COMPLETE

**Date**: November 17, 2025  
**Status**: READY FOR DEPLOYMENT 🚀

---

## 🎯 What Was Built

A **fully autonomous** Spotify for Artists scraper that:

1. ✅ **Connects to production database**
2. ✅ **Queries all campaigns** with SFA links automatically  
3. ✅ **Scrapes stream data** (24h + 7d) from playlists
4. ✅ **Updates database** with latest counts
5. ✅ **Runs headless** on your droplet (no GUI needed)
6. ✅ **Logs everything** for monitoring
7. ✅ **Auto-adds new campaigns** - just add SFA link to database!

---

## 📊 How It Works

### Workflow:

```
1. Cron job triggers (every 6 hours)
   ↓
2. Script connects to Supabase production database
   ↓
3. Queries: SELECT * FROM spotify_campaigns WHERE sfa IS NOT NULL
   ↓
4. For each campaign:
   - Navigate to SFA URL (converts /stats → /playlists)
   - Switch time range to 7day
   - Scrape playlist data (name, curator, streams per playlist)
   - Switch time range to 24hour
   - Scrape playlist data
   - Calculate totals
   ↓
5. Update database with:
   - streams_24h (total streams across all playlists)
   - streams_7d (total streams across all playlists)
   - playlists_24h_count (how many playlists active)
   - playlists_7d_count (how many playlists active)
   - last_scraped_at (timestamp)
   - scrape_data (full JSON for debugging)
   ↓
6. Log results and exit
```

---

## 🗄️ Database Schema

### New Columns Added to `spotify_campaigns`:

```sql
-- Migration: 042_add_scraper_data_columns.sql

streams_24h INTEGER           -- Total streams from playlists (24h)
streams_7d INTEGER            -- Total streams from playlists (7d)
playlists_24h_count INTEGER   -- Number of active playlists (24h)
playlists_7d_count INTEGER    -- Number of active playlists (7d)
last_scraped_at TIMESTAMPTZ   -- When was this campaign last scraped
scrape_data JSONB             -- Full scrape results (for debugging)
```

### Indexes Created:

```sql
-- Query campaigns by last scraped time
CREATE INDEX idx_spotify_campaigns_last_scraped ON spotify_campaigns(last_scraped_at DESC NULLS LAST);

-- Query campaigns with SFA links
CREATE INDEX idx_spotify_campaigns_sfa ON spotify_campaigns(sfa) WHERE sfa IS NOT NULL;
```

---

## 📂 Files Created

### Core Scripts:

| File | Purpose |
|------|---------|
| `run_production_scraper.py` | Main production scraper (queries DB, scrapes all campaigns) |
| `run_production_cron.sh` | Shell wrapper for cron job |
| `.gitignore` | Excludes browser session data, logs, env files |
| `production.env.example` | Example production environment config |

### Migrations:

| File | Purpose |
|------|---------|
| `supabase/migrations/042_add_scraper_data_columns.sql` | Adds stream data columns to spotify_campaigns |

### Documentation:

| File | Purpose |
|------|---------|
| `PRODUCTION-DEPLOYMENT.md` | Complete deployment guide with step-by-step instructions |
| `AUTO-LOGIN-COMPLETE.md` | Auto-login implementation details |
| `PRODUCTION-CRON-COMPLETE.md` | This file - implementation summary |

---

## 🚀 Deployment Steps (Quick Reference)

### 1. Apply Database Migration

```bash
# On your local machine (or wherever you manage migrations):
cd /path/to/ARTi-project
npx supabase migration up --db-url "postgresql://postgres:your_password@db.artistinfluence.com:5432/postgres"
```

### 2. Deploy to Droplet

SSH to your production droplet and run:

```bash
# Install dependencies
apt update && apt install -y python3 python3-pip git
apt install -y libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0

# Clone/update repo
cd /root
git clone https://github.com/your-org/ARTi-project.git   # or git pull if exists
cd ARTi-project/spotify_scraper

# Install Python packages
pip3 install -r requirements.txt
python3 -m playwright install chromium

# Configure environment
cp production.env.example .env
nano .env  # Add your credentials

# Transfer browser session (or login manually)
# From local machine:
scp -r data/browser_data root@your-droplet-ip:/root/ARTi-project/spotify_scraper/data/

# Test the scraper
python3 run_production_scraper.py
```

### 3. Set Up Cron Job

```bash
# Make shell script executable
chmod +x /root/ARTi-project/spotify_scraper/run_production_cron.sh

# Add to crontab
crontab -e

# Add this line (runs every 6 hours):
0 */6 * * * /root/ARTi-project/spotify_scraper/run_production_cron.sh >> /root/ARTi-project/spotify_scraper/logs/cron.log 2>&1
```

### 4. Done!

The scraper will now run automatically every 6 hours.

---

## 📈 Example Output

```
================================================================================
PRODUCTION SPOTIFY FOR ARTISTS SCRAPER
Started at: 2025-11-17 18:30:00
================================================================================
INFO - Fetching active campaigns with SFA links from database...
INFO - Found 25 active campaigns with SFA links
INFO - Processing 25 campaigns...
INFO - Verifying Spotify for Artists login...
INFO - ✓ Login verified!

[1/25] Processing campaign 123...
INFO - Scraping campaign 123: CHAIN SMOKER (Epic Campaign)
INFO -   URL: https://artists.spotify.com/c/artist/.../song/.../stats
INFO -   ✓ Successfully scraped campaign 123
INFO -     24hour: 4 playlists, 37 total streams
INFO -     7day: 11 playlists, 468 total streams
INFO - Updating database for campaign 123...
INFO -   ✓ Database updated for campaign 123

[2/25] Processing campaign 124...
INFO - Scraping campaign 124: Another Song (Cool Campaign)
INFO -   URL: https://artists.spotify.com/c/artist/.../song/.../stats
INFO -   ✓ Successfully scraped campaign 124
INFO -     24hour: 2 playlists, 15 total streams
INFO -     7day: 8 playlists, 234 total streams
INFO - Updating database for campaign 124...
INFO -   ✓ Database updated for campaign 124

...

================================================================================
SCRAPING COMPLETE
Finished at: 2025-11-17 18:45:00
Results:
  ✓ Successful: 24
  ✗ Failed: 1
  Total: 25
================================================================================
```

---

## 🔍 Monitoring

### View Logs

```bash
# View today's scraper log
tail -f /root/ARTi-project/spotify_scraper/logs/production_scraper_$(date +%Y%m%d).log

# View cron job log
tail -f /root/ARTi-project/spotify_scraper/logs/cron.log

# Check for errors
grep ERROR /root/ARTi-project/spotify_scraper/logs/*.log
```

### Check Database

```sql
-- View recently scraped campaigns
SELECT 
    id, 
    campaign, 
    track_name,
    streams_24h,
    streams_7d,
    playlists_24h_count,
    playlists_7d_count,
    last_scraped_at
FROM spotify_campaigns
WHERE last_scraped_at IS NOT NULL
ORDER BY last_scraped_at DESC
LIMIT 10;

-- Check campaigns that need scraping
SELECT COUNT(*) 
FROM spotify_campaigns 
WHERE sfa IS NOT NULL 
  AND (last_scraped_at IS NULL OR last_scraped_at < NOW() - INTERVAL '6 hours');
```

---

## ✨ Key Features

### 1. **Zero Manual Intervention**
- Fully automated login (session persistence)
- Auto-discovers campaigns from database
- Updates database automatically
- Logs everything for monitoring

### 2. **Dynamic Campaign Queue**
To add a new campaign to the scraping queue:
```sql
UPDATE spotify_campaigns 
SET sfa = 'https://artists.spotify.com/c/artist/XXX/song/YYY/stats'
WHERE id = YOUR_CAMPAIGN_ID;
```
Next cron run will automatically pick it up!

### 3. **Robust Error Handling**
- Logs all errors with stack traces
- Continues processing if one campaign fails
- Saves artifacts (screenshots) on errors
- Summary report at end of each run

### 4. **Performance Optimized**
- 2-second delay between campaigns (avoid rate limiting)
- Headless mode (minimal resource usage)
- Efficient database queries with indexes
- Browser session reuse (no re-login)

---

## 🎉 Benefits

### Before:
- ❌ Manual data entry
- ❌ Outdated stream counts
- ❌ No historical tracking
- ❌ Time-consuming updates

### After:
- ✅ **Automated data collection**
- ✅ **Fresh data every 6 hours** (4x per day!)
- ✅ **Historical tracking** (timestamps + JSON archive)
- ✅ **Zero human effort** (just add SFA links to database)

---

## 📞 Support

### Common Issues:

**Issue**: Scraper not finding campaigns  
**Solution**: Check `sfa` column is populated in database

**Issue**: Login fails  
**Solution**: Transfer browser session from local machine

**Issue**: Cron not running  
**Solution**: Check cron service: `systemctl status cron`

**Issue**: Database connection fails  
**Solution**: Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`

---

## 🎯 Success Metrics

Once deployed, you can track:
- **Total campaigns monitored**: `SELECT COUNT(*) FROM spotify_campaigns WHERE sfa IS NOT NULL`
- **Last run time**: Check `last_scraped_at` timestamps
- **Success rate**: Check logs for ✓/✗ counts
- **Data freshness**: `SELECT MAX(last_scraped_at) FROM spotify_campaigns`

---

## 📋 Deployment Checklist

Before going live:

- [ ] Database migration applied
- [ ] Scraper code deployed to droplet
- [ ] Python dependencies installed
- [ ] Playwright browsers installed
- [ ] `.env` file configured
- [ ] Browser session transferred
- [ ] Test run completed successfully
- [ ] Cron job added and verified
- [ ] Log directory exists and writable
- [ ] Monitoring set up (log rotation, alerts)

---

## 🚀 Next Steps

1. **Deploy to production** using `PRODUCTION-DEPLOYMENT.md`
2. **Run first test** to verify everything works
3. **Set up cron job** for automated runs
4. **Monitor logs** for first few runs
5. **Enjoy automated data updates!** 🎊

---

**The production cron job is now ready for deployment!** 🎉

All campaigns with SFA links will be automatically updated every 6 hours with fresh stream data from Spotify for Artists.

