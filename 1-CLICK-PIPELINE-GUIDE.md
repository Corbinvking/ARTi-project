# 🎯 1-Click Complete Pipeline Guide

**From CSV to Production in ONE Command!**

---

## ⚡ Quick Start

### **Windows Users**

**Double-click this file:**
```
RUN-COMPLETE-PIPELINE.bat
```

Or run in terminal:
```powershell
.\RUN-COMPLETE-PIPELINE.ps1
```

### **All Users**

```bash
python scripts/run_complete_pipeline.py
```

---

## 🎬 What Happens When You Run It

### **Stage 1: URL Collection** (~15-20 min)
- ✅ Reads your `Spotify Playlisting-Active Campaigns.csv`
- ✅ Navigates to Spotify for Artists Roster
- ✅ Searches for each artist
- ✅ Extracts SFA URLs for all songs
- 📁 **Output**: `roster_scraper/data/sfa-urls-simple_*.txt`

### **Stage 2: Stream Data Scraping** (~2-3 hours)
- ✅ Reads collected SFA URLs
- ✅ Logs into Spotify for Artists (one-time login)
- ✅ Scrapes playlist data for each song
- ✅ Gets 3 time ranges: 28 days, 7 days, 12 months
- 📁 **Output**: `spotify_scraper/data/roster_*.json` (79 files)

### **Stage 3: Local Database Import** (~30 sec)
- ✅ Reads all scraped JSON files
- ✅ Matches track IDs to campaigns
- ✅ Creates playlist records in local database
- 💾 **Result**: ~1,000+ records in `campaign_playlists` table

### **Stage 4: Local Verification** (~5 sec)
- ✅ Queries local database
- ✅ Counts playlist records
- ✅ Confirms data integrity

### **Stage 5: Production Upload** (~2 min)
- ✅ Uploads all 79 JSON files to production server
- ✅ Uses SCP (secure copy)
- 🌐 **Target**: `root@164.90.129.146:~/arti-marketing-ops/`

### **Stage 6: Production Import** (~30 sec)
- ✅ SSHs into production server
- ✅ Runs import script
- ✅ Creates playlist records in production database
- 🚀 **Result**: Data live on https://artistinfluence.com

---

## 📊 Expected Results

### **Local Database**
```
✅ Data files processed: 79
✅ Campaigns updated: 28-60
✅ Playlists processed: 741-1,471
```

### **Production Database**
```
✅ Data files processed: 79
✅ Campaigns updated: 60+
✅ Playlists processed: 1,471+
```

### **Total Time**
- **Full pipeline**: ~3 hours
- **Production deployment**: ~3 minutes

---

## 🎛️ Advanced Options

### **Use Custom CSV**
```bash
python scripts/run_complete_pipeline.py --csv "path/to/custom-campaigns.csv"
```

### **Local Only (Test Mode)**
Skip production deployment to test locally first:
```bash
python scripts/run_complete_pipeline.py --local-only
```

Then later, deploy to production:
```bash
python scripts/run_complete_pipeline.py --production-only
```

### **Custom Server**
```bash
python scripts/run_complete_pipeline.py --server-ip "192.168.1.100"
```

---

## 🔍 Verify Results

### **Check Local UI**
```
http://localhost:3000
→ Navigate to Campaigns
→ Click on a campaign
→ See playlist data
```

### **Check Production UI**
```
https://artistinfluence.com
→ Navigate to Campaigns
→ Click on a campaign
→ See playlist data
```

### **Check Database Directly**

**Local:**
```bash
npx supabase db execute "SELECT COUNT(*) FROM campaign_playlists;"
```

**Production:**
```bash
ssh root@164.90.129.146
cd ~/arti-marketing-ops
npx supabase db execute --linked "SELECT COUNT(*) FROM campaign_playlists;"
```

---

## 📋 Prerequisites

### **First Time Setup**

1. **Install Dependencies**
   ```bash
   # Roster scraper
   cd roster_scraper
   pip install -r requirements.txt
   playwright install chromium
   
   # Spotify scraper
   cd ../spotify_scraper
   pip install -r requirements.txt
   
   # Node.js
   cd ..
   npm install
   ```

