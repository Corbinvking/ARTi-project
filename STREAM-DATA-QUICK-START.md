# 🚀 Stream Data Workflow - Quick Start

**TL;DR** - Get stream data into your database in 3 commands

---

## ⚡ Super Quick Start

```bash
# Run the complete pipeline
python scripts/run_full_stream_data_pipeline.py
```

That's it! This single command will:
1. ✅ Collect SFA URLs from Roster
2. ✅ Scrape stream data  
3. ✅ Import to database

---

## 📝 Manual Step-by-Step

If you prefer to run each stage separately:

### 1. Collect URLs (15 min)
```bash
cd roster_scraper
python run_roster_scraper.py
```

### 2. Scrape Data (2-3 hours)
```bash
cd ../spotify_scraper
python run_roster_urls.py
```

### 3. Import to DB (30 sec)
```bash
cd ..
node scripts/import-roster-scraped-data.js
```

---

## 🔁 Schedule Automatic Updates

### Linux/Mac
```bash
crontab -e
# Add this line (runs every Sunday at 2 AM):
0 2 * * 0 cd /path/to/project && python3 scripts/run_full_stream_data_pipeline.py >> logs/workflow.log 2>&1
```

### Windows
```powershell
# Create scheduled task
$action = New-ScheduledTaskAction -Execute "python" -Argument "scripts/run_full_stream_data_pipeline.py" -WorkingDirectory "C:\path\to\project"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 2am
Register-ScheduledTask -TaskName "StreamDataWorkflow" -Action $action -Trigger $trigger
```

---

## 📊 Check Results

### In UI
1. Open your application
2. Navigate to Campaigns
3. Click on a campaign
4. See playlist data with stream counts

### In Database
```sql
SELECT COUNT(*) FROM campaign_playlists;
-- Should show ~741 records
```

---

## 📚 Full Documentation

- **Complete Workflow Guide**: `AUTOMATED-STREAM-DATA-WORKFLOW.md`
- **Production Deployment**: `DEPLOY-STREAM-DATA-TO-PRODUCTION.md`
- **Import Results**: `ROSTER-SCRAPER-DATA-IMPORT-COMPLETE.md`

---

## 🆘 Quick Troubleshooting

| Issue | Fix |
|-------|-----|
| "Login required" | Run `python spotify_scraper/run_roster_urls.py` manually and log in |
| "No campaigns found" | Check CSV file is present and has active campaigns |
| "Database error" | Verify Supabase is running: `npx supabase status` |
| "Browser not found" | Install Playwright: `cd roster_scraper && playwright install chromium` |

---

**Need help?** Check the full docs linked above! 📚

