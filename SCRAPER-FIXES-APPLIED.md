# Scraper Fixes Applied

**Date:** December 2, 2025  
**Status:** ✅ Fixed & Ready for Testing

---

## 🔧 Fixes Implemented

### Fix #1: Historical Data Preservation

**Problem:** Scraper was overwriting data in `spotify_campaigns.scrape_data` with no historical tracking.

**Solution:** Added `save_to_scraped_data_table()` function that INSERTs a new row into `scraped_data` table after each successful scrape.

**Code Changes:**
- Added new function at line ~307 in `run_production_scraper.py`
- Called from main scraping loop at line ~585
- Each scrape now creates a permanent historical record

**Benefits:**
- ✅ Historical data preserved indefinitely
- ✅ Can track trends over weeks/months
- ✅ No data loss between scrapes
- ✅ Full JSON payload saved in `raw_data` column

---

### Fix #2: Algorithmic Playlist Persistence

**Problem:** Scraper was resetting `is_algorithmic` flags to `FALSE` after each scrape, causing algorithmic playlists (Radio, Discover Weekly, etc.) to appear as vendor playlists.

**Solution:** Added `is_algorithmic_playlist()` detection function that auto-tags playlists during the sync process.

**Code Changes:**
- Added `is_algorithmic_playlist()` helper function at line ~305
- Modified `sync_to_campaign_playlists()` to set `is_algorithmic` flag at line ~430
- Playlists now auto-detected based on name patterns

**Detection Patterns:**
```python
ALGORITHMIC_PATTERNS = [
    'radio',
    'discover weekly',
    'your dj',
    'daylist',
    'mixes',
    'release radar',
    'daily mix',
    'on repeat',
    'repeat rewind'
]
```

**Benefits:**
- ✅ No manual tagging needed after scrapes
- ✅ Consistent UI display
- ✅ New algorithmic playlists auto-detected
- ✅ Frontend shows correct badges

---

## 📊 Testing Instructions

### Before Full Scrape - Test with 1 Campaign

**On Production Server:**

```bash
# SSH to server
ssh root@165.227.91.129

# Navigate to project
cd /root/arti-marketing-ops

# Pull latest code
git pull origin main

# Activate environment (if needed)
cd spotify_scraper

# Run with LIMIT 1 to test
python3 run_production_scraper.py --limit 1
```

**Expected Output:**
```
[1/1] Processing campaign 123
  Extracting 24hour data...
    24hour: 1,234 streams, 15 playlists
  Extracting 7day data...
    7day: 8,567 streams, 15 playlists
  Extracting 28day data...
    28day: 34,890 streams, 15 playlists
[123] ✓ Raw data updated in spotify_campaigns (with trend history)
[123] ✓ Historical data saved to scraped_data table  ← FIX #1
[123] ✓ Synced 15 playlists (7 algorithmic, 8 vendor) ← FIX #2
```

---

### Verify Fix #1: Historical Data

**Check scraped_data table:**
```bash
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
    id,
    artist_name,
    song_title,
    scraped_at,
    platform
FROM scraped_data
ORDER BY scraped_at DESC
LIMIT 10;
"
```

**Expected:**
- ✅ New row(s) appear after test scrape
- ✅ `scraped_at` timestamp is recent
- ✅ `raw_data` column contains full JSON

**Run verification script:**
```bash
python3 spotify_scraper/test_fixes.py
```

---

### Verify Fix #2: Algorithmic Playlists

**Check campaign_playlists flags:**
```bash
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
    is_algorithmic,
    COUNT(*) as count,
    ARRAY_AGG(DISTINCT playlist_name) FILTER (WHERE is_algorithmic) as algorithmic_examples,
    ARRAY_AGG(DISTINCT playlist_name) FILTER (WHERE NOT is_algorithmic) as vendor_examples
FROM campaign_playlists
GROUP BY is_algorithmic;
"
```

**Expected:**
- ✅ `is_algorithmic = true` for Radio, Discover Weekly, Your DJ, etc.
- ✅ `is_algorithmic = false` for vendor playlists
- ✅ Counts look reasonable (not all FALSE)

