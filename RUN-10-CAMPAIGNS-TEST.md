# Test 10 Campaigns with Wrapper Script

## Quick Test Command

```bash
cd /root/arti-marketing-ops/spotify_scraper

# Remove HEADLESS=true if it exists
sed -i '/HEADLESS=/d' .env

# Ensure Xvfb is running
export DISPLAY=:99
if ! pgrep -x "Xvfb" > /dev/null; then
    echo "Starting Xvfb..."
    Xvfb :99 -screen 0 1920x1080x24 > /dev/null 2>&1 &
    sleep 2
fi

# Run 10 campaigns
python3 run_production_scraper.py --limit 10
```

---

## What to Expect

### Success Output:
```
✓ Existing session found! Already logged in.
✓ Authentication verified, ready to scrape

[1/10] Processing campaign 7343
  Extracting 24hour data...
    24hour: 1,234 streams, 15 playlists
  Extracting 7day data...
    7day: 8,567 streams, 15 playlists
  Extracting 28day data...
    28day: 34,890 streams, 15 playlists

[7343] ✓ Raw data updated in spotify_campaigns
[7343] ✓ Historical data saved to scraped_data table     ← FIX #1 ✓
[7343] ✓ Synced 15 playlists (7 algorithmic, 8 vendor)  ← FIX #2 ✓

[2/10] Processing campaign...
...

SCRAPING COMPLETE
Total campaigns: 10
Successful: 10
Failed: 0
Success rate: 100.0%
```

---

## After Completion - Verify Both Fixes

### Verify FIX #1: Historical Data Saved
```bash
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT artist_name) as unique_artists,
    MAX(scraped_at) as most_recent
FROM scraped_data;
"
```

**Expected:** Should show 10 new records

---

### Verify FIX #2: Algorithmic Playlists Tagged
```bash
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
    is_algorithmic,
    COUNT(*) as count
FROM campaign_playlists
GROUP BY is_algorithmic
ORDER BY is_algorithmic DESC;
"
```

**Expected:** Should show `t` (true) with count > 0

```bash
# Show recent algorithmic playlists
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
    cp.playlist_name,
    cp.is_algorithmic,
    cp.streams_24h,
    sc.campaign
FROM campaign_playlists cp
JOIN spotify_campaigns sc ON cp.campaign_id = sc.id
WHERE cp.is_algorithmic = true
ORDER BY sc.last_scraped_at DESC NULLS LAST
LIMIT 10;
"
```

---

## Copy-Paste Full Test

```bash
# Navigate and clean up HEADLESS setting
cd /root/arti-marketing-ops/spotify_scraper
sed -i '/HEADLESS=/d' .env

# Start Xvfb
export DISPLAY=:99
if ! pgrep -x "Xvfb" > /dev/null; then
    Xvfb :99 -screen 0 1920x1080x24 > /dev/null 2>&1 &
    sleep 2
fi

# Run 10 campaigns
python3 run_production_scraper.py --limit 10

# Verify FIX #1: Historical data
echo ""
echo "=== Verifying FIX #1: Historical Data ==="
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT COUNT(*) as total_records, MAX(scraped_at) as most_recent 
FROM scraped_data;
"

# Verify FIX #2: Algorithmic flags
echo ""
echo "=== Verifying FIX #2: Algorithmic Playlists ==="
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT is_algorithmic, COUNT(*) as count 
FROM campaign_playlists 
GROUP BY is_algorithmic;
"

# Show examples
echo ""
echo "=== Recent Algorithmic Playlists ==="
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT playlist_name, streams_24h 
FROM campaign_playlists 
WHERE is_algorithmic = true 
ORDER BY streams_24h DESC NULLS LAST 
LIMIT 10;
"
```

---

**Ready to run!** This will test 10 campaigns with full rendering (Xvfb) and verify both fixes. 🚀

