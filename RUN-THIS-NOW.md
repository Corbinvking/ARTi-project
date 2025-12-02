# 🚀 Run This Now to Fix and Test

**Quick fix for the "Missing X server" error**

---

## Copy-Paste These Commands

```bash
# 1. Pull the updated test script
cd /root/arti-marketing-ops
git pull origin main

# 2. Set headless mode in .env (avoids X server error)
cd spotify_scraper
if grep -q "HEADLESS=" .env; then
    sed -i 's/HEADLESS=.*/HEADLESS=true/' .env
else
    echo "HEADLESS=true" >> .env
fi
echo "✓ HEADLESS=true set in .env"

# 3. Run test with single campaign
cd /root/arti-marketing-ops
bash TEST-SCRAPER-FIXES.sh
```

---

## What This Does

1. **Pulls latest code** - Includes updated test script with Xvfb support
2. **Sets HEADLESS=true** - Browser runs without GUI (no X server needed)
3. **Runs test** - Scrapes 1 campaign and verifies both fixes

---

## Expected Output

```
============================================================
STEP 2: Run Scraper with Single Campaign
============================================================
✓ Loaded environment from .env
✓ Xvfb started on DISPLAY=:99

2025-12-02 20:50:00 - INFO - Found 1 campaigns with SFA URLs
2025-12-02 20:50:05 - INFO - ✓ Authentication verified, ready to scrape

[1/1] Processing campaign 123
  Extracting 24hour data...
    24hour: 1,234 streams, 15 playlists
  Extracting 7day data...
    7day: 8,567 streams, 15 playlists
  Extracting 28day data...
    28day: 34,890 streams, 15 playlists

[123] ✓ Raw data updated in spotify_campaigns
[123] ✓ Historical data saved to scraped_data table  ← FIX #1 ✓
[123] ✓ Synced 15 playlists (7 algorithmic, 8 vendor) ← FIX #2 ✓

============================================================
TEST SUMMARY
============================================================
  ✅ PASS - Historical Data
  ✅ PASS - Algorithmic Flags
  ✅ PASS - Recent Scrapes

  Total: 3/3 tests passed

🎉 All tests passed! Scraper fixes are working correctly.
```

---

## If It Still Fails

### Check .env file:
```bash
cat spotify_scraper/.env | grep HEADLESS
# Should show: HEADLESS=true
```

### Run with explicit headless:
```bash
cd /root/arti-marketing-ops/spotify_scraper
export HEADLESS=true
python3 run_production_scraper.py --limit 1
```

### Check Xvfb is running:
```bash
ps aux | grep Xvfb
# Should show Xvfb process running
```

---

## After Tests Pass

Run full scrape:
```bash
cd /root/arti-marketing-ops/spotify_scraper
python3 run_production_scraper.py
```

Or wait for cron job at 2 AM UTC (already scheduled).

---

**Ready!** Copy-paste the commands above into your SSH session. 🚀

