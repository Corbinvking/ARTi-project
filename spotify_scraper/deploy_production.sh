#!/bin/bash
# Spotify Scraper Production Deployment Script
# Run this on the production droplet to deploy the scraper

set -e  # Exit on any error

echo "========================================"
echo "  Spotify Scraper Production Deploy"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
REPO_DIR="/root/arti-marketing-ops"
SCRAPER_DIR="$REPO_DIR/spotify_scraper"
LOG_DIR="/var/log/spotify-scraper"
CRON_SCHEDULE="0 2 * * *"  # Run at 2 AM daily

echo -e "${YELLOW}[1/8]${NC} Pulling latest code from GitHub..."
cd "$REPO_DIR"
git pull origin main
echo -e "${GREEN}✓${NC} Code updated"
echo ""

echo -e "${YELLOW}[2/8]${NC} Installing Python dependencies..."
cd "$SCRAPER_DIR"

# Check Python version
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "Python version: $PYTHON_VERSION"

# Install dependencies with --break-system-packages for Python 3.13+
if python3 -c "import sys; exit(0 if sys.version_info >= (3, 11) else 1)"; then
    echo "Using --break-system-packages flag for Python 3.11+"
    pip3 install --break-system-packages -r requirements.txt
else
    pip3 install -r requirements.txt
fi
echo -e "${GREEN}✓${NC} Dependencies installed"
echo ""

echo -e "${YELLOW}[3/8]${NC} Installing Playwright browsers..."
python3 -m playwright install chromium
python3 -m playwright install-deps chromium || echo "Warning: Some system dependencies may be missing"
echo -e "${GREEN}✓${NC} Playwright installed"
echo ""

echo -e "${YELLOW}[4/8]${NC} Setting up environment variables..."
if [ ! -f "$SCRAPER_DIR/.env" ]; then
    echo -e "${RED}✗${NC} .env file not found!"
    echo "Please create $SCRAPER_DIR/.env with the following variables:"
    echo "  SPOTIFY_EMAIL=tribe@artistinfluence.com"
    echo "  SPOTIFY_PASSWORD=UE_n7C*8wgxe9!P4abtK"
    echo "  SUPABASE_URL=http://localhost:54321"
    echo "  SUPABASE_SERVICE_ROLE_KEY=<your-key-here>"
    echo "  HEADLESS=true"
    echo ""
    echo "Use the template: cp production.env.example .env"
    echo "Then edit .env with the correct values"
    exit 1
else
    echo -e "${GREEN}✓${NC} .env file exists"
fi
echo ""

echo -e "${YELLOW}[5/8]${NC} Checking browser session data..."
if [ -d "$SCRAPER_DIR/data/browser_data" ]; then
    echo -e "${GREEN}✓${NC} Browser session data exists"
else
    echo -e "${YELLOW}⚠${NC}  Browser session data not found"
    echo "You'll need to transfer browser_session.tar.gz from your local machine:"
    echo "  From local: scp browser_session.tar.gz root@165.227.91.129:/root/arti-marketing-ops/spotify_scraper/"
    echo "  On droplet: cd /root/arti-marketing-ops/spotify_scraper && tar -xzf browser_session.tar.gz"
    echo ""
    echo "For now, the scraper will attempt auto-login (may require CAPTCHA on first run)"
fi
echo ""

echo -e "${YELLOW}[6/8]${NC} Creating log directory..."
mkdir -p "$LOG_DIR"
chmod 755 "$LOG_DIR"
echo -e "${GREEN}✓${NC} Log directory ready: $LOG_DIR"
echo ""

echo -e "${YELLOW}[7/8]${NC} Testing scraper (dry run on 1 campaign)..."
cd "$SCRAPER_DIR"
echo "Running test scrape..."
timeout 120 python3 run_production_scraper.py || {
    echo -e "${YELLOW}⚠${NC}  Test run timed out or failed"
    echo "This is normal if login requires manual intervention on first run"
    echo "Check logs in $LOG_DIR for details"
}
echo -e "${GREEN}✓${NC} Test complete (check logs for results)"
echo ""

echo -e "${YELLOW}[8/8]${NC} Setting up cron job..."
CRON_CMD="$CRON_SCHEDULE cd $SCRAPER_DIR && bash scripts/spotify-scraper-daily.sh >> $LOG_DIR/cron.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "spotify-scraper-daily.sh"; then
    echo -e "${YELLOW}⚠${NC}  Cron job already exists, updating..."
    # Remove old entry and add new one
    (crontab -l 2>/dev/null | grep -v "spotify-scraper-daily.sh"; echo "$CRON_CMD") | crontab -
else
    # Add new cron job
    (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
fi
echo -e "${GREEN}✓${NC} Cron job configured to run at 2 AM daily"
echo ""

echo "========================================"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Verify cron job: crontab -l"
echo "  2. Check logs: tail -f $LOG_DIR/production_scraper_*.log"
echo "  3. Manual test run: cd $SCRAPER_DIR && python3 run_production_scraper.py"
echo ""
echo "Scraper will run daily at 2 AM to update all campaigns"
echo "Logs will be saved to: $LOG_DIR"
echo ""

