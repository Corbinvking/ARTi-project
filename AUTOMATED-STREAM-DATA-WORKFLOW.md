# 🔄 Automated Stream Data Workflow

**Complete pipeline for collecting SFA URLs, scraping stream data, and importing to database**

---

## 📋 Overview

This workflow automates the entire process of:
1. **Collecting SFA URLs** from Spotify for Artists Roster
2. **Scraping stream data** for all active campaigns
3. **Importing data** into the database
4. **Ready for scheduling** via cron job

---

## 🚀 Quick Start (Manual Run)

### Method 1: Local Scrape → Upload → Production Import (RECOMMENDED)

**Best for production - avoids long-running scrapers on production server**

```bash
# LOCAL MACHINE:
# 1. Run scraper locally (one-time or as needed)
cd /path/to/ARTi-project
python scripts/run_full_stream_data_pipeline.py

# 2. Upload scraped data to production
scp spotify_scraper/data/roster_*.json root@YOUR_SERVER_IP:~/arti-marketing-ops/spotify_scraper/data/

# PRODUCTION SERVER:
# 3. Import to production database
cd ~/arti-marketing-ops
node scripts/import-roster-scraped-data.js
```

**Benefits:**
- ✅ No 2-3 hour scraping on production
- ✅ Scrape once, deploy to multiple environments
- ✅ Production runs only quick import (~30 seconds)
- ✅ Can test locally before deploying

---

### Method 2: Run Complete Pipeline on Server

**For automated cron jobs or if scraping directly on production**

```bash
# Navigate to project root
cd /path/to/ARTi-project

# Run the complete workflow
python scripts/run_full_stream_data_pipeline.py
```

This single command will:
- ✅ Parse active campaigns from CSV
- ✅ Collect SFA URLs from Roster
- ✅ Scrape stream data
- ✅ Import to database

---

## 🏗️ Workflow Architecture

### Stage 1: URL Collection
**Script**: `roster_scraper/run_roster_scraper.py`

**Input**: `Spotify Playlisting-Active Campaigns.csv`

**Process**:
1. Parse CSV for active campaigns
2. Extract client and song names
3. Navigate to Spotify for Artists Roster
4. Search for each artist
5. Extract SFA URLs for matching songs

**Output**: `roster_scraper/data/sfa-urls-simple_[timestamp].txt`

**Time**: ~15-20 minutes for 106 clients

---

### Stage 2: Stream Data Scraping
**Script**: `spotify_scraper/run_roster_urls.py`

**Input**: `roster_scraper/data/sfa-urls-simple_*.txt` (most recent)

**Process**:
1. Read SFA URLs from file
2. Login to Spotify for Artists (session persists)
3. Navigate to each song's stats page
4. Switch between time ranges (28d, 7d, 12m)
5. Extract playlist data for each time range

**Output**: `spotify_scraper/data/roster_*.json` (one per song)

**Time**: ~2 minutes per song (~160 minutes for 80 songs)

---

### Stage 3: Database Import
**Script**: `scripts/import-roster-scraped-data.js`

**Input**: `spotify_scraper/data/roster_*.json` (all files)

**Process**:
1. Read all roster JSON files
2. Extract track IDs from filenames
3. Match to campaigns in database
4. Parse playlist data from time_ranges
5. Create/update `campaign_playlists` records

**Output**: Database records in `campaign_playlists` table

**Time**: ~30 seconds for 79 files

---

## 📝 Complete Workflow Script

I'll create a master script that runs all three stages:

**File**: `scripts/run_full_stream_data_pipeline.py`

