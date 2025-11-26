#!/bin/bash

# One-Time Initial Login Script
# Run this ONCE to establish the browser session and solve any CAPTCHA
# After this, the automated scraper will reuse the session

set -e

cd /root/arti-marketing-ops/spotify_scraper

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 SPOTIFY FOR ARTISTS - INITIAL LOGIN SETUP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This script will:"
echo "  1. Open Spotify for Artists in a browser"
echo "  2. Allow you to login manually (and solve CAPTCHA if needed)"
echo "  3. Save the session for automated runs"
echo ""
echo "After this completes, the cron job will work automatically!"
echo ""
read -p "Press Enter to continue..."

# Ensure display is set
export DISPLAY=:99

# Start Xvfb if not running
if ! pgrep -x "Xvfb" > /dev/null; then
    echo "Starting Xvfb..."
    Xvfb :99 -screen 0 1920x1080x24 > /dev/null 2>&1 &
    sleep 2
fi

# Load environment
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Create browser data directory
USER_DATA_DIR="/root/arti-marketing-ops/spotify_scraper/data/browser_data"
mkdir -p "$USER_DATA_DIR"

echo ""
echo "📂 Browser data will be saved to: $USER_DATA_DIR"
echo ""
echo "🚀 Starting browser..."
echo "   (The browser will open in GUI mode on display :99)"
echo ""

# Run the existing login script (it uses persistent context)
python3 login_on_server.py

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ INITIAL LOGIN COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Session saved to: $USER_DATA_DIR"
echo ""
echo "🎯 Next Steps:"
echo "  1. Test the scraper:"
echo "     cd /root/arti-marketing-ops/spotify_scraper"
echo "     bash run_production_scraper.sh"
echo ""
echo "  2. The cron job will now work automatically at 2 AM UTC"
echo ""
echo "  3. If you ever need to re-login, just run this script again"
echo ""

