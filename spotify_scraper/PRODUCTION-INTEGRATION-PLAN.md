# 🚀 Spotify Scraper - Production Integration Plan

**Date**: November 17, 2025  
**Target**: Integration with existing ARTi production system (droplet: 165.227.91.129)

---

## 📋 System Overview

### Your Current Setup:
- ✅ YouTube cron job runs on **host machine** (not in containers)
- ✅ Calls API endpoint that connects to database
- ✅ Runs 3x daily (6am, 2pm, 10pm)
- ✅ Docker network: `arti-network` for container communication

### Spotify Scraper Integration:
- ✅ Will run on **host machine** (same pattern as YouTube)
- ✅ Connects directly to database via exposed Kong port (8000)
- ✅ Runs 1x daily (recommended: 2am for off-peak hours)
- ✅ Uses Playwright with headless browser (needs host, not container)

---

## 🎯 Integration Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                     Production Droplet                       │
│                                                              │
│  ┌────────────────┐        ┌────────────────┐              │
│  │  Host Machine  │        │  Docker        │              │
│  │                │        │  Containers    │              │
│  │  ┌──────────┐  │        │                │              │
│  │  │ YouTube  │──┼────────┼─→ API :3001    │              │
│  │  │ Cron Job │  │  HTTP  │                │              │
│  │  └──────────┘  │        │  Kong :8000 ───┼─→ Postgres   │
│  │                │        │                │              │
│  │  ┌──────────┐  │        │                │              │
│  │  │ Spotify  │──┼────────┼─→ Kong :8000 ──┼─→ Supabase   │
│  │  │ Scraper  │  │  Direct│                │   Database   │
│  │  │ Cron Job │  │   DB   │                │              │
│  │  └──────────┘  │        └────────────────┘              │
│  │                │                                          │
│  │  /root/arti-marketing-ops/spotify_scraper/              │
│  │    - run_production_scraper.py                          │
│  │    - data/browser_data/ (saved session)                 │
│  │    - logs/                                               │
│  └────────────────┘                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Prerequisites Check

Before deployment, verify:

```bash
# SSH to production
ssh root@165.227.91.129

# Check existing setup
ls -la /root/arti-marketing-ops/scripts/
crontab -l  # Should see YouTube cron job

# Check database access (Kong exposed on :8000)
curl http://localhost:8000/rest/v1/ -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🚀 Deployment Steps

### Step 1: Apply Database Migration

```bash
# From your LOCAL machine (where you manage migrations):
cd C:\Users\corbi\OneDrive\Documents\GitHub\ARTi-project

# Apply the migration
npx supabase db push --db-url "postgresql://postgres:MySecurePass123!@165.227.91.129:5432/postgres"

# Or manually apply:
docker exec -i arti-postgres-prod psql -U postgres -d postgres < supabase/migrations/042_add_scraper_data_columns.sql
```

**This adds these columns to `spotify_campaigns`:**
- `streams_24h` - Total playlist streams (24h)
- `streams_7d` - Total playlist streams (7d)
- `playlists_24h_count` - Count of active playlists
- `playlists_7d_count` - Count of active playlists
- `last_scraped_at` - Timestamp
- `scrape_data` - Full JSON

### Step 2: Deploy Scraper Code to Droplet

```bash
# SSH to production
ssh root@165.227.91.129

# Pull latest code
cd /root/arti-marketing-ops
git pull origin main

# Navigate to scraper directory
cd spotify_scraper

# Install Python dependencies
pip3 install -r requirements.txt

# Install Playwright browsers
python3 -m playwright install chromium

# Install Playwright system dependencies
python3 -m playwright install-deps chromium
```

### Step 3: Configure Environment

```bash
# Create production environment file
cd /root/arti-marketing-ops/spotify_scraper
nano .env
```

Add this configuration:

```bash
# Spotify for Artists Login
SPOTIFY_EMAIL=tribe@artistinfluence.com
SPOTIFY_PASSWORD=UE_n7C*8wgxe9!P4abtK

# Database Connection (via Kong gateway)
SUPABASE_URL=http://localhost:8000
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# Scraper Settings
HEADLESS=true
LOG_LEVEL=INFO
```

### Step 4: One-Time Browser Session Setup

You need to establish a logged-in session once. **Two options:**

#### **Option A: Transfer Session from Local (Recommended)**

```bash
# On your LOCAL machine:
cd C:\Users\corbi\OneDrive\Documents\GitHub\ARTi-project\spotify_scraper

# Create archive of browser session
tar -czf browser_session.tar.gz data/browser_data/

# Transfer to droplet
scp browser_session.tar.gz root@165.227.91.129:/root/arti-marketing-ops/spotify_scraper/

