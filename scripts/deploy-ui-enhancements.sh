#!/bin/bash

# Deploy Spotify UI Enhancements Script
# This script deploys the enhanced Campaign History UI and updated scraper

set -e  # Exit on error

echo "🚀 Deploying Spotify UI Enhancements..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on production server
if [ ! -d "/root/arti-marketing-ops" ]; then
    echo "❌ Error: Not on production server"
    echo "This script must be run on the production server"
    exit 1
fi

cd /root/arti-marketing-ops

# Step 1: Pull latest code
echo "📥 Step 1: Pulling latest code from GitHub..."
git fetch origin
git pull origin main
echo -e "${GREEN}✓ Code updated${NC}"
echo ""

# Step 2: Deploy scraper updates
echo "🤖 Step 2: Deploying scraper updates..."
cd /root/arti-marketing-ops
bash scripts/deploy-spotify-scraper.sh
echo -e "${GREEN}✓ Scraper updated${NC}"
echo ""

# Step 3: Rebuild and restart frontend
echo "🎨 Step 3: Rebuilding frontend with new UI..."
cd /root/arti-marketing-ops
docker-compose -f docker-compose.prod.yml build frontend
echo -e "${GREEN}✓ Frontend built${NC}"
echo ""

echo "🔄 Step 4: Restarting frontend container..."
docker-compose -f docker-compose.prod.yml up -d frontend
echo -e "${GREEN}✓ Frontend restarted${NC}"
echo ""

# Step 5: Wait for frontend to start
echo "⏳ Step 5: Waiting for frontend to start (30 seconds)..."
sleep 30
echo -e "${GREEN}✓ Frontend should be ready${NC}"
echo ""

# Step 6: Check frontend logs
echo "📋 Step 6: Checking frontend logs (last 20 lines)..."
docker-compose -f docker-compose.prod.yml logs --tail=20 frontend
echo ""

# Step 7: Verify cron job
echo "⏰ Step 7: Verifying scraper cron job..."
if crontab -l | grep -q "run_production_scraper.sh"; then
    echo -e "${GREEN}✓ Cron job active${NC}"
    crontab -l | grep "run_production_scraper.sh"
else
    echo -e "${YELLOW}⚠ Warning: Cron job not found${NC}"
    echo "To add cron job, run:"
    echo "  crontab -e"
    echo "  Add: 0 2 * * * cd /root/arti-marketing-ops && bash spotify_scraper/run_production_scraper.sh >> /root/arti-marketing-ops/spotify_scraper/logs/cron.log 2>&1"
fi
echo ""

# Step 8: Run manual scrape (optional)
echo "🔍 Step 8: Testing scraper..."
echo "Running manual scrape to populate trend data..."
cd /root/arti-marketing-ops/spotify_scraper
bash run_production_scraper.sh &
SCRAPE_PID=$!
echo "Scraper started in background (PID: $SCRAPE_PID)"
echo "Check logs: tail -f /root/arti-marketing-ops/spotify_scraper/logs/production.log"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 What's New:"
echo "  • 24h/7d stream data (instead of estimated daily/weekly)"
echo "  • 🟢🔴 Trend indicators (↑/↓ changes from last scrape)"
echo "  • 🎯 SFA URL status badges (Active/Stale/No URL)"
echo "  • Enhanced CSV export with new fields"
echo "  • SFA status filter in Campaign History"
echo ""
echo "🧪 Testing Checklist:"
echo "  1. Open: https://artistinfluence.com/spotify/stream-strategist/campaigns"
echo "  2. Look for green SFA badges on campaigns with URLs"
echo "  3. Check 24h/7d stream columns show real data"
echo "  4. After scraper runs twice, look for trend indicators (↑/↓)"
echo "  5. Hover over SFA badges to see tooltips"
echo "  6. Try SFA status filter dropdown"
echo "  7. Export CSV and verify new columns"
echo ""
echo "📝 Logs to Monitor:"
echo "  • Frontend: docker-compose -f docker-compose.prod.yml logs -f frontend"
echo "  • Scraper: tail -f /root/arti-marketing-ops/spotify_scraper/logs/production.log"
echo ""
echo "📚 Documentation:"
echo "  • SPOTIFY-UI-ENHANCEMENTS.md - Complete feature documentation"
echo "  • SPOTIFY-SCRAPER-SYSTEM-DOCS.md - Scraper system docs"
echo ""
echo -e "${YELLOW}Note: Trend indicators will appear after scraper runs at least twice${NC}"
echo -e "${YELLOW}      (current scrape vs previous scrape comparison)${NC}"
echo ""



