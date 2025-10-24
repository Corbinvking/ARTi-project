# 🚀 Complete Local Workflow Guide

## Overview

This workflow will:
1. ✅ Sync 653 campaigns to your **local database**
2. 🔍 Run **Roster Scraper** to collect Spotify for Artists URLs
3. 📊 Run **Stream Data Scraper** to get playlist/stream data
4. 💾 Import all data into your **local database**
5. 🚀 Deploy everything to **production**

---

## Prerequisites

Before starting, ensure:
- ✅ Local Supabase is running (`supabase start`)
- ✅ Python virtual environment is activated
- ✅ All dependencies installed (`npm install`, `pip install -r requirements.txt`)
- ✅ `full-databse-chunk.csv` exists in project root

---

## 🎯 Method 1: One-Click Workflow (Recommended)

### Windows (Batch):
```batch
RUN-COMPLETE-LOCAL-WORKFLOW.bat
```

### Windows (PowerShell):
```powershell
.\RUN-COMPLETE-LOCAL-WORKFLOW.ps1
```

This will automatically run all 4 stages in sequence!

---

## 🔧 Method 2: Manual Step-by-Step

If you prefer to run each stage manually or need to debug:

### Stage 1: Sync Local Database (653 Campaigns)

```batch
REM Windows
RUN-FULL-DATABASE-SYNC.bat
```

```bash
# Or manually
node scripts/run_full_database_sync.js
```

**What this does:**
- Syncs 228 clients from CSV
- Syncs 9 vendors from CSV
- Imports all 653 campaigns
- Links campaigns to clients/vendors
- Creates 653 campaign groups
- Sets correct source/type for UI
- Verifies everything

**Expected Result:**
```
✅ Campaigns: 653
✅ Clients: 228
✅ Vendors: 9
✅ Campaign Groups: 653
✅ Relationships linked: 603 (92.3%)
```

---

### Stage 2: Collect SFA URLs (Roster Scraper)

```batch
cd roster_scraper
python run_roster_scraper.py
```

**What this does:**
- Reads all 653 campaigns from CSV
- Logs into Spotify for Artists
- For each client, finds their artist in the Roster
- Navigates to their Songs page
- Matches songs to campaign names
- Extracts SFA URLs for each song
- Saves URLs to `roster_scraper/scraped_data/`

**Expected Result:**
```
✅ Processed 203 clients
✅ Found 585+ SFA URLs
✅ Data saved to scraped_data/roster_urls_{timestamp}.json
```

**Manual Login:**
The scraper will pause and ask you to log in manually. When you see:
```
⏸️  Please log in manually in the browser...
   Press Enter when logged in and on the Artists page...
```
1. Go to the browser window that opened
2. Log into Spotify for Artists
3. Wait for the Artists/Roster page to load
4. Press Enter in the terminal

---

### Stage 3: Scrape Stream Data

```batch
cd spotify_scraper
python run_s4a_list.py
```

**What this does:**
- Reads the SFA URLs from Stage 2
- Navigates to each song's stats page
- Scrapes:
  - Playlist data (name, curator, streams, date added)
  - Stream counts (7-day, 28-day, 12-month)
  - Algorithmic playlists (Discover Weekly, Radio, etc.)
- Saves data to `spotify_scraper/scraped_data/`

**Expected Result:**
```
✅ Processed 585 tracks
✅ Collected playlist data for each
✅ Data saved to scraped_data/track_{id}_data.json
```

---

### Stage 4: Import Data to Local Database

```bash
node scripts/import-roster-scraped-data.js
```

**What this does:**
- Reads all scraped JSON files from Stage 3
- Matches tracks to campaigns in database
- Creates/updates records in `campaign_playlists` table:
  - Playlist name, curator
  - Stream counts (7d, 28d, 12m)
  - Date added
  - Is algorithmic flag
- Links playlists to campaigns

**Expected Result:**
```
✅ Found 585 scraped files
✅ Matched 585 campaigns
✅ Processed 5000+ playlists
✅ Data imported to campaign_playlists
```

---

## 📊 Stage 5: Verify Local Data