```python
#!/usr/bin/env python3
"""
Complete Stream Data Pipeline
Runs all three stages: URL collection, scraping, and database import
"""
import os
import sys
import subprocess
import time
from pathlib import Path
from datetime import datetime

def print_stage(stage_num, title):
    print("\n" + "=" * 80)
    print(f"🚀 STAGE {stage_num}: {title}")
    print("=" * 80 + "\n")

def run_command(command, cwd=None):
    """Run a command and return success status"""
    try:
        result = subprocess.run(
            command,
            cwd=cwd,
            shell=True,
            check=True,
            capture_output=False
        )
        return result.returncode == 0
    except subprocess.CalledProcessError as e:
        print(f"❌ Error: {e}")
        return False

def main():
    project_root = Path(__file__).parent.parent
    
    print("=" * 80)
    print("🎵 AUTOMATED STREAM DATA WORKFLOW")
    print("=" * 80)
    print(f"\n📅 Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # STAGE 1: Collect SFA URLs from Roster
    print_stage(1, "Collecting SFA URLs from Roster")
    roster_dir = project_root / "roster_scraper"
    
    if not run_command("python run_roster_scraper.py", cwd=roster_dir):
        print("\n❌ Stage 1 failed: URL collection error")
        sys.exit(1)
    
    print("\n✅ Stage 1 complete: SFA URLs collected")
    time.sleep(2)
    
    # STAGE 2: Scrape stream data from collected URLs
    print_stage(2, "Scraping Stream Data")
    scraper_dir = project_root / "spotify_scraper"
    
    if not run_command("python run_roster_urls.py", cwd=scraper_dir):
        print("\n❌ Stage 2 failed: Stream data scraping error")
        sys.exit(1)
    
    print("\n✅ Stage 2 complete: Stream data scraped")
    time.sleep(2)
    
    # STAGE 3: Import data to database
    print_stage(3, "Importing Data to Database")
    
    if not run_command("node scripts/import-roster-scraped-data.js", cwd=project_root):
        print("\n❌ Stage 3 failed: Database import error")
        sys.exit(1)
    
    print("\n✅ Stage 3 complete: Data imported to database")
    
    # Summary
    print("\n" + "=" * 80)
    print("🎉 WORKFLOW COMPLETE")
    print("=" * 80)
    print(f"\n📅 Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\n✅ All stages completed successfully!")
    print("📊 Check your database for updated campaign playlist data\n")

if __name__ == "__main__":
    main()
```

---

## ⏰ Scheduling with Cron

### Linux/Mac Cron Job

**Run weekly on Sunday at 2 AM:**

```bash
# Edit crontab
crontab -e

# Add this line:
0 2 * * 0 cd /path/to/ARTi-project && /usr/bin/python3 scripts/run_full_stream_data_pipeline.py >> logs/stream_data_workflow.log 2>&1
```

**Run daily at 3 AM:**

```bash
0 3 * * * cd /path/to/ARTi-project && /usr/bin/python3 scripts/run_full_stream_data_pipeline.py >> logs/stream_data_workflow.log 2>&1
```

### Windows Task Scheduler

**Create scheduled task:**

```powershell
# Run weekly on Sunday at 2 AM
$action = New-ScheduledTaskAction -Execute "python" -Argument "scripts/run_full_stream_data_pipeline.py" -WorkingDirectory "C:\Users\Admin\Desktop\ARTi-project"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 2am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable
Register-ScheduledTask -TaskName "StreamDataWorkflow" -Action $action -Trigger $trigger -Settings $settings
```

---

## 🔐 Authentication

### Spotify for Artists Login

**First Run**:
- Browser window will open
- Manually log in to Spotify for Artists
- Session is saved and persists

**Subsequent Runs**:
- No login required (session persists)
- Automatic execution

**Session Expiry**:
- If session expires, the script will prompt for login
- Simply log in again when prompted

---

## 📊 Monitoring & Logs

### Log Files

**Workflow Log**:
```bash
logs/stream_data_workflow.log
```

**Individual Stage Logs**:
```bash
roster_scraper/data/roster_scraping_results_*.json
spotify_scraper/data/roster_*.json
```

### Success Metrics

**Check after each run**:

```sql
-- Recent imports
SELECT 
  last_scraped,
  COUNT(*) as playlist_count
FROM campaign_playlists
GROUP BY last_scraped
ORDER BY last_scraped DESC
LIMIT 5;

-- Campaign coverage
SELECT 
  COUNT(DISTINCT campaign_id) as campaigns_with_data
FROM campaign_playlists;
```

---

## 🐛 Troubleshooting

### Common Issues

**Issue**: `No campaigns found`
- **Cause**: CSV file not found or empty
- **Fix**: Ensure `Spotify Playlisting-Active Campaigns.csv` is in project root

**Issue**: `Login required`
- **Cause**: S4A session expired
- **Fix**: Run manually first to re-authenticate

**Issue**: `Playwright browser not found`
- **Cause**: Playwright not installed
- **Fix**: Run `playwright install chromium` in respective directory

**Issue**: `Database connection error`
- **Cause**: Supabase not running or env vars missing
- **Fix**: Start Supabase (`npx supabase start`) and check `.env`

---

