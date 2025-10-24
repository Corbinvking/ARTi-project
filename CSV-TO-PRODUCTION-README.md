# 🎯 CSV to Production - Complete Automation

## ⚡ TL;DR

**Go from CSV file to production in one command:**

```bash
python scripts/run_complete_workflow.py
```

Or just **double-click**: `RUN-COMPLETE-WORKFLOW.bat`

---

## 📋 What You Get

### **Before:**
- ❌ Manual CSV data entry
- ❌ Tedious URL collection
- ❌ Time-consuming scraping
- ❌ Complex database imports
- ❌ Production deployment headaches

### **After:**
- ✅ Automated database sync
- ✅ Automatic URL collection (with Spotify login)
- ✅ Smart stream data scraping
- ✅ One-click local import
- ✅ Simple production deployment

---

## 🚀 Quick Start

### **1. Prerequisites (One-Time)**
```bash
# Start Supabase
supabase start

# Check dependencies (should already be installed)
python --version
node --version
```

### **2. Run the Workflow**
```bash
python scripts/run_complete_workflow.py
```

### **3. Follow the Prompts**
- Login to Spotify for Artists when prompted
- Confirm production deployment when ready

### **4. Done!**
Your production database now has all campaign data with streaming stats.

---

## 📚 Documentation

- **⚡ Quick Start:** `QUICK-START.md` - Get running fast
- **📋 Complete Guide:** `COMPLETE-WORKFLOW-GUIDE.md` - Full details
- **📊 Summary:** `WORKFLOW-SUMMARY.md` - Visual overview
- **✅ Success:** `PRODUCTION-IMPORT-SUCCESS.md` - What success looks like

---

## 🎮 Advanced Usage

### **Skip Already Completed Steps:**
```bash
# Use existing URLs
python scripts/run_complete_workflow.py --skip-urls

# Use existing scraped data
python scripts/run_complete_workflow.py --skip-scrape

# Auto-deploy without confirmation
python scripts/run_complete_workflow.py --auto-deploy
```

### **Run Individual Stages:**
```bash
# Database sync only
node scripts/run_full_database_sync.js

# URL collection only
cd roster_scraper && python run_roster_scraper.py

# Scraping only
cd spotify_scraper && python run_s4a_list.py

# Import only
node scripts/import-roster-scraped-data.js
```

---

## 📊 Results

### **Local Database:**
- 653 campaigns synced
- 203 clients
- 69+ campaigns with streaming data
- 1,706+ playlist records

### **Production Database:**
- Mirror of local (1:1)
- All streaming data
- Ready for client reporting

---

## ⏱️ Time Required

**Total:** ~15-30 minutes

| Stage | Time |
|-------|------|
| Database Sync | 1-2 min |
| URL Collection | 5-10 min |
| Stream Scraping | 5-10 min |
| Import & Deploy | 2-3 min |

---

## 🎯 Success Criteria

✅ **Local verification:**
```bash
psql postgresql://postgres:postgres@127.0.0.1:54321/postgres -c "SELECT COUNT(*) FROM campaign_playlists;"
# Expected: 1,706+
```

✅ **Production verification:**
```bash
ssh root@164.90.129.146
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "SELECT COUNT(*) FROM campaign_playlists;"
# Expected: Same as local
```

✅ **UI verification:**
- Campaign cards show playlist data
- Stream counts visible (28d, 7d, 12m)
- Algorithmic vs vendor playlists separated

---

## 🐛 Troubleshooting

### **Supabase not running?**
```bash
supabase start
```

### **Login fails?**
- Use manual browser login
- Complete 2FA if prompted
- Try again

### **No data imported?**
- Check scraped files exist in `spotify_scraper/data/`
- Verify campaigns in database
- Review error messages

### **Production issues?**
- Check SSH access: `ssh root@164.90.129.146`
- Verify `postgresql-client` installed
- Review SQL execution logs

---

## 🎉 You're Done!

Your production environment now has:
- ✅ Complete campaign database
- ✅ Real Spotify streaming data
- ✅ Full playlist information
- ✅ Ready for reporting

**Need help?** Check the documentation files listed above.

---

**Let's make campaign management easy!** 🚀