### Check Campaign Count:
```bash
node -e "import {createClient} from '@supabase/supabase-js'; const s=createClient('http://127.0.0.1:54321',process.env.SUPABASE_SERVICE_ROLE_KEY); const {count}=await s.from('spotify_campaigns').select('*',{count:'exact',head:true}); console.log('Campaigns:',count);"
```

### Check Playlist Data:
```bash
node -e "import {createClient} from '@supabase/supabase-js'; const s=createClient('http://127.0.0.1:54321',process.env.SUPABASE_SERVICE_ROLE_KEY); const {count}=await s.from('campaign_playlists').select('*',{count:'exact',head:true}); console.log('Playlists:',count);"
```

### Check Local UI:
1. Open `http://localhost:3000`
2. Go to Campaigns tab
3. Click on a campaign (e.g., "Segan - DNBMF")
4. Should see:
   - ✅ Spotify algorithmic playlists at top
   - ✅ Vendor playlists below
   - ✅ Stream counts (7d, 28d)

---

## 🚀 Stage 6: Deploy to Production

Once local data looks good:

### Method A: Auto Deploy (Recommended)
```bash
# On local machine, push code
git add .
git commit -m "Add stream data"
git push origin main

# On production server
ssh root@164.90.129.146
cd /root/arti-marketing-ops
git pull origin main

# Run the same workflow on production
./RUN-COMPLETE-LOCAL-WORKFLOW.bat
```

### Method B: Manual Data Upload
```powershell
# Upload scraped JSON files
scp -r spotify_scraper/scraped_data/*.json root@164.90.129.146:/root/arti-marketing-ops/spotify_scraper/scraped_data/

# SSH to production and import
ssh root@164.90.129.146
cd /root/arti-marketing-ops
node scripts/import-roster-scraped-data.js
```

---

## 🆘 Troubleshooting

### Issue: "No campaigns in database"
```bash
# Re-run database sync
node scripts/run_full_database_sync.js
```

### Issue: "Roster scraper can't find artists"
- Make sure you're logged into the correct Spotify for Artists account
- Check that artists are actually in your Roster
- Try searching manually in the Roster to verify

### Issue: "Stream scraper times out"
- This is normal for large datasets
- The scraper will auto-resume from where it left off
- Just run `python run_s4a_list.py` again

### Issue: "Import script can't find campaigns"
- Make sure campaigns have `url` or `sfa` column populated
- Check track IDs match between scraper output and database

### Issue: "No data in UI"
```bash
# Check RLS policies
node scripts/check_rls_policies.js

# Re-create campaign groups
node scripts/create_campaign_groups_from_campaigns.js
```

---

## 📈 Expected Timeline

For 653 campaigns:
- Stage 1 (DB Sync): **~5 minutes**
- Stage 2 (Roster Scraper): **~2-4 hours** (depends on # of clients and songs)
- Stage 3 (Stream Scraper): **~3-6 hours** (depends on # of tracks)
- Stage 4 (Import): **~5-10 minutes**

**Total: 5-10 hours** (mostly automated, you can leave it running)

---

## ✅ Success Checklist

- [ ] Local database has 653 campaigns
- [ ] Roster scraper collected 585+ SFA URLs
- [ ] Stream scraper processed all tracks
- [ ] Local database has 5000+ playlist records
- [ ] Local UI shows campaigns with playlist data
- [ ] Production deployed and matches local

---

## 💡 Pro Tips

1. **Run overnight**: Stages 2-3 take several hours - run before bed!
2. **Keep browser open**: Don't close the Playwright browser during scraping
3. **Check logs**: All scrapers create detailed logs in their directories
4. **Incremental updates**: You can re-run any stage without affecting others
5. **Backup first**: Before production deploy, backup your database

---

## 🎉 You're Done!

Once complete, you'll have:
- ✅ 653 campaigns with full metadata
- ✅ 585+ songs with Spotify for Artists URLs
- ✅ 5000+ playlist placements tracked
- ✅ Real stream data (7d, 28d, 12m)
- ✅ Algorithmic vs. vendor playlist classification
- ✅ Everything synced to production

**Now you can track campaign performance in real-time!** 🚀

