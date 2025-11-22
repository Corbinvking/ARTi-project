#!/bin/bash
# Quick GUI mode setup - skips apt update to avoid PPA errors

set -e

echo "=========================================="
echo "  Quick GUI Mode Setup"
echo "=========================================="
echo ""

# Install Xvfb directly (skip update)
echo "[1/4] Installing Xvfb..."
apt-get install -y xvfb 2>&1 | grep -v "does not have a Release file" || true
echo "✓ Xvfb installed"
echo ""

# Update .env to use GUI mode
echo "[2/4] Configuring scraper for GUI mode..."
cd /root/arti-marketing-ops/spotify_scraper

if [ -f .env ]; then
    if grep -q "HEADLESS=" .env; then
        sed -i 's/HEADLESS=.*/HEADLESS=false/' .env
        echo "✓ Updated HEADLESS=false in .env"
    else
        echo "HEADLESS=false" >> .env
        echo "✓ Added HEADLESS=false to .env"
    fi
else
    echo "✗ .env file not found!"
    exit 1
fi
echo ""

# Create wrapper script
echo "[3/4] Creating wrapper script..."
cat > run_with_display.sh << 'EOF'
#!/bin/bash
export DISPLAY=:99
Xvfb :99 -screen 0 1920x1080x24 > /dev/null 2>&1 &
XVFB_PID=$!
sleep 2
cd /root/arti-marketing-ops/spotify_scraper
python3 run_production_scraper.py
kill $XVFB_PID 2>/dev/null || true
EOF

chmod +x run_with_display.sh
echo "✓ Created run_with_display.sh"
echo ""

# Update daily cron script
echo "[4/4] Updating daily cron script..."
cat > /root/arti-marketing-ops/scripts/spotify-scraper-daily.sh << 'EOF'
#!/bin/bash
cd /root/arti-marketing-ops/spotify_scraper
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi
LOG_FILE="/var/log/spotify-scraper/run-$(date +%Y%m%d-%H%M%S).log"
mkdir -p /var/log/spotify-scraper
echo "========================================" >> "$LOG_FILE"
echo "Spotify Scraper - $(date)" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"
export DISPLAY=:99
Xvfb :99 -screen 0 1920x1080x24 > /dev/null 2>&1 &
XVFB_PID=$!
sleep 2
python3 run_production_scraper.py >> "$LOG_FILE" 2>&1
EXIT_CODE=$?
kill $XVFB_PID 2>/dev/null || true
if [ $EXIT_CODE -eq 0 ]; then
    echo "Success" >> "$LOG_FILE"
else
    echo "Failed with exit code: $EXIT_CODE" >> "$LOG_FILE"
fi
echo "========================================" >> "$LOG_FILE"
find /var/log/spotify-scraper -name "run-*.log" -mtime +30 -delete
logger -t spotify-scraper "Spotify scraper completed with exit code $EXIT_CODE"
exit $EXIT_CODE
EOF

chmod +x /root/arti-marketing-ops/scripts/spotify-scraper-daily.sh
echo "✓ Updated spotify-scraper-daily.sh"
echo ""

echo "=========================================="
echo "  ✓ GUI Mode Setup Complete!"
echo "=========================================="
echo ""
echo "Test it now:"
echo "  bash run_with_display.sh"
echo ""

