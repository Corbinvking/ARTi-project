#!/bin/bash

# ==========================================
#  Quick Login Fix for Spotify Scraper
# ==========================================

set -e

echo "=========================================="
echo "  Spotify Scraper - Login Fix"
echo "=========================================="
echo ""

# Navigate to project
cd /root/arti-marketing-ops

# Pull latest code
echo "[1/6] Pulling latest code..."
git pull origin main

# Ensure Xvfb is running
echo "[2/6] Starting Xvfb..."
if ! pgrep -x "Xvfb" > /dev/null; then
    Xvfb :99 -screen 0 1920x1080x24 &
    sleep 2
fi
export DISPLAY=:99

# Remove old browser session
echo "[3/6] Removing old browser session..."
rm -rf /root/arti-marketing-ops/spotify_scraper/browser_data/*

# Check for credentials
echo "[4/6] Checking credentials..."
cd spotify_scraper

if ! grep -q "SPOTIFY_EMAIL" .env || ! grep -q "SPOTIFY_PASSWORD" .env; then
    echo ""
    echo "⚠️  WARNING: Credentials not found in .env"
    echo ""
    echo "Please add to spotify_scraper/.env:"
    echo "  SPOTIFY_EMAIL=your-email@example.com"
    echo "  SPOTIFY_PASSWORD=your-password"
    echo ""
    echo "Run: nano spotify_scraper/.env"
    echo "Then re-run this script."
    exit 1
fi

# Load environment
source .env

echo "   Email: $SPOTIFY_EMAIL"
echo "   Mode: GUI (with Xvfb)"
echo ""

# Run login
echo "[5/6] Performing login..."
python3 login_on_server.py

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Login failed!"
    echo ""
    echo "Check the logs above for errors."
    echo "Common issues:"
    echo "  - Wrong email/password"
    echo "  - 2FA enabled on account"
    echo "  - Account doesn't have Spotify for Artists access"
    exit 1
fi

# Test with real campaign
echo ""
echo "[6/6] Testing with real campaign..."
bash test_real_campaign.sh

echo ""
echo "=========================================="
echo "  Fix Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. If test passed: python3 run_production_scraper.py"
echo "  2. Verify data on frontend UI"
echo "  3. Cron job will run automatically at 3 AM"

