#!/bin/bash
# Safe Deployment Script for Spotify Scraper
# Run this after pulling code to ensure everything is configured correctly

set -e

echo "=========================================="
echo "Spotify Scraper Deployment Script"
echo "=========================================="
echo ""

# Change to script directory
cd "$(dirname "$0")"

echo "📦 Step 1: Pulling latest code..."
git pull origin main
echo "✅ Code updated"
echo ""

echo "🔧 Step 2: Restoring executable permissions..."
chmod +x spotify_scraper/*.sh 2>/dev/null || true
chmod +x spotify_scraper/*.py 2>/dev/null || true
ls -lah spotify_scraper/*.sh spotify_scraper/*.py | grep "^-rwx"
echo "✅ Permissions restored"
echo ""

echo "⏰ Step 3: Verifying cron job..."
if crontab -l | grep -q "run_production_scraper.sh"; then
    echo "✅ Cron job exists:"
    crontab -l | grep "run_production_scraper.sh"
else
    echo "⚠️  WARNING: Cron job not found!"
    echo "Add this to crontab:"
    echo "0 2 * * * cd /root/arti-marketing-ops && bash spotify_scraper/run_production_scraper.sh >> /root/arti-marketing-ops/spotify_scraper/logs/cron.log 2>&1"
fi
echo ""

echo "🖥️  Step 4: Checking Xvfb..."
if pgrep -x "Xvfb" > /dev/null; then
    echo "✅ Xvfb is running on display :99"
else
    echo "⚠️  WARNING: Xvfb is not running!"
    echo "Start it with: Xvfb :99 -screen 0 1920x1080x24 &"
fi
echo ""

echo "🌐 Step 5: Testing API connectivity..."
if curl -f -s -o /dev/null https://api.artistinfluence.com/rest/v1/; then
    echo "✅ API is reachable"
else
    echo "❌ ERROR: API is NOT reachable!"
    echo "This will prevent the scraper from working."
    exit 1
fi
echo ""

echo "🗄️  Step 6: Testing database connection..."
if docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database is accessible"
else
    echo "❌ ERROR: Cannot connect to database!"
    exit 1
fi
echo ""

echo "📊 Step 7: Checking last scrape..."
LAST_SCRAPE=$(docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -t -c "
SELECT campaign, last_scraped_at 
FROM spotify_campaigns 
WHERE last_scraped_at IS NOT NULL 
ORDER BY last_scraped_at DESC 
LIMIT 1;
" 2>/dev/null)

if [ -n "$LAST_SCRAPE" ]; then
    echo "✅ Last scrape found:"
    echo "$LAST_SCRAPE"
else
    echo "⚠️  No scrape data found in database"
fi
echo ""

echo "🧪 Step 8: Validating environment variables..."
cd spotify_scraper
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    
    # Check required variables (without printing values)
    if grep -q "SUPABASE_URL=" .env && \
       grep -q "SUPABASE_SERVICE_ROLE_KEY=" .env && \
       grep -q "SPOTIFY_EMAIL=" .env && \
       grep -q "SPOTIFY_PASSWORD=" .env; then
        echo "✅ Required environment variables present"
    else
        echo "❌ ERROR: Missing required environment variables!"
        echo "Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SPOTIFY_EMAIL, SPOTIFY_PASSWORD"
        exit 1
    fi
else
    echo "❌ ERROR: .env file not found!"
    exit 1
fi
cd ..
echo ""

echo "📝 Step 9: Checking logs directory..."
if [ -d "spotify_scraper/logs" ]; then
    echo "✅ Logs directory exists"
    echo "Recent log files:"
    ls -lht spotify_scraper/logs/ | head -5
else
    echo "⚠️  Creating logs directory..."
    mkdir -p spotify_scraper/logs
    echo "✅ Logs directory created"
fi
echo ""

echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Wait for next cron run (2:00 AM UTC)"
echo "2. Or test manually: cd spotify_scraper && bash run_production_scraper.sh"
echo "3. Monitor health: bash spotify_scraper/check_scraper_health.sh"
echo ""