2. **CSV File**
   - Place `Spotify Playlisting-Active Campaigns.csv` in project root
   - Must have columns: Client, Campaign, URL, SFA, Status

3. **Environment Variables**
   - `.env` file with Supabase credentials
   - Local and production Supabase URLs

4. **SSH Access**
   - SSH key configured for production server
   - Ability to run: `ssh root@164.90.129.146`

---

## 🔄 Weekly Workflow

### **Recommended Schedule**

**Every Sunday at 10 AM:**

1. **Update CSV** with new campaigns (if any)
2. **Run 1-click pipeline**:
   ```
   RUN-COMPLETE-PIPELINE.bat
   ```
3. **Go do something else** for 3 hours
4. **Come back** to updated production data
5. **Verify** in UI

### **Automated Schedule (Optional)**

**Windows Task Scheduler:**
```powershell
# Create task to run every Sunday at 10 AM
$action = New-ScheduledTaskAction -Execute "python" -Argument "scripts\run_complete_pipeline.py" -WorkingDirectory "C:\Users\Admin\Desktop\ARTi-project"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 10am
Register-ScheduledTask -TaskName "StreamDataPipeline" -Action $action -Trigger $trigger
```

---

## 🐛 Troubleshooting

### **Issue: "No campaigns found"**
- **Fix**: Check CSV file exists and has active campaigns

### **Issue: "Login required"**
- **Fix**: Run manually first time to log in to Spotify for Artists
- Browser will open for you to log in
- Session persists for future runs

### **Issue: "Upload failed"**
- **Fix**: Check SSH access: `ssh root@164.90.129.146`
- Verify server IP is correct

### **Issue: "Import failed on production"**
- **Fix**: SSH in and check logs:
  ```bash
  ssh root@164.90.129.146
  cd ~/arti-marketing-ops
  tail -100 logs/stream_data_workflow.log
  ```

---

## 📈 Performance Tips

### **Speed Up Scraping**
- ✅ Run on fast internet connection
- ✅ Keep browser logged in
- ✅ Run during off-peak hours

### **Reduce Production Time**
- ✅ Use upload method (not full scraping on production)
- ✅ SCP is fast for file transfer
- ✅ Production import is always quick (~30 sec)

### **Optimize Workflow**
- ✅ Test with `--local-only` first
- ✅ Verify data before deploying
- ✅ Keep scraped files for re-deployment

---

## 🎉 Success Criteria

After running the pipeline, you should see:

### **Terminal Output**
```
✅ Stage 1 (URL Collection):        SUCCESS
✅ Stage 2 (Stream Scraping):       SUCCESS
✅ Stage 3 (Local Import):          SUCCESS
✅ Stage 4 (Local Verification):    SUCCESS
✅ Stage 5 (Production Upload):     SUCCESS
✅ Stage 6 (Production Import):     SUCCESS

🌐 Production Deployment Complete!
   Check your production UI: https://artistinfluence.com

💾 Local Database Updated!
   Check your local UI: http://localhost:3000
```

### **UI**
- Campaigns show playlist cards
- Stream counts visible (28d, 7d, 12m)
- Algorithmic playlists separated
- Vendor playlists displayed

### **Database**
- 1,000+ playlist records
- 60+ campaigns with data
- Recent timestamps

---

## 📞 Need Help?

**Quick Diagnostics:**
```bash
# Check local data
npx supabase db execute "SELECT COUNT(*) FROM campaign_playlists;"

# Check production data
ssh root@164.90.129.146 "cd ~/arti-marketing-ops && npx supabase db execute --linked 'SELECT COUNT(*) FROM campaign_playlists;'"

# View logs
cat logs/last_successful_run.txt
```

**Documentation:**
- Full Workflow: `AUTOMATED-STREAM-DATA-WORKFLOW.md`
- Production Guide: `PRODUCTION-DEPLOYMENT-SUCCESS.md`
- Quick Reference: `STREAM-DATA-QUICK-START.md`

---

## 🎊 Summary

**One Command. Complete Pipeline. Production Ready.**

```
CSV → URLs → Scraping → Local DB → Production DB → Live UI
```

**Just run:**
```
RUN-COMPLETE-PIPELINE.bat
```

**And you're done!** ✅

---

**Happy scraping!** 🚀

