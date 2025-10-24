# ⚡ Quick Start Guide

## 🚀 Run Complete Workflow (Easiest)

### **Windows:**
```bash
# Double-click or run:
RUN-COMPLETE-WORKFLOW.bat
```

### **PowerShell:**
```powershell
.\RUN-COMPLETE-WORKFLOW.ps1
```

### **Direct Python:**
```bash
python scripts/run_complete_workflow.py
```

---

## 🎯 What It Does

The complete workflow will:

1. ✅ **Sync CSV to Database** - Import campaigns, clients, vendors
2. ✅ **Collect SFA URLs** - Get Spotify for Artists URLs from Roster (requires login)
3. ✅ **Save URLs** - Store URLs in database
4. ✅ **Scrape Stream Data** - Get playlist and streaming data
5. ✅ **Import to Local** - Load data into local database
6. ✅ **Verify** - Check that data was imported correctly
7. ✅ **Generate SQL** - Create production import file
8. ✅ **Deploy** - Upload to production (optional)

**Total Time:** ~15-30 minutes

---

## 📋 Prerequisites

### **First Time Only:**

1. **Start Supabase:**
   ```bash
   supabase start
   ```

2. **Check Dependencies:**
   ```bash
   # Node.js (should already be installed)
   node --version
   
   # Python (should already be installed)
   python --version
   
   # Playwright (for scraping)
   pip install playwright
   playwright install chromium
   ```

---

## 🎮 Usage Options

### **Standard Run (Interactive):**
```bash
python scripts/run_complete_workflow.py
```
- Prompts for confirmation at each manual step
- Asks before deploying to production

### **Auto-Deploy:**
```bash
python scripts/run_complete_workflow.py --auto-deploy
```
- Automatically deploys to production without confirmation

### **Skip URL Collection:**
```bash
python scripts/run_complete_workflow.py --skip-urls
```
- Uses existing roster scraping results
- Useful if you already collected URLs

### **Skip Stream Scraping:**
```bash
python scripts/run_complete_workflow.py --skip-scrape
```
- Uses existing song data files
- Useful for re-importing existing data

### **Combine Options:**
```bash
python scripts/run_complete_workflow.py --skip-urls --skip-scrape --auto-deploy
```

---

## ⚠️ Manual Steps Required

### **1. Spotify for Artists Login (Stage 2)**
When the browser opens:
- Log in to Spotify for Artists
- Complete 2FA if prompted
- Wait for scraping to complete (~5-10 minutes)

### **2. Production Deployment (Stage 8)**
If not using `--auto-deploy`, you'll need to SSH to production:

```bash
ssh root@164.90.129.146
cd /root/arti-marketing-ops
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f IMPORT-SCRAPED-DATA.sql
```

Verify:
```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "SELECT COUNT(*) FROM campaign_playlists;"
```

---

## 📊 Expected Output

### **Successful Completion:**
```
================================================================================
🚀 Stage 1/8: Database Sync
================================================================================
✅ Database Sync - SUCCESS

================================================================================
🚀 Stage 2/8: Collect SFA URLs
================================================================================
✅ URL Collection - SUCCESS

... (stages 3-7) ...

================================================================================
🚀 Stage 8/8: Deploy to Production
================================================================================
✅ Upload to Production - SUCCESS

================================================================================
📊 WORKFLOW SUMMARY
================================================================================

✅ Completed Stages: 8
   ✓ Database Sync
   ✓ URL Collection
   ✓ Save URLs to Database
   ✓ Stream Data Scraping
   ✓ Local Database Import
   ✓ Generate Production SQL
   ✓ Upload to Production

================================================================================
🎉 WORKFLOW COMPLETE!
================================================================================
⏰ Finished at: 2025-10-24 15:30:45
```

---

## 🐛 Troubleshooting

### **"Supabase not running"**
```bash
supabase start
```

### **"Playlist scraper failed"**
- Make sure you're logged in to Spotify for Artists
- Check that browser didn't close
- Try running again (it will resume)

### **"No data imported"**
- Check that scraped files exist in `spotify_scraper/data/`
- Verify campaigns exist in database
- Check track IDs match between CSV and scraped data

### **"Production upload failed"**
- Verify SSH access: `ssh root@164.90.129.146`
- Check production server is accessible
- Ensure you have correct permissions

---

## 📖 More Information

- **Full Workflow Details:** See `COMPLETE-WORKFLOW-GUIDE.md`
- **Manual Steps:** See `AUTOMATED-STREAM-DATA-WORKFLOW.md`
- **Architecture:** See `SPOTIFY-PLATFORM-ARCHITECTURE.md`

---

## 🎯 Quick Commands Reference

```bash
# Complete workflow
python scripts/run_complete_workflow.py

# Just database sync
node scripts/run_full_database_sync.js

# Just URL collection
cd roster_scraper && python run_roster_scraper.py

# Just stream scraping
cd spotify_scraper && python run_s4a_list.py

# Just local import
node scripts/import-roster-scraped-data.js

# Generate production SQL
python scripts/generate_sql_import.py

# Check local data
psql postgresql://postgres:postgres@127.0.0.1:54321/postgres -c "SELECT COUNT(*) FROM campaign_playlists;"

# Check production data
ssh root@164.90.129.146
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "SELECT COUNT(*) FROM campaign_playlists;"
```

---

**Ready to run?** Just execute:
```bash
python scripts/run_complete_workflow.py
```

🚀 **Let's go!**