**Check in Frontend:**
1. Open campaign details modal
2. Go to "Playlists" tab
3. Verify green "Algorithmic" badges appear
4. Verify "Spotify Algorithmic Playlists" section exists

---

## 🚀 Full Deployment

Once test scrape passes:

### 1. Verify Test Results

```bash
# Run verification script
python3 spotify_scraper/test_fixes.py
```

**All tests should PASS:**
- ✅ Historical Data
- ✅ Algorithmic Flags
- ✅ Recent Scrapes

---

### 2. Run Full Scrape (Optional)

```bash
# Run full scrape immediately (no limit)
python3 run_production_scraper.py
```

**Or wait for cron job at 2 AM UTC:**
```bash
# Cron job will run automatically
0 2 * * * cd /root/arti-marketing-ops && bash spotify_scraper/run_production_scraper.sh
```

---

### 3. Monitor First Full Run

**Watch logs:**
```bash
tail -f /root/arti-marketing-ops/spotify_scraper/logs/scraper_$(date +\%Y\%m\%d).log
```

**Check for:**
- ✅ "Historical data saved to scraped_data table" for each campaign
- ✅ "Synced X playlists (Y algorithmic, Z vendor)" with Y > 0
- ✅ No errors or warnings

---

### 4. Verify Database After Full Run

**Count historical records:**
```bash
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
    COUNT(*) as total_historical_records,
    COUNT(DISTINCT artist_name) as unique_artists,
    MIN(scraped_at) as first_scrape,
    MAX(scraped_at) as last_scrape
FROM scraped_data;
"
```

**Check algorithmic vs vendor breakdown:**
```bash
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
    is_algorithmic,
    COUNT(*) as playlist_count,
    SUM(streams_24h) as total_24h_streams
FROM campaign_playlists
GROUP BY is_algorithmic
ORDER BY is_algorithmic DESC;
"
```

---

## 🎯 Success Criteria

### Fix #1: Historical Data
- ✅ `scraped_data` table grows with each scrape
- ✅ New rows inserted, old rows preserved
- ✅ Can query historical trends over time
- ✅ No data loss between scrapes

### Fix #2: Algorithmic Playlists
- ✅ Algorithmic playlists have `is_algorithmic = true`
- ✅ Vendor playlists have `is_algorithmic = false`
- ✅ Frontend shows green "Algorithmic" badges
- ✅ Badges persist after scrapes
- ✅ No manual re-tagging needed

---

## 📝 Files Modified

1. **`spotify_scraper/run_production_scraper.py`**
   - Added `is_algorithmic_playlist()` function (line ~305)
   - Added `save_to_scraped_data_table()` function (line ~324)
   - Modified `sync_to_campaign_playlists()` to set `is_algorithmic` (line ~430)
   - Updated main loop to call historical save (line ~585)

2. **`spotify_scraper/test_fixes.py`** (NEW)
   - Verification script for both fixes
   - Tests historical data, algorithmic flags, and recent scrapes

3. **`SCRAPER-FIXES-APPLIED.md`** (NEW)
   - This documentation file

---

## 🔄 Rollback Plan

If issues arise, rollback to previous version:

```bash
cd /root/arti-marketing-ops
git log --oneline -5  # Find commit hash before fixes
git checkout <previous-commit-hash> spotify_scraper/run_production_scraper.py
python3 run_production_scraper.py --limit 1  # Test
```

Then manually tag algorithmic playlists:
```bash
bash scripts/tag-algorithmic-playlists.sh
```

---

## 📞 Support

**If tests fail:**
1. Check logs in `spotify_scraper/logs/`
2. Verify database schema has required columns
3. Run `test_fixes.py` for detailed diagnostics
4. Check Supabase connection and credentials

**Common Issues:**
- `scraped_data` table missing: Run migration `012_create_scraped_data_table.sql`
- `is_algorithmic` column missing: Run migration `033_add_algorithmic_playlists.sql`
- Permission errors: Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly

---

**Status:** ✅ Ready for Production Testing  
**Next Step:** Run `python3 run_production_scraper.py --limit 1` on production server

