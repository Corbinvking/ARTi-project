# Fix: Remove HEADLESS=true Setting

## Problem Identified

The scraper was **working fine on cron** because it was running in **GUI mode with Xvfb**.

When we set `HEADLESS=true`, Spotify's React/SPA page doesn't fully render - JavaScript doesn't execute properly, so no content appears.

**Diagnostic output showed:**
```
.song-title: 0 found
h1: 0 found
main: 0 found
```

This is because the page shell loads but React content doesn't render in true headless mode.

---

## Solution

**Remove `HEADLESS=true` from .env** and let the wrapper script handle Xvfb:

```bash
cd /root/arti-marketing-ops/spotify_scraper

# Remove the HEADLESS line from .env
sed -i '/HEADLESS=/d' .env

# Verify it's gone
grep HEADLESS .env || echo "✓ HEADLESS removed"
```

---

## Why This Works

The `run_production_scraper.sh` wrapper script:
1. Starts **Xvfb** (virtual X server)
2. Sets `DISPLAY=:99`
3. Runs browser in **GUI mode** (but on virtual display)
4. Spotify's page **fully renders** with JavaScript

**Code from wrapper (line 21-29):**
```bash
# Set up display for GUI mode (Xvfb required for Playwright)
export DISPLAY=:99

# Start Xvfb if not running
if ! pgrep -x "Xvfb" > /dev/null; then
    echo "Starting Xvfb for GUI mode..."
    Xvfb :99 -screen 0 1920x1080x24 > /dev/null 2>&1 &
    sleep 2
fi
```

**Python default (line 492):**
```python
headless = os.getenv('HEADLESS', 'false').lower() == 'true'
# Defaults to FALSE = GUI mode!
```

---

## Test After Fix

```bash
cd /root/arti-marketing-ops/spotify_scraper

# Remove HEADLESS setting
sed -i '/HEADLESS=/d' .env

# Test with wrapper script (uses Xvfb)
cd /root/arti-marketing-ops
bash spotify_scraper/run_production_scraper.sh
```

Or test single campaign:
```bash
cd /root/arti-marketing-ops/spotify_scraper

# Ensure Xvfb is running
export DISPLAY=:99
if ! pgrep -x "Xvfb" > /dev/null; then
    Xvfb :99 -screen 0 1920x1080x24 > /dev/null 2>&1 &
    sleep 2
fi

# Run without HEADLESS=true
python3 run_production_scraper.py --limit 1
```

---

## Why Cron Was Working

The cron job calls the **wrapper script**:
```
0 2 * * * cd /root/arti-marketing-ops && bash spotify_scraper/run_production_scraper.sh
```

This wrapper:
- ✅ Starts Xvfb
- ✅ Runs in GUI mode (default)
- ✅ Pages fully render
- ✅ Scraping works!

---

## Summary

**DON'T SET:** `HEADLESS=true`  
**DO USE:** The wrapper script with Xvfb  
**REASON:** Spotify's SPA needs full browser rendering

---

**Quick Fix:**
```bash
cd /root/arti-marketing-ops/spotify_scraper && sed -i '/HEADLESS=/d' .env && cd /root/arti-marketing-ops && bash spotify_scraper/run_production_scraper.sh
```