# On DROPLET:
cd /root/arti-marketing-ops/spotify_scraper
tar -xzf browser_session.tar.gz
rm browser_session.tar.gz
```

#### **Option B: Manual Login on Droplet (if needed)**

If you need to login fresh on the droplet:

```bash
# Install X11 forwarding (if not already installed)
apt install -y xvfb

# Run with virtual display
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99

# Run manual login setup
cd /root/arti-marketing-ops/spotify_scraper
python3 setup_manual_login.py

# This will open a browser and wait for you to login
# After login, press Enter to save the session
```

### Step 5: Test the Scraper

```bash
cd /root/arti-marketing-ops/spotify_scraper

# Run a test scrape
python3 run_production_scraper.py
```

**Expected output:**

```
================================================================================
PRODUCTION SPOTIFY FOR ARTISTS SCRAPER
Started at: 2025-11-17 18:30:00
================================================================================
INFO - Fetching active campaigns with SFA links from database...
INFO - Found 25 active campaigns with SFA links
INFO - Verifying Spotify for Artists login...
INFO - ✓ Login verified!

[1/25] Processing campaign 123...
INFO -   ✓ Successfully scraped - 24hour: 4 playlists (37 streams), 7day: 11 playlists (468 streams)
INFO -   ✓ Database updated

...

================================================================================
SCRAPING COMPLETE
Results:
  ✓ Successful: 24
  ✗ Failed: 1
  Total: 25
================================================================================
```

### Step 6: Create Cron Job Script

```bash
# Create logs directory
mkdir -p /root/arti-marketing-ops/logs/spotify-scraper

# Create the cron script
nano /root/arti-marketing-ops/scripts/spotify-scraper-daily.sh
```

Add this content:

```bash
#!/bin/bash
# Spotify for Artists Scraper - Daily Run
# Fetches playlist stream data for all campaigns with SFA links

# Set working directory
cd /root/arti-marketing-ops/spotify_scraper

# Generate log filename
LOG_FILE="/root/arti-marketing-ops/logs/spotify-scraper/run-$(date +%Y%m%d-%H%M%S).log"

# Create log directory if needed
mkdir -p /root/arti-marketing-ops/logs/spotify-scraper

# Run the scraper
echo "========================================" >> "$LOG_FILE"
echo "Spotify Scraper - $(date)" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

python3 run_production_scraper.py >> "$LOG_FILE" 2>&1

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Success" >> "$LOG_FILE"
else
    echo "❌ Failed with exit code: $EXIT_CODE" >> "$LOG_FILE"
fi

echo "========================================" >> "$LOG_FILE"

# Keep only last 30 days of logs
find /root/arti-marketing-ops/logs/spotify-scraper -name "run-*.log" -mtime +30 -delete

# Also log to system log
logger -t spotify-scraper "Scraper completed with exit code $EXIT_CODE"

exit $EXIT_CODE
```

Make it executable:

```bash
chmod +x /root/arti-marketing-ops/scripts/spotify-scraper-daily.sh
```

### Step 7: Install Cron Job

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2am, during off-peak hours)
0 2 * * * /root/arti-marketing-ops/scripts/spotify-scraper-daily.sh
```

**Your crontab will now have:**
```
# YouTube stats (3x daily)
0 6 * * * /root/arti-marketing-ops/scripts/youtube-stats-daily-update.sh
0 14 * * * /root/arti-marketing-ops/scripts/youtube-stats-daily-update.sh
0 22 * * * /root/arti-marketing-ops/scripts/youtube-stats-daily-update.sh

# Spotify scraper (1x daily at 2am)
0 2 * * * /root/arti-marketing-ops/scripts/spotify-scraper-daily.sh
```

Verify:
```bash
crontab -l
```

### Step 8: Manual Test of Cron Script

Test the cron script before waiting for the scheduled run:

```bash
# Run manually
/root/arti-marketing-ops/scripts/spotify-scraper-daily.sh

# Check the log
ls -lh /root/arti-marketing-ops/logs/spotify-scraper/
tail -f /root/arti-marketing-ops/logs/spotify-scraper/run-*.log | tail -100
```

---

## 📊 Monitoring

### View Logs

```bash
# View latest log
tail -f /root/arti-marketing-ops/logs/spotify-scraper/run-*.log | tail -200

# List all logs
ls -lh /root/arti-marketing-ops/logs/spotify-scraper/

# Check today's logs
grep -r "SCRAPING COMPLETE" /root/arti-marketing-ops/logs/spotify-scraper/run-$(date +%Y%m%d)*.log
```

### Check Database

