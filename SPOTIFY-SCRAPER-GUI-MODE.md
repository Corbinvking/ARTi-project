# 🎯 Spotify Scraper - GUI Mode Setup (FINAL FIX)

## 🔍 **Problem Identified:**

Headless mode doesn't render Spotify's dropdown menus, causing:
- ❌ "Could not find dropdown button"
- ❌ 0 playlists found (even on campaigns with data)

## ✅ **Solution: GUI Mode with Virtual Display**

Run the browser in GUI mode using **Xvfb** (X Virtual Frame Buffer) - a virtual display that doesn't require a physical monitor.

---

## 🚀 **Quick Deploy (Copy-Paste Commands)**

SSH to your droplet and run these commands:

```bash
# 1. Pull latest code
cd /root/arti-marketing-ops
git pull origin main

# 2. Setup GUI mode (installs Xvfb, updates configs)
cd spotify_scraper
chmod +x setup_gui_mode.sh
bash setup_gui_mode.sh
```

That's it! The script will:
1. ✅ Install Xvfb (virtual display)
2. ✅ Set `HEADLESS=false` in .env
3. ✅ Create wrapper scripts for virtual display
4. ✅ Update the daily cron script
5. ✅ Run a quick test

---

## 🧪 **Test the GUI Mode**

After setup completes, test with one campaign:

```bash
cd /root/arti-marketing-ops/spotify_scraper

# Option 1: Use the wrapper script
bash run_with_display.sh

# Option 2: Manual test
export DISPLAY=:99
Xvfb :99 -screen 0 1920x1080x24 &
python3 run_production_scraper.py
```

**Expected output:**
```
Running in GUI mode
✓ Login verified!
[1/131] Processing campaign...
Switching to 7day time range...
Clicked dropdown with selector: button:has-text("Last 28 days")
Selected option: Last 7 days
  Total streams from 4 playlists: 320  ← REAL DATA!
```

---

## 📊 **What You Should See:**

### ✅ **Success Indicators:**
- "Running in GUI mode"
- "Clicked dropdown with selector: ..."
- "Total streams from X playlists: Y" (where X > 0)
- Real stream counts (not 0)

### ❌ **If Still Failing:**
If you still see "Could not find dropdown button", check:
1. Xvfb is running: `ps aux | grep Xvfb`
2. DISPLAY is set: `echo $DISPLAY` (should show `:99`)
3. `.env` has `HEADLESS=false`

---

## 🤖 **Automated Daily Runs**

The cron job (2 AM daily) will automatically use GUI mode with Xvfb:

```bash
# View cron schedule
crontab -l

# Check if Xvfb is available
which Xvfb

# Test the daily script manually
bash /root/arti-marketing-ops/scripts/spotify-scraper-daily.sh
```

---

## 📈 **Monitor Progress**

Once running, monitor with:

```bash
# Real-time log
tail -f /var/log/spotify-scraper/production_scraper_*.log

# Check database updates
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  COUNT(*) as total,
  COUNT(last_scraped_at) as scraped,
  ROUND(COUNT(last_scraped_at)::numeric / COUNT(*)::numeric * 100, 1) as percent
FROM spotify_campaigns 
WHERE sfa LIKE 'https://artists.spotify.com%';
"

# View recently updated campaigns
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT campaign, streams_7d, playlists_7d_count, last_scraped_at 
FROM spotify_campaigns 
WHERE last_scraped_at IS NOT NULL 
ORDER BY last_scraped_at DESC 
LIMIT 10;
"
```

---

## 💡 **How It Works:**

```
┌─────────────────────────────────────────┐
│ Production Scraper                      │
├─────────────────────────────────────────┤
│  1. Start Xvfb (virtual display :99)    │
│  2. Export DISPLAY=:99                  │
│  3. Launch Chrome in GUI mode           │
│     - Renders ALL UI elements           │
│     - Dropdowns work ✅                 │
│     - Playlists load ✅                 │
│  4. Scrape data                         │
│  5. Stop Xvfb                           │
└─────────────────────────────────────────┘
```

**Benefits:**
- ✅ Full browser rendering
- ✅ All dropdowns work
- ✅ No visual monitor needed
- ✅ Same reliability as local GUI mode
- ✅ Minimal resource overhead

---

## 🎯 **Expected Timeline:**

After setup:
- **Test run**: 1-2 minutes (1 campaign)
- **Full run**: 2-3 hours (131 campaigns)
- **Daily automated**: 2 AM (all campaigns)

---

## ✅ **Success Criteria:**

You'll know it's working when you see:

1. ✅ "Running in GUI mode"
2. ✅ "Clicked dropdown with selector: ..."
3. ✅ "Total streams from X playlists: Y" where X > 0
4. ✅ Database shows real stream numbers (not all 0)

---

## 📞 **Quick Command Reference:**

```bash
# Setup GUI mode
cd /root/arti-marketing-ops/spotify_scraper && bash setup_gui_mode.sh

# Test GUI mode
bash run_with_display.sh

# Check logs
tail -f /var/log/spotify-scraper/*.log

# Verify database
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT COUNT(*) FILTER (WHERE streams_7d > 0) as with_data FROM spotify_campaigns;"
```

---

## 🎉 **That's It!**

GUI mode with Xvfb is the proven solution. Your local testing showed it works perfectly - now it'll work the same way on the server!

Run the setup script and you'll be scraping real data in minutes! 🚀

