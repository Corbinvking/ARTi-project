# 🚀 Production Deployment - Commands to Run

**Copy-paste these commands on your production server**

---

## 📋 Step 1: SSH into Production

```bash
ssh user@your-production-server.com
```

---

## 📋 Step 2: Navigate to Project

```bash
cd /var/www/ARTi-project
# Or wherever your project is located
```

---

## 📋 Step 3: Pull Latest Code

```bash
git pull origin main
```

**Expected output:**
```
From https://github.com/your-repo/ARTi-project
 * branch            main       -> FETCH_HEAD
Updating ...
Fast-forward
 ...
```

---

## 📋 Step 4: Install Dependencies

```bash
# Install roster scraper dependencies
cd roster_scraper
pip3  install-r requirements.txt

# Install spotify scraper dependencies
cd ../spotify_scraper
pip3 install -r requirements.txt

# Install Playwright browsers
cd ../roster_scraper
playwright install chromium

# Return to project root
cd ..
```

---

## 📋 Step 5: Upload CSV File (if not already present)

**From your local machine** (in a new terminal):

```bash
scp "Spotify Playlisting-Active Campaigns.csv" user@production-server:/var/www/ARTi-project/
```

**Or use SFTP/FTP/rsync** to upload the CSV file to the project root.

---

## 📋 Step 6: Verify Environment Variables

```bash
# Check if .env file exists
cat .env

# Should contain:
# NEXT_PUBLIC_SUPABASE_URL=https://your-production-url.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**If missing, create/edit `.env`:**

```bash
nano .env
# Add the required variables
# Save: Ctrl+X, then Y, then Enter
```

---

## 📋 Step 7: Import Existing Scraped Data

**Option A**: Upload data files from local

**From your local machine**:
```bash
scp -r spotify_scraper/data/roster_*.json user@production-server:/var/www/ARTi-project/spotify_scraper/data/
```

**Then on production server**:
```bash
# Import to database
node scripts/import-roster-scraped-data.js
```

**Option B**: Run the full scraper on production

```bash
# This will take 2-3 hours
python3 scripts/run_full_stream_data_pipeline.py
```

---

## 📋 Step 8: Verify Data in Database

```bash
# Check campaign_playlists count
npx supabase db execute --linked "SELECT COUNT(*) FROM campaign_playlists;"

# Should return ~741 or more
```

**Or check in Supabase Dashboard**:
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT
2. Click "Table Editor"
3. Select `campaign_playlists` table
4. Verify data is present

---

## 📋 Step 9: Verify Data in Production UI

```bash
# Open in browser:
https://your-production-domain.com

# Navigate to:
# Campaigns → Click on a campaign → Check playlist data
```

**Expected to see:**
- ✅ Algorithmic playlists section
- ✅ Vendor playlists section
- ✅ Stream counts (28d, 7d, 12m)
- ✅ Curator information

---

## 📋 Step 10: Set Up Cron Job

```bash
# Edit crontab
crontab -e

# Add this line (runs every Sunday at 2 AM):
0 2 * * 0 cd /var/www/ARTi-project && /usr/bin/python3 scripts/run_full_stream_data_pipeline.py >> logs/stream_data_workflow.log 2>&1

# Save and exit
# - In nano: Ctrl+X, then Y, then Enter
# - In vi/vim: Press ESC, type :wq, press Enter
```

**Verify cron job is scheduled:**
```bash
crontab -l
```

---

## 📋 Step 11: Create Logs Directory

```bash
mkdir -p logs
```

---

## 📋 Step 12: Test Manual Run (Optional but Recommended)

```bash
# Test the full pipeline
python3 scripts/run_full_stream_data_pipeline.py

# This will:
# - Collect URLs (~15 min)
# - Scrape data (~2-3 hours)
# - Import to database (~30 sec)

# You can monitor progress in real-time
```

---

## 🎯 Quick Verification Checklist

After deployment, verify:

```bash
# ✅ Code is up to date
git log --oneline -1

# ✅ CSV file is present
ls -lh "Spotify Playlisting-Active Campaigns.csv"

# ✅ Python dependencies installed
pip3 list | grep playwright

# ✅ Environment variables set
cat .env | grep SUPABASE

# ✅ Data in database
npx supabase db execute --linked "SELECT COUNT(*) FROM campaign_playlists;"

# ✅ Cron job scheduled
crontab -l | grep stream_data_workflow

# ✅ Logs directory exists
ls -ld logs/
```

---

## 🔄 Monitor Scheduled Runs

```bash
# Watch logs in real-time
tail -f logs/stream_data_workflow.log

# Check last successful run
cat logs/last_successful_run.txt

# View recent log entries
tail -50 logs/stream_data_workflow.log
```

---

## 🐛 Troubleshooting

### If data import fails:

```bash
# Check database connection
npx supabase db execute --linked "SELECT 1;"

# Re-run import manually
node scripts/import-roster-scraped-data.js
```

### If scraper fails:

```bash
# Check Playwright installation
cd roster_scraper
playwright --version

# Re-install if needed
playwright install chromium
```

### If cron doesn't run:

```bash
# Check cron service status
sudo systemctl status cron
# or
sudo service cron status

# View cron logs
grep CRON /var/log/syslog | tail -20
```

---

## 📊 Expected Results

### Database
```sql
-- Campaign playlists count
SELECT COUNT(*) FROM campaign_playlists;
-- Expected: ~741+

-- Campaigns with data
SELECT COUNT(DISTINCT campaign_id) FROM campaign_playlists;
-- Expected: ~28+

-- Recent data
SELECT MAX(last_scraped) FROM campaign_playlists;
-- Expected: Recent timestamp
```

### UI
- ✅ Playlist cards visible in campaigns
- ✅ Stream metrics displayed
- ✅ Algorithmic vs vendor playlists separated

---

## ✅ Deployment Complete!

Once all steps are done:

1. ✅ Code deployed to production
2. ✅ Dependencies installed
3. ✅ Data imported to database
4. ✅ UI verified
5. ✅ Cron job scheduled
6. ✅ Logs configured

**Your automated stream data workflow is now live in production!** 🎉

---

## 📞 Support

If you encounter issues:

1. Check logs: `tail -f logs/stream_data_workflow.log`
2. Verify database: Run SQL queries above
3. Test manually: `python3 scripts/run_full_stream_data_pipeline.py`
4. Check documentation: `DEPLOY-STREAM-DATA-TO-PRODUCTION.md`

---

**Ready for the next scheduled run!** 🚀

