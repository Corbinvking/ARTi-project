# 🚀 Run Complete Workflow for All 653 Campaigns

## ⚡ Quick Start

**Run this command:**

```bash
python scripts/run_complete_workflow.py
```

Or **double-click**: `RUN-COMPLETE-WORKFLOW.bat`

---

## 📋 What Will Happen

### **Stage 1: Database Already Synced** ✅
- 653 campaigns already in database
- 203 clients synced
- Should take ~1 minute to verify

### **Stage 2: Collect SFA URLs** (10-15 min)
⚠️ **MANUAL STEP REQUIRED:**
- Browser will open automatically
- **YOU MUST**: Log in to Spotify for Artists
- Script will search for all 203 artists
- Will find and save SFA URLs for all songs found

### **Stage 3: Save URLs** (30 seconds)
- Automatically saves URLs to database
- Updates `spotify_campaigns.sfa` column

### **Stage 4: Scrape Stream Data** (20-30 min)
- Visits each song's SFA stats page
- Collects:
  - Playlist names
  - Stream counts (28d, 7d, 12m)
  - Playlist curators
  - Date added
- Creates `spotify_scraper/data/song_*.json` files
- **Supports resume** if interrupted

### **Stage 5: Import to Local** (2-3 min)
- Loads all scraped data into local database
- Populates `campaign_playlists` table
- Links playlists to campaigns

### **Stage 6: Verify Local** (30 seconds)
- Checks playlist count
- Verifies campaigns have data

### **Stage 7: Generate Production SQL** (30 seconds)
- Creates `IMPORT-SCRAPED-DATA.sql`
- Ready for production import

### **Stage 8: Deploy to Production** (5 min)
- Uploads SQL file
- Provides SSH instructions for final import

---

## ⏱️ Total Time Estimate

- **Minimum:** ~35 minutes (if everything goes smoothly)
- **Maximum:** ~60 minutes (with interruptions/retries)

**Breakdown:**
- Database verification: 1 min
- URL collection: 10-15 min (depends on login speed)
- Stream scraping: 20-30 min (2-3 sec per song × 110 expected matches)
- Import & deploy: 5-8 min

---

## 🎯 Expected Results

### **After Completion:**

#### **Local Database:**
```sql
SELECT COUNT(*) FROM campaign_playlists;
-- Expected: 1,500+ playlists

SELECT COUNT(DISTINCT campaign_id) FROM campaign_playlists;
-- Expected: 110+ campaigns with data (from 653 total)
```

#### **UI Changes:**
When you click on a campaign, you'll see:
1. ✅ **"Spotify for Artists Link"** section (NEW!)
   - Clickable link that opens SFA stats page
   - Only shows for campaigns with scraped data
2. ✅ **Stream data** in playlists section
   - 28-day, 7-day, 12-month streams
   - Playlist names and curators
3. ✅ **Algorithmic playlists** separated
   - Discover Weekly, Radio, etc.

---

## 🐛 Troubleshooting

### **"Supabase not running"**
```bash
supabase start
```

### **Roster Scraper - "No artists found"**
- Verify you're logged into Spotify for Artists
- Check your account has Roster access
- Some artists may not be in YOUR specific Roster

### **Stream Scraper - "Restarting from beginning"**
- **It's OK!** The scraper checks for existing files
- It will skip already-scraped songs
- Just let it run

### **"No playlists found for song X"**
- Song might not have any playlist data yet
- This is normal for new releases
- Scraper continues with next song

### **Script interrupted?**
```bash
# Resume from where you left off:
python scripts/run_complete_workflow.py --skip-urls
```

---

## 📊 What You'll See in the UI

### **Before Scraping:**
```
Campaign Card:
├─ Campaign Name
├─ Client Name  
├─ Spotify Track Link (if exists)
└─ Basic info (budget, status, etc.)
```

### **After Scraping:**
```
Campaign Card:
├─ Campaign Name
├─ Client Name
├─ Spotify Track Link (if exists)
├─ **🆕 Spotify for Artists Link** ← NEW!
├─ Basic info
└─ Playlists Section:
    ├─ Algorithmic Playlists (Spotify curated)
    │   ├─ Discover Weekly (streams: 1,234)
    │   ├─ Radio (streams: 567)
    │   └─ ...
    └─ Vendor Playlists
        ├─ Playlist A (vendor: X, streams: 890)
        └─ ...
```

---

## 🎮 Running the Workflow

### **Option 1: Automated (Recommended)**
```bash
python scripts/run_complete_workflow.py
```
- Prompts for confirmation at manual steps
- Shows progress for each stage
- Provides helpful error messages

### **Option 2: With Auto-Deploy**
```bash
python scripts/run_complete_workflow.py --auto-deploy
```
- Skips deployment confirmation
- Auto-uploads to production

### **Option 3: Resume from Specific Stage**
```bash
# Skip URL collection (use existing)
python scripts/run_complete_workflow.py --skip-urls

# Skip scraping (use existing data)
python scripts/run_complete_workflow.py --skip-scrape

# Skip both (just import)
python scripts/run_complete_workflow.py --skip-urls --skip-scrape
```

---

## ✅ Success Checklist

After running, verify:

- [ ] **Local database has playlists:**
  ```bash
  psql postgresql://postgres:postgres@127.0.0.1:54321/postgres -c "SELECT COUNT(*) FROM campaign_playlists;"
  ```
  Expected: 1,500+

- [ ] **Campaigns have SFA links:**
  ```bash
  psql postgresql://postgres:postgres@127.0.0.1:54321/postgres -c "SELECT COUNT(*) FROM spotify_campaigns WHERE sfa IS NOT NULL;"
  ```
  Expected: 110+

- [ ] **UI shows SFA links:**
  - Open any campaign with stream data
  - Should see "Spotify for Artists Link" section
  - Link should open SFA stats page

- [ ] **Production has data:**
  ```bash
  ssh root@164.90.129.146
  psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "SELECT COUNT(*) FROM campaign_playlists;"
  ```
  Expected: Same as local

---

## 🚀 Ready to Run?

1. Make sure Supabase is running:
   ```bash
   supabase start
   ```

2. Run the workflow:
   ```bash
   python scripts/run_complete_workflow.py
   ```

3. Follow the prompts!

**Let's get that stream data!** 🎵

