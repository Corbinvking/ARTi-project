# Production Deployment Guide - Cron Job Setup

This guide walks you through deploying the Spotify for Artists scraper on your production droplet with automated cron job updates.

---

## 🎯 What This Does

The production scraper will:
1. ✅ Run automatically on a schedule (e.g., every 6 hours)
2. ✅ Connect to your production database
3. ✅ Find all active campaigns with SFA links
4. ✅ Scrape 24h + 7d stream data for each campaign
5. ✅ Update the database with latest numbers
6. ✅ Log all activity for monitoring
7. ✅ Run headless (no GUI needed)

---

## 📋 Prerequisites

### 1. Database Migration

First, add the required columns to your database:

```bash
# On your local machine (or wherever you manage Supabase migrations)
cd /path/to/ARTi-project
npx supabase migration up --db-url "postgresql://postgres:your_password@db.artistinfluence.com:5432/postgres"
```

This adds these columns to `spotify_campaigns`:
- `streams_24h` - Total streams from playlists (24h)
- `streams_7d` - Total streams from playlists (7d)
- `playlists_24h_count` - Number of active playlists (24h)
- `playlists_7d_count` - Number of active playlists (7d)
- `last_scraped_at` - Timestamp of last scrape
- `scrape_data` - Full JSON data from scrape

### 2. Droplet Requirements

Your production droplet needs:
- Ubuntu 20.04+ (or similar Linux)
- Python 3.8+
- Git
- Chromium browser (for Playwright)

---

## 🚀 Deployment Steps

### Step 1: SSH into Production Droplet

```bash
ssh root@your-droplet-ip
```

### Step 2: Install System Dependencies

```bash
# Update system
apt update && apt upgrade -y

# Install Python and pip
apt install -y python3 python3-pip git

# Install Playwright dependencies (required for headless browser)
apt install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2
```

### Step 3: Clone Repository

```bash
# Navigate to app directory (adjust path as needed)
cd /root
git clone https://github.com/your-org/ARTi-project.git
cd ARTi-project/spotify_scraper
```

### Step 4: Install Python Dependencies

```bash
# Install requirements
pip3 install -r requirements.txt

# Install Playwright browser
python3 -m playwright install chromium
```

### Step 5: Configure Environment

```bash
# Copy example env file
cp production.env.example .env

# Edit with your credentials
nano .env
```

Set these values in `.env`:
```bash
SPOTIFY_EMAIL=tribe@artistinfluence.com
SPOTIFY_PASSWORD=UE_n7C*8wgxe9!P4abtK
SUPABASE_URL=https://api.artistinfluence.com
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
```

### Step 6: One-Time Login Setup

Since this is the first time running on the droplet, you need to establish a session:

**Option A: Transfer Existing Session (Recommended)**

If you've already logged in locally:

```bash
# On your local machine:
cd spotify_scraper
scp -r data/browser_data root@your-droplet-ip:/root/ARTi-project/spotify_scraper/data/
```

**Option B: Manual Login on Droplet**

If you need to login fresh on the droplet (requires X11 forwarding or VNC):

```bash
# On droplet:
cd /root/ARTi-project/spotify_scraper
python3 setup_manual_login.py
```

### Step 7: Test the Scraper

Run a test to make sure everything works:

```bash
cd /root/ARTi-project/spotify_scraper
python3 run_production_scraper.py
```

You should see output like:
```
================================================================================
PRODUCTION SPOTIFY FOR ARTISTS SCRAPER
Started at: 2025-11-17 18:30:00
================================================================================
INFO - Fetching active campaigns with SFA links from database...
INFO - Found 25 active campaigns with SFA links
INFO - Verifying Spotify for Artists login...
INFO - ✓ Login verified!
INFO - 
[1/25] Processing campaign 123...
INFO - Scraping campaign 123: CHAIN SMOKER (Epic Campaign)
INFO -   URL: https://artists.spotify.com/c/artist/.../song/.../stats
INFO -   ✓ Successfully scraped campaign 123
INFO -     24hour: 4 playlists, 37 total streams
INFO -     7day: 11 playlists, 468 total streams
INFO - Updating database for campaign 123...
INFO -   ✓ Database updated for campaign 123
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

### Step 8: Create Cron Job

Create a shell script to run the scraper:

```bash
nano /root/run_s4a_scraper.sh
```

Add this content:

```bash
#!/bin/bash
# Spotify for Artists Production Scraper
# Runs headless and updates all active campaigns

cd /root/ARTi-project/spotify_scraper
/usr/bin/python3 run_production_scraper.py
```

Make it executable:

```bash
chmod +x /root/run_s4a_scraper.sh
```

Now add to crontab:

```bash
crontab -e
```

Add one of these schedules:

```bash
# Option 1: Run every 6 hours (recommended for production)
0 */6 * * * /root/run_s4a_scraper.sh >> /root/ARTi-project/spotify_scraper/logs/cron.log 2>&1

# Option 2: Run every 12 hours (for less frequent updates)
0 */12 * * * /root/run_s4a_scraper.sh >> /root/ARTi-project/spotify_scraper/logs/cron.log 2>&1

