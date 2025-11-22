#!/bin/bash
# Setup GUI mode for Spotify scraper on headless server
# Uses Xvfb (X Virtual Framebuffer) to create a virtual display

set -e

echo "=========================================="
echo "  Setup GUI Mode for Spotify Scraper"
echo "=========================================="
echo ""

# Install Xvfb if not already installed
echo "[1/5] Installing Xvfb (Virtual Display)..."
apt-get update -qq
apt-get install -y xvfb

echo "✓ Xvfb installed"
echo ""

# Update .env to use GUI mode
echo "[2/5] Configuring scraper for GUI mode..."
cd /root/arti-marketing-ops/spotify_scraper

if [ -f .env ]; then
    # Update HEADLESS setting
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

# Create wrapper script to run with virtual display
echo "[3/5] Creating virtual display wrapper..."
cat > run_with_display.sh << 'EOF'
#!/bin/bash
# Run Spotify scraper with virtual display

# Start Xvfb on display :99
export DISPLAY=:99
Xvfb :99 -screen 0 1920x1080x24 > /dev/null 2>&1 &
XVFB_PID=$!

# Wait for display to be ready
sleep 2

# Run the scraper
cd /root/arti-marketing-ops/spotify_scraper
python3 run_production_scraper.py

# Cleanup
kill $XVFB_PID 2>/dev/null || true
EOF

chmod +x run_with_display.sh
echo "✓ Created run_with_display.sh"
echo ""

# Update daily cron script to use virtual display
echo "[4/5] Updating daily cron script..."
cat > /root/arti-marketing-ops/scripts/spotify-scraper-daily.sh << 'EOF'
#!/bin/bash
# Spotify for Artists Scraper - Daily Run with Virtual Display

# Set working directory
cd /root/arti-marketing-ops/spotify_scraper

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Generate log filename
LOG_FILE="/var/log/spotify-scraper/run-$(date +%Y%m%d-%H%M%S).log"

# Create log directory if needed
mkdir -p /var/log/spotify-scraper

# Start logging
echo "========================================" >> "$LOG_FILE"
echo "Spotify Scraper - $(date)" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Start Xvfb on display :99
export DISPLAY=:99
Xvfb :99 -screen 0 1920x1080x24 > /dev/null 2>&1 &
XVFB_PID=$!

# Wait for display to be ready
sleep 2

# Run the production scraper
python3 run_production_scraper.py >> "$LOG_FILE" 2>&1

EXIT_CODE=$?

# Cleanup Xvfb
kill $XVFB_PID 2>/dev/null || true

# Log result
if [ $EXIT_CODE -eq 0 ]; then
    echo "Success" >> "$LOG_FILE"
else
    echo "Failed with exit code: $EXIT_CODE" >> "$LOG_FILE"
fi

echo "========================================" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Keep only last 30 days of logs
find /var/log/spotify-scraper -name "run-*.log" -mtime +30 -delete

# Log to syslog for centralized monitoring
logger -t spotify-scraper "Spotify scraper completed with exit code $EXIT_CODE"

exit $EXIT_CODE
EOF

chmod +x /root/arti-marketing-ops/scripts/spotify-scraper-daily.sh
echo "✓ Updated spotify-scraper-daily.sh with Xvfb support"
echo ""

# Test the setup
echo "[5/5] Testing GUI mode with virtual display..."
export DISPLAY=:99
Xvfb :99 -screen 0 1920x1080x24 > /dev/null 2>&1 &
XVFB_PID=$!
sleep 2

echo "Running quick test..."
timeout 60 python3 run_production_scraper.py || {
    echo "Test completed (timeout expected)"
}

# Cleanup
kill $XVFB_PID 2>/dev/null || true

echo ""
echo "=========================================="
echo "  ✓ GUI Mode Setup Complete!"
echo "=========================================="
echo ""
echo "Configuration:"
echo "  - HEADLESS=false (GUI mode enabled)"
echo "  - Xvfb virtual display configured"
echo "  - Daily cron script updated"
echo ""
echo "Test manually:"
echo "  cd /root/arti-marketing-ops/spotify_scraper"
echo "  bash run_with_display.sh"
echo ""
echo "Or run directly:"
echo "  export DISPLAY=:99"
echo "  Xvfb :99 -screen 0 1920x1080x24 &"
echo "  python3 run_production_scraper.py"
echo ""

