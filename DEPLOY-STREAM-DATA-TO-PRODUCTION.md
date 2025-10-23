# 🚀 Deploy Stream Data Workflow to Production

**Complete guide for deploying the automated stream data pipeline to production**

---

## 📋 Pre-Deployment Checklist

### Local Testing
- [x] Roster scraper successfully collects URLs
- [x] Stream scraper successfully scrapes data
- [x] Database import successfully populates `campaign_playlists`
- [x] Data visible in local UI
- [ ] Full pipeline script tested (`run_full_stream_data_pipeline.py`)

### Production Prerequisites
- [ ] Production Supabase instance running
- [ ] Environment variables configured
- [ ] CSV file uploaded to production
- [ ] Git repository access from production server

---

## 🎯 Deployment Steps

### Step 1: Push Code to Repository

```bash
# From local machine
cd /path/to/ARTi-project

# Add all files
git add .

# Commit
git commit -m "feat: complete automated stream data workflow
- Roster URL collector
- Stream data scraper  
- Database import script
- Master pipeline orchestrator
- Production deployment docs"

# Push to main
git push origin main
```

---

### Step 2: Deploy to Production Server

```bash
# SSH into production server
ssh user@your-production-server.com

# Navigate to project directory
cd /var/www/ARTi-project
# or wherever your project is deployed

# Pull latest code
git pull origin main

# Verify files are present
ls -la scripts/run_full_stream_data_pipeline.py
ls -la roster_scraper/run_roster_scraper.py
ls -la spotify_scraper/run_roster_urls.py
ls -la scripts/import-roster-scraped-data.js
```

---

### Step 3: Install Dependencies

```bash
# Install Python dependencies for roster scraper
cd roster_scraper
pip3 install -r requirements.txt
playwright install chromium

# Install Python dependencies for spotify scraper
cd ../spotify_scraper
pip3 install -r requirements.txt
# Playwright already installed above

# Install Node dependencies (if not already)
cd ..
npm install
```

---

### Step 4: Upload CSV File

```bash
# From local machine, upload CSV to production
scp "Spotify Playlisting-Active Campaigns.csv" user@production-server:/var/www/ARTi-project/

# Or use SFTP, rsync, or your preferred method

# Verify on production
ssh user@production-server
cd /var/www/ARTi-project
ls -lh "Spotify Playlisting-Active Campaigns.csv"
```

---

### Step 5: Configure Environment Variables

```bash
# On production server
cd /var/www/ARTi-project

# Check/create .env file
nano .env

# Ensure these are set:
NEXT_PUBLIC_SUPABASE_URL=https://your-production-url.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Save and exit (Ctrl+X, Y, Enter)

# Verify
cat .env | grep SUPABASE
```

---

### Step 6: Run Database Migrations

```bash
# Ensure campaign_playlists table exists
# This should already be there from previous migrations

# Check if table exists
npx supabase db dump --linked --schema public | grep "campaign_playlists"

# If not, run migrations
npx supabase db push --linked

# Verify table structure
npx supabase db execute --linked "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'campaign_playlists';"
```

---

### Step 7: Test Manual Run

```bash
# Create logs directory
mkdir -p logs

# Test the full pipeline manually first
python3 scripts/run_full_stream_data_pipeline.py

# This will:
# 1. Collect URLs (may prompt for S4A login on first run)
# 2. Scrape stream data
# 3. Import to database

# Monitor progress - this may take 2-3 hours for first run
```

**⚠️ IMPORTANT - First Run Login:**

On the first run, you'll need to:
1. Wait for the browser window to open
2. Manually log in to Spotify for Artists
3. Wait for the dashboard to load
4. The session will be saved for future runs

---

### Step 8: Run Import Script on Existing Data

If you already have scraped data files locally that you want to import to production:

```bash
# Option A: Upload local data files to production
# From local machine
cd /path/to/ARTi-project
scp -r spotify_scraper/data/*.json user@production-server:/var/www/ARTi-project/spotify_scraper/data/

# Then on production, run import
ssh user@production-server
cd /var/www/ARTi-project
node scripts/import-roster-scraped-data.js
```

