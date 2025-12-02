#!/bin/bash
#
# Test Scraper Fixes on Production Server
# Run this script to test both fixes with a single campaign
#
# Usage: bash TEST-SCRAPER-FIXES.sh
#

echo "============================================================"
echo "TESTING SCRAPER FIXES - Single Campaign Test"
echo "============================================================"
echo ""
echo "This will:"
echo "  1. Pull latest code with fixes"
echo "  2. Run scraper with --limit 1 (single campaign)"
echo "  3. Verify historical data saved to scraped_data"
echo "  4. Verify algorithmic playlists properly tagged"
echo ""
read -p "Press Enter to continue..."

# Navigate to project directory
cd /root/arti-marketing-ops || exit 1

echo ""
echo "============================================================"
echo "STEP 1: Pull Latest Code"
echo "============================================================"
git pull origin main

echo ""
echo "============================================================"
echo "STEP 2: Run Scraper with Single Campaign"
echo "============================================================"
cd spotify_scraper

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
    echo "✓ Loaded environment from .env"
fi

# Ensure Xvfb is running (required for browser)
export DISPLAY=:99
if ! pgrep -x "Xvfb" > /dev/null; then
    echo "Starting Xvfb..."
    Xvfb :99 -screen 0 1920x1080x24 > /dev/null 2>&1 &
    sleep 2
    echo "✓ Xvfb started on DISPLAY=:99"
fi

# Run scraper with limit 1
python3 run_production_scraper.py --limit 1

echo ""
echo "============================================================"
echo "STEP 3: Verify Historical Data (scraped_data table)"
echo "============================================================"
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
    COUNT(*) as total_records,
    MAX(scraped_at) as last_scrape
FROM scraped_data;
"

echo ""
echo "Recent scrapes:"
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
    id,
    artist_name,
    song_title,
    scraped_at
FROM scraped_data
ORDER BY scraped_at DESC
LIMIT 5;
"

echo ""
echo "============================================================"
echo "STEP 4: Verify Algorithmic Playlist Flags"
echo "============================================================"
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
    is_algorithmic,
    COUNT(*) as count
FROM campaign_playlists
GROUP BY is_algorithmic
ORDER BY is_algorithmic DESC;
"

echo ""
echo "Algorithmic playlist examples:"
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
    playlist_name,
    is_algorithmic,
    streams_24h
FROM campaign_playlists
WHERE is_algorithmic = true
ORDER BY streams_24h DESC NULLS LAST
LIMIT 10;
"

echo ""
echo "============================================================"
echo "STEP 5: Run Full Verification Script"
echo "============================================================"
python3 test_fixes.py

echo ""
echo "============================================================"
echo "TEST COMPLETE"
echo "============================================================"
echo ""
echo "If all tests passed, you can run the full scraper:"
echo "  python3 run_production_scraper.py"
echo ""
echo "Or wait for the cron job at 2 AM UTC:"
echo "  0 2 * * * cd /root/arti-marketing-ops && bash spotify_scraper/run_production_scraper.sh"
echo ""

