# Quick Fix: Set Headless Mode

## Issue
Scraper fails with "Missing X server" error because it's trying to launch a GUI browser.

## Solution
Set `HEADLESS=true` in the environment to run browser in headless mode.

---

## Option 1: Set in .env file (Recommended)

```bash
cd /root/arti-marketing-ops/spotify_scraper

# Add or update HEADLESS setting
if grep -q "HEADLESS=" .env; then
    sed -i 's/HEADLESS=.*/HEADLESS=true/' .env
else
    echo "HEADLESS=true" >> .env
fi

# Verify
grep HEADLESS .env
```

---

## Option 2: Export in current session

```bash
export HEADLESS=true
python3 run_production_scraper.py --limit 1
```

---

## Option 3: Use production wrapper script

```bash
# The wrapper script handles Xvfb automatically
bash run_production_scraper.sh
```

**Note:** The wrapper script (`run_production_scraper.sh`) starts Xvfb, so GUI mode works.
The issue was running Python directly without Xvfb.

---

## After Fix

Re-run the test:
```bash
cd /root/arti-marketing-ops
bash TEST-SCRAPER-FIXES.sh
```

Expected output (no X server error):
```
[1/1] Processing campaign 123
  Extracting 24hour data...
[123] ✓ Historical data saved to scraped_data table
[123] ✓ Synced 15 playlists (7 algorithmic, 8 vendor)
```