```bash
# Option B: Run the scraper directly on production
# This will scrape fresh data on the production server
ssh user@production-server
cd /var/www/ARTi-project/spotify_scraper
python3 run_roster_urls.py

# Then import
cd ..
node scripts/import-roster-scraped-data.js
```

---

### Step 9: Verify Data in Production UI

```bash
# Open production frontend
# https://your-production-domain.com

# Navigate to a campaign
# Check if playlist data is showing:
# - Algorithmic playlists (Radio, Discover Weekly, etc.)
# - Vendor playlists
# - Stream counts for 28d, 7d, 12m

# If data is NOT showing, check:
# 1. Database records exist
# 2. RLS policies allow access
# 3. Frontend is fetching from production Supabase
```

---

### Step 10: Verify Database Records

```sql
-- Connect to production Supabase dashboard
-- Or use CLI: npx supabase db execute --linked "QUERY"

-- Check if data was imported
SELECT COUNT(*) FROM campaign_playlists;

-- Check recent imports
SELECT 
  last_scraped,
  COUNT(*) as playlist_count
FROM campaign_playlists
GROUP BY last_scraped
ORDER BY last_scraped DESC
LIMIT 5;

-- Check campaigns with playlist data
SELECT 
  sc.id,
  sc.campaign,
  COUNT(cp.id) as playlist_count,
  SUM(cp.streams_28d) as total_streams_28d
FROM spotify_campaigns sc
LEFT JOIN campaign_playlists cp ON cp.campaign_id = sc.id
WHERE cp.id IS NOT NULL
GROUP BY sc.id, sc.campaign
ORDER BY playlist_count DESC
LIMIT 10;
```

---

### Step 11: Set Up Cron Job

```bash
# On production server
crontab -e

# Add cron job to run weekly on Sunday at 2 AM
0 2 * * 0 cd /var/www/ARTi-project && /usr/bin/python3 scripts/run_full_stream_data_pipeline.py >> logs/stream_data_workflow.log 2>&1

# Or run daily at 3 AM
0 3 * * * cd /var/www/ARTi-project && /usr/bin/python3 scripts/run_full_stream_data_pipeline.py >> logs/stream_data_workflow.log 2>&1

# Save and exit

# Verify cron job is scheduled
crontab -l | grep stream_data_workflow
```

**Cron Schedule Explained:**
- `0 2 * * 0` = Every Sunday at 2:00 AM
- `0 3 * * *` = Every day at 3:00 AM
- Logs will be written to `logs/stream_data_workflow.log`

---

### Step 12: Monitor First Scheduled Run

```bash
# Check cron is running
sudo systemctl status cron
# or
sudo service cron status

# Monitor logs in real-time (on scheduled run time)
tail -f logs/stream_data_workflow.log

# Check if last run was successful
cat logs/last_successful_run.txt

# Check for any errors
grep -i "error\|fail" logs/stream_data_workflow.log
```

---

## 🔍 Post-Deployment Verification

### 1. Check Data Files

```bash
# SSH into production
ssh user@production-server
cd /var/www/ARTi-project

# Check roster scraper output
ls -lh roster_scraper/data/sfa-urls-simple_*.txt | tail -1

# Check stream scraper output
ls -lh spotify_scraper/data/roster_*.json | wc -l

# Should see ~79-80 JSON files
```

### 2. Verify Database

```sql
-- In production Supabase dashboard

-- Count total playlists
SELECT COUNT(*) FROM campaign_playlists;
-- Should be ~741 or more

-- Count campaigns with data
SELECT COUNT(DISTINCT campaign_id) FROM campaign_playlists;
-- Should be ~28 or more

-- Check data freshness
SELECT MAX(last_scraped) FROM campaign_playlists;
-- Should be recent timestamp
```

### 3. Check Production UI

1. Open production frontend
2. Navigate to **Campaigns** page
3. Click on a campaign (e.g., "Segan - DNBMF")
4. Verify you see:
   - ✅ Algorithmic playlists section
   - ✅ Vendor playlists section
   - ✅ Stream counts (28d, 7d, 12m)
   - ✅ Playlist names and curators

---

## 🐛 Troubleshooting Production Issues

### Issue: "No campaigns found with spotify_track_id"