## 🚀 Production Deployment

### Recommended Workflow: Local Scrape → Upload → Production Import

**This is the preferred method for production:**

1. **Scrape locally** (your machine, controlled environment)
2. **Upload data files** to production
3. **Import** to production database

**Benefits:**
- ⚡ **Fast**: Only 30-second import on production
- 🔒 **Safe**: Test locally before deploying
- 💰 **Efficient**: No 2-3 hour scraper on production server
- ♻️ **Reusable**: Deploy same data to multiple environments

### Quick Upload Commands

**Using PowerShell (Windows):**
```powershell
# Upload with helper script
.\scripts\upload_to_production.ps1 -ServerIP "164.90.129.146"

# Or manual scp
scp spotify_scraper/data/roster_*.json root@164.90.129.146:~/arti-marketing-ops/spotify_scraper/data/
```

**Using Bash (Linux/Mac):**
```bash
# Upload with helper script
bash scripts/upload_to_production.sh 164.90.129.146

# Or manual scp
scp spotify_scraper/data/roster_*.json root@164.90.129.146:~/arti-marketing-ops/spotify_scraper/data/
```

### Production Import Only

**On production server:**
```bash
# 1. SSH into production
ssh root@164.90.129.146

# 2. Navigate to project
cd ~/arti-marketing-ops

# 3. Activate venv (if using)
source venv/bin/activate

# 4. Import data
node scripts/import-roster-scraped-data.js

# Expected: ~30 seconds, processes 79 files, creates 1000+ playlist records
```

---

### Alternative: Run Complete Pipeline on Production

**For automated cron jobs or scheduled updates:**

```bash
# 1. SSH into production server
ssh user@your-server.com

# 2. Navigate to project
cd /path/to/ARTi-project

# 3. Pull latest code
git pull origin main

# 4. Install dependencies (first time only)
cd roster_scraper && pip install -r requirements.txt
cd ../spotify_scraper && pip install -r requirements.txt
cd ..

# 5. Run complete pipeline (takes 2-3 hours)
python scripts/run_full_stream_data_pipeline.py

# 6. Set up cron job for weekly updates
crontab -e
# Add: 0 2 * * 0 cd /path/to/ARTi-project && python3 scripts/run_full_stream_data_pipeline.py >> logs/stream_data_workflow.log 2>&1
```

---

## 📈 Performance Metrics

### Expected Execution Times

| Stage | Songs | Time | Notes |
|-------|-------|------|-------|
| **URL Collection** | 106 clients | ~15 min | Searches roster for each client |
| **Stream Scraping** | 80 songs | ~160 min | ~2 min per song (3 time ranges) |
| **Database Import** | 79 files | ~30 sec | Parses JSON and inserts |
| **Total** | - | **~3 hours** | Full end-to-end workflow |

### Optimization Tips

1. **Run during off-hours** (2-5 AM) to avoid peak times
2. **Weekly schedule** is sufficient for most use cases
3. **Monitor logs** for any failures
4. **Keep browser session** logged in to avoid authentication delays

---

## 🎯 Success Criteria

After each run, verify:

✅ **URL Collection**: `sfa-urls-simple_*.txt` file created  
✅ **Scraping**: New `roster_*.json` files in data directory  
✅ **Import**: Database records updated (check `last_scraped` timestamp)  
✅ **UI**: Playlist data visible in campaign cards  

---

## 📝 Maintenance

### Weekly Tasks
- ✅ Check logs for errors
- ✅ Verify data is updating in UI
- ✅ Monitor execution time

### Monthly Tasks
- ✅ Clean up old data files (keep last 2-3 runs)
- ✅ Update CSV with new campaigns
- ✅ Check for Spotify UI changes (scraper may need updates)

### Quarterly Tasks
- ✅ Review authentication status
- ✅ Update dependencies
- ✅ Optimize performance if needed

---

## 🆘 Support

**If the workflow fails:**

1. Check logs in `logs/stream_data_workflow.log`
2. Run each stage manually to isolate the issue
3. Verify environment variables and database connection
4. Check Spotify for Artists session status

**Manual stage execution:**

```bash
# Stage 1 only
cd roster_scraper && python run_roster_scraper.py

# Stage 2 only
cd spotify_scraper && python run_roster_urls.py

# Stage 3 only
node scripts/import-roster-scraped-data.js
```

---

**Workflow is now production-ready!** 🚀