# Option 3: Run daily at 2 AM
0 2 * * * /root/run_s4a_scraper.sh >> /root/ARTi-project/spotify_scraper/logs/cron.log 2>&1

# Option 4: Run twice daily (2 AM and 2 PM)
0 2,14 * * * /root/run_s4a_scraper.sh >> /root/ARTi-project/spotify_scraper/logs/cron.log 2>&1
```

**Recommended**: Every 6 hours gives you 4 updates per day, keeping data fresh without overwhelming Spotify.

---

## 📊 Monitoring

### Check Logs

View recent scraper activity:

```bash
# View today's scraper log
tail -f /root/ARTi-project/spotify_scraper/logs/production_scraper_$(date +%Y%m%d).log

# View cron job log
tail -f /root/ARTi-project/spotify_scraper/logs/cron.log

# Check for errors
grep ERROR /root/ARTi-project/spotify_scraper/logs/*.log
```

### Check Cron Status

```bash
# Verify cron is running
systemctl status cron

# List active cron jobs
crontab -l

# Check cron logs (system)
grep CRON /var/log/syslog | tail -20
```

### Database Verification

Check if data is being updated:

```bash
# Connect to database (adjust connection details)
psql -h db.artistinfluence.com -U postgres -d postgres

# Check recently scraped campaigns
SELECT 
    id, 
    campaign, 
    track_name,
    streams_24h,
    streams_7d,
    last_scraped_at
FROM spotify_campaigns
WHERE last_scraped_at IS NOT NULL
ORDER BY last_scraped_at DESC
LIMIT 10;
```

---

## 🔧 Maintenance

### Update Scraper Code

When you make changes:

```bash
# SSH to droplet
ssh root@your-droplet-ip

# Pull latest code
cd /root/ARTi-project
git pull

# Restart is automatic (cron will use new code on next run)
```

### Manual Run

To run the scraper manually (outside of cron):

```bash
cd /root/ARTi-project/spotify_scraper
python3 run_production_scraper.py
```

### Clear Browser Session

If login issues occur:

```bash
cd /root/ARTi-project/spotify_scraper
rm -rf data/browser_data
python3 setup_manual_login.py  # Re-login
```

### Rotate Logs

Logs can grow large. Set up log rotation:

```bash
nano /etc/logrotate.d/s4a-scraper
```

Add:

```
/root/ARTi-project/spotify_scraper/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
}
```

---

## 🐛 Troubleshooting

### Issue: Cron Job Not Running

**Check cron service:**
```bash
systemctl status cron
systemctl restart cron
```

**Check cron permissions:**
```bash
chmod +x /root/run_s4a_scraper.sh
```

**Check cron syntax:**
```bash
crontab -l
```

### Issue: Login Fails in Headless Mode

**Transfer your local session:**
```bash
scp -r data/browser_data root@your-droplet-ip:/root/ARTi-project/spotify_scraper/data/
```

**Check browser data exists:**
```bash
ls -la /root/ARTi-project/spotify_scraper/data/browser_data/
```

### Issue: No Campaigns Found

**Check database connection:**
```bash
cd /root/ARTi-project/spotify_scraper
python3 -c "import os; from dotenv import load_dotenv; load_dotenv(); print(os.getenv('SUPABASE_URL'))"
```

**Verify campaigns have SFA links:**
```sql
SELECT COUNT(*) FROM spotify_campaigns WHERE sfa IS NOT NULL;
```

### Issue: Playwright Crashes

**Install missing dependencies:**
```bash
apt install -y chromium-browser
python3 -m playwright install-deps chromium
```

---

## 📈 Expected Performance

With **every 6 hours** schedule:
- ~25 campaigns = ~10 minutes per run
- 4 runs per day
- Database updated with fresh stream counts 4x daily
- Minimal server load (runs during off-peak hours)

---

## ✅ Deployment Checklist

Before going live:

- [ ] Database migration applied (`042_add_scraper_data_columns.sql`)
- [ ] System dependencies installed (Python, Playwright, Chromium)
- [ ] Repository cloned to droplet
- [ ] Python packages installed
- [ ] `.env` file configured with production credentials
- [ ] Browser session established (login works)
- [ ] Test run completed successfully
- [ ] Shell script created and executable
- [ ] Cron job added and verified
- [ ] Logs directory created
- [ ] Monitoring set up (log rotation, alerts)

---

## 🎉 You're Live!

Once deployed, the scraper will:
1. ✅ Run automatically on schedule
2. ✅ Update all campaigns with SFA links
3. ✅ Keep stream data fresh
4. ✅ Log everything for debugging
5. ✅ Require zero manual intervention

**To add new campaigns to the queue**: Just add an SFA link to the `sfa` column in `spotify_campaigns` table. The next cron run will pick it up automatically!

---

## 📞 Support

If you encounter issues:
1. Check logs: `/root/ARTi-project/spotify_scraper/logs/`
2. Run manually to see errors: `python3 run_production_scraper.py`
3. Verify database connection and credentials
4. Check Playwright installation: `python3 -m playwright --version`

