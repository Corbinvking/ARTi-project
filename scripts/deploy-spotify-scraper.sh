#!/bin/bash
# Deploy updated Spotify scraper to production
# Run this script on the production server after pulling latest code

set -e  # Exit on error

echo "=========================================="
echo " SPOTIFY SCRAPER PRODUCTION DEPLOYMENT"
echo "=========================================="
echo ""

# Navigate to project directory
cd /root/ARTi-project

echo "[1/6] Pulling latest code from GitHub..."
git pull origin main
echo "✓ Code updated"
echo ""

# Navigate to scraper directory
cd spotify_scraper

echo "[2/6] Updating Python dependencies..."
pip3 install -r requirements-scraper-only.txt --upgrade
echo "✓ Dependencies updated"
echo ""

echo "[3/6] Ensuring Playwright browser is installed..."
python3 -m playwright install chromium
echo "✓ Browser installed"
echo ""

echo "[4/6] Checking Xvfb (GUI mode)..."
if pgrep -x "Xvfb" > /dev/null; then
    echo "✓ Xvfb already running"
else
    echo "Starting Xvfb..."
    Xvfb :99 -screen 0 1280x1024x24 &
    sleep 2
    echo "✓ Xvfb started"
fi
echo ""

echo "[5/6] Testing with single campaign..."
export DISPLAY=:99
python3 run_production_scraper.py --limit 1
echo "✓ Test successful"
echo ""

echo "[6/6] Applying database migration..."
cd /root/ARTi-project
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/042_add_timerange_columns.sql
echo "✓ Migration applied"
echo ""

echo "=========================================="
echo " DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Verify test results above"
echo "  2. Check frontend UI for updated data"
echo "  3. Run full scraper: python3 run_production_scraper.py"
echo "  4. Cron job will run automatically at 2 AM daily"
echo ""
echo "Monitor logs:"
echo "  tail -f /root/logs/spotify-scraper-cron.log"
echo ""

