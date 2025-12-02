# ✅ Scraper Fixes Ready to Test

**Date:** December 2, 2025  
**Status:** Ready for Production Testing

---

## 🎯 What Was Fixed

### Issue #1: No Historical Data ❌ → ✅ Fixed
**Before:** Every scrape overwrote previous data  
**After:** Each scrape creates a new historical record in `scraped_data` table

### Issue #2: Algorithmic Playlists Reset ❌ → ✅ Fixed
**Before:** Algorithmic flags reset to `FALSE` after each scrape  
**After:** Auto-detects and tags algorithmic playlists (Radio, Discover Weekly, etc.)

---

## 🚀 How to Test on Production

### Quick Test (Recommended First)

```bash
# SSH to server
ssh root@165.227.91.129

# Navigate to project
cd /root/arti-marketing-ops

# Pull latest code
git pull origin main

# Run automated test script
bash TEST-SCRAPER-FIXES.sh
```

This script will:
1. Pull latest code
2. Run scraper with 1 campaign
3. Verify historical data saved
4. Verify algorithmic flags set
5. Run full verification tests

---

### Manual Test (Alternative)

```bash
# SSH to server
ssh root@165.227.91.129
cd /root/arti-marketing-ops
git pull origin main

# Test with single campaign
cd spotify_scraper
python3 run_production_scraper.py --limit 1

# Verify Fix #1: Historical data
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT COUNT(*) as total_records, MAX(scraped_at) as last_scrape
FROM scraped_data;
"

# Verify Fix #2: Algorithmic flags
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT is_algorithmic, COUNT(*) as count
FROM campaign_playlists
GROUP BY is_algorithmic;
"

# Run verification script
python3 test_fixes.py
```

---

## ✅ Expected Results

### After Test Scrape

**Console Output:**
```
[1/1] Processing campaign 123
  Extracting 24hour data...
    24hour: 1,234 streams, 15 playlists
  ...
[123] ✓ Raw data updated in spotify_campaigns
[123] ✓ Historical data saved to scraped_data table  ← NEW!
[123] ✓ Synced 15 playlists (7 algorithmic, 8 vendor) ← NEW!

SCRAPING COMPLETE
Total campaigns: 1
Successful: 1
Failed: 0
Success rate: 100.0%
```

**Verification Script Output:**
```
TEST SUMMARY
============================================================
  ✅ PASS - Historical Data
  ✅ PASS - Algorithmic Flags  
  ✅ PASS - Recent Scrapes

  Total: 3/3 tests passed

🎉 All tests passed! Scraper fixes are working correctly.
```

---

## 🎨 Frontend Verification

After successful test:

1. Open https://artistinfluence.com
2. Navigate to Spotify app
3. Click on any campaign
4. Go to "Playlists" tab
5. **Verify:**
   - ✅ Green "Algorithmic" badges appear
   - ✅ "Spotify Algorithmic Playlists" section exists
   - ✅ Radio, Discover Weekly, Your DJ, etc. have badges
   - ✅ Vendor playlists don't have badges

---

## 📊 Database Verification

### Check Historical Data Growth

```sql
-- Should show increasing count after each scrape
SELECT 
    DATE(scraped_at) as date,
    COUNT(*) as scrapes_that_day
FROM scraped_data
GROUP BY DATE(scraped_at)
ORDER BY date DESC;
```

### Check Algorithmic vs Vendor Split

```sql
-- Should show TRUE and FALSE, not all FALSE
SELECT 
    is_algorithmic,
    COUNT(*) as playlist_count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentage
FROM campaign_playlists
GROUP BY is_algorithmic;
```

---

## 🔄 Next Steps

### If Tests Pass ✅

**Option 1:** Run full scrape immediately
```bash
cd /root/arti-marketing-ops/spotify_scraper
python3 run_production_scraper.py
```

**Option 2:** Wait for cron job at 2 AM UTC
```
Cron: 0 2 * * * cd /root/arti-marketing-ops && bash spotify_scraper/run_production_scraper.sh
```

### If Tests Fail ❌

1. Check error messages in console output
2. Review logs: `tail -f /root/arti-marketing-ops/spotify_scraper/logs/*.log`
3. Verify database columns exist:
   ```sql
   -- Check scraped_data table
   \d scraped_data
   
   -- Check is_algorithmic column
   \d campaign_playlists
   ```
4. Check environment variables: `cat /root/arti-marketing-ops/spotify_scraper/.env`
5. Contact support with logs

---

## 📝 Files Changed

- `spotify_scraper/run_production_scraper.py` - Both fixes implemented
- `spotify_scraper/test_fixes.py` - Verification script (NEW)
- `SCRAPER-FIXES-APPLIED.md` - Detailed deployment guide (NEW)
- `SCRAPER-ISSUES-ANALYSIS.md` - Root cause analysis (NEW)
- `TEST-SCRAPER-FIXES.sh` - Automated test script (NEW)

---

## 🆘 Quick Troubleshooting

### "scraped_data table does not exist"
```bash
cd /root/arti-marketing-ops
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -f supabase/migrations/012_create_scraped_data_table.sql
```

### "is_algorithmic column does not exist"
```bash
cd /root/arti-marketing-ops
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -f supabase/migrations/033_add_algorithmic_playlists.sql
```

### "Login failed / CAPTCHA challenge"
```bash
# Use VNC to manually login and establish session
vncviewer 165.227.91.129:5901
# Password: yourVNCpassword
# Then run: python3 spotify_scraper/manual_browser_login.py
```

---

## 📞 Support

- **Issues:** Check `SCRAPER-FIXES-APPLIED.md` for detailed troubleshooting
- **Logs:** `/root/arti-marketing-ops/spotify_scraper/logs/`
- **Database:** `docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres`

---

**Ready to test!** 🚀  
Run: `bash TEST-SCRAPER-FIXES.sh` on production server