**Cause**: Local and production databases may have different campaign IDs or URL formats

**Fix**:
```bash
# Check campaign URLs in production
npx supabase db execute --linked "SELECT id, campaign, url, sfa FROM spotify_campaigns WHERE status = 'active' LIMIT 10;"

# Verify the import script can match them
node scripts/import-roster-scraped-data.js
```

---

### Issue: "Spotify for Artists login required"

**Cause**: Browser session expired

**Fix**:
```bash
# SSH into production with X11 forwarding (for GUI)
ssh -X user@production-server

# Or use a VNC/RDP session to access the GUI

# Run scraper manually to re-authenticate
cd /var/www/ARTi-project/spotify_scraper
python3 run_roster_urls.py

# Log in when browser opens
# Session will persist for future cron runs
```

**Alternative**: Use headless authentication or API tokens (if available)

---

### Issue: "RLS policy blocking access"

**Cause**: Row Level Security preventing frontend from reading `campaign_playlists`

**Fix**:
```sql
-- In production Supabase dashboard
-- Run this to check RLS policies

SELECT * FROM pg_policies WHERE tablename = 'campaign_playlists';

-- If no SELECT policy exists, create one:

CREATE POLICY "Allow authenticated users to read campaign playlists"
ON campaign_playlists
FOR SELECT
TO authenticated
USING (true);

-- Or if using org_id:
CREATE POLICY "Users can view campaign playlists in their org"
ON campaign_playlists
FOR SELECT
TO authenticated
USING (org_id IN (
  SELECT org_id FROM memberships WHERE user_id = auth.uid()
));
```

---

### Issue: "Frontend not showing playlist data"

**Cause**: Frontend may not be fetching from `campaign_playlists` table

**Fix**: Check the campaign details component

```typescript
// Ensure frontend is querying campaign_playlists
const { data: playlists } = await supabase
  .from('campaign_playlists')
  .select('*')
  .eq('campaign_id', campaignId);
```

---

## 📊 Monitoring & Maintenance

### Daily Checks
- ✅ Check if cron job ran successfully
```bash
cat logs/last_successful_run.txt
```

### Weekly Checks
- ✅ Review log file for errors
```bash
tail -100 logs/stream_data_workflow.log
```

- ✅ Verify data freshness in UI
- ✅ Check disk space usage
```bash
df -h
du -sh spotify_scraper/data/
```

### Monthly Checks
- ✅ Clean up old data files (keep last 2-3 runs)
```bash
# Keep only files from last 30 days
find spotify_scraper/data/ -name "roster_*.json" -mtime +30 -delete
find roster_scraper/data/ -name "*.json" -mtime +30 -delete
```

- ✅ Update CSV file with new campaigns
- ✅ Check for Spotify UI changes (may need scraper updates)

---

## 🆘 Emergency Rollback

If something goes wrong:

```bash
# Stop cron job
crontab -e
# Comment out the line with: #

# Revert code
git log --oneline | head -5
git checkout <previous-commit-hash>

# Restore database (if needed)
# Use Supabase dashboard to restore from backup

# Re-enable cron after fix
crontab -e
# Uncomment the line
```

---

## ✅ Deployment Complete Checklist

- [ ] Code pushed to repository
- [ ] Production server updated (git pull)
- [ ] Python dependencies installed
- [ ] Playwright browsers installed
- [ ] CSV file uploaded to production
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Manual test run successful
- [ ] Data visible in production UI
- [ ] Database records verified
- [ ] Cron job scheduled
- [ ] Monitoring and logs set up
- [ ] Team notified

---

## 📞 Support

**If you encounter issues:**

1. Check logs: `logs/stream_data_workflow.log`
2. Verify database connection
3. Check Spotify for Artists session
4. Review RLS policies
5. Test each stage manually

**Quick manual test:**
```bash
# Stage 1
cd roster_scraper && python3 run_roster_scraper.py

# Stage 2
cd ../spotify_scraper && python3 run_roster_urls.py

# Stage 3
cd .. && node scripts/import-roster-scraped-data.js
```

---

**Production deployment is now complete!** 🎉

Your automated stream data workflow is running in production and will update campaign playlist data on the scheduled interval.