```bash
# Check recently updated campaigns
docker exec -i arti-postgres-prod psql -U postgres -d postgres -c "
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
"

# Count campaigns with SFA links
docker exec -i arti-postgres-prod psql -U postgres -d postgres -c "
SELECT 
    COUNT(*) as total_campaigns,
    COUNT(sfa) FILTER (WHERE sfa IS NOT NULL) as with_sfa_link,
    COUNT(last_scraped_at) as already_scraped
FROM spotify_campaigns;
"
```

### System Logs

```bash
# Check system logs for cron runs
grep spotify-scraper /var/log/syslog | tail -20

# Check cron execution
grep CRON /var/log/syslog | grep spotify-scraper | tail -10
```

---

## 🔧 Maintenance

### Update Scraper Code

When you make changes:

```bash
# On LOCAL machine:
cd C:\Users\corbi\OneDrive\Documents\GitHub\ARTi-project
git add .
git commit -m "Update Spotify scraper"
git push origin main

# On PRODUCTION:
ssh root@165.227.91.129
cd /root/arti-marketing-ops
git pull
# Changes take effect on next cron run (no restart needed)
```

### Re-Login to Spotify (if session expires)

```bash
# Clear old session
rm -rf /root/arti-marketing-ops/spotify_scraper/data/browser_data

# Transfer fresh session from local, OR
# Run manual login setup (with X11)
cd /root/arti-marketing-ops/spotify_scraper
python3 setup_manual_login.py
```

### Adjust Schedule

```bash
# Edit crontab
crontab -e

# Schedule options:
# Once daily at 2am (recommended):
0 2 * * * /root/arti-marketing-ops/scripts/spotify-scraper-daily.sh

# Twice daily (2am and 2pm):
0 2,14 * * * /root/arti-marketing-ops/scripts/spotify-scraper-daily.sh

# Every 6 hours:
0 */6 * * * /root/arti-marketing-ops/scripts/spotify-scraper-daily.sh
```

---

## ✅ Deployment Checklist

- [ ] **Database migration applied** (`042_add_scraper_data_columns.sql`)
- [ ] **Code pulled to droplet** (`git pull`)
- [ ] **Python dependencies installed** (`pip3 install -r requirements.txt`)
- [ ] **Playwright installed** (`playwright install chromium`)
- [ ] **Environment configured** (`.env` file created)
- [ ] **Browser session transferred** (or manual login completed)
- [ ] **Test run successful** (`python3 run_production_scraper.py`)
- [ ] **Cron script created** and executable (`chmod +x`)
- [ ] **Cron job installed** (`crontab -e`)
- [ ] **Logs directory created** (`mkdir -p logs/spotify-scraper`)
- [ ] **Manual cron test passed** (script runs successfully)
- [ ] **Database verified** (data populating correctly)

---

## 🎯 Success Metrics

Once deployed, you should see:

**Database:**
```sql
SELECT 
    COUNT(*) FILTER (WHERE sfa IS NOT NULL) as campaigns_with_sfa,
    COUNT(*) FILTER (WHERE last_scraped_at IS NOT NULL) as campaigns_scraped,
    MAX(last_scraped_at) as last_scrape_time,
    SUM(streams_24h) as total_24h_streams,
    SUM(streams_7d) as total_7d_streams
FROM spotify_campaigns;
```

**Logs:**
```bash
# Should show daily runs at 2am
ls -lh /root/arti-marketing-ops/logs/spotify-scraper/
```

**Cron:**
```bash
# Should show both YouTube and Spotify jobs
crontab -l
```

---

## 🚨 Troubleshooting

### Issue: Scraper can't connect to database

**Check Kong is accessible:**
```bash
curl http://localhost:8000/rest/v1/ -H "apikey: eyJhbG..."
```

**Verify network:**
```bash
docker ps | grep kong
netstat -tlnp | grep 8000
```

### Issue: Login fails

**Clear session and re-login:**
```bash
rm -rf data/browser_data
# Transfer fresh session from local machine
```

### Issue: Cron job not running

**Check cron service:**
```bash
systemctl status cron
```

**Check cron logs:**
```bash
grep CRON /var/log/syslog | grep spotify | tail -20
```

**Verify script permissions:**
```bash
ls -l /root/arti-marketing-ops/scripts/spotify-scraper-daily.sh
# Should show: -rwxr-xr-x
```

### Issue: Playwright crashes

**Install missing dependencies:**
```bash
python3 -m playwright install-deps chromium
```

**Check memory:**
```bash
free -h
# Ensure at least 500MB free
```

---

## 📞 Next Steps

1. **Complete deployment** following the steps above
2. **Monitor first run** at 2am the next day
3. **Verify data** in database after first run
4. **Check logs** for any errors
5. **Celebrate!** 🎉 Your Spotify data is now auto-updating daily!

---

**Integration complete! The Spotify scraper will now run alongside your YouTube scraper, keeping all campaign data fresh.** 🚀

