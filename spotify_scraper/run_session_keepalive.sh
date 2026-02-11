#!/bin/bash

# ==========================================
#  Spotify Session Keepalive Wrapper
# ==========================================
# Keeps the Spotify session alive by periodically
# opening the browser and browsing S4A pages.
#
# Add to crontab:
#   0 */3 * * * /root/arti-marketing-ops/spotify_scraper/run_session_keepalive.sh
# ==========================================

set -e

cd /root/arti-marketing-ops/spotify_scraper

# Create logs directory
mkdir -p logs

LOCK_FILE="scraper.lock"

# ---- Check if scraper is already running ----
if [ -f "$LOCK_FILE" ]; then
    OLD_PID=$(cat "$LOCK_FILE" 2>/dev/null)
    if [ -n "$OLD_PID" ] && ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo "[$(date)] Scraper is running (PID: $OLD_PID) -- skipping keepalive" >> logs/keepalive.log
        exit 0
    fi
fi

# ---- Load environment ----
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# ---- Set up display for GUI mode ----
export DISPLAY=:99
export HEADLESS=false

# Start Xvfb if not running
if ! pgrep -x "Xvfb" > /dev/null; then
    echo "[$(date)] Starting Xvfb on display :99" >> logs/keepalive.log
    Xvfb :99 -screen 0 1920x1080x24 -ac > /dev/null 2>&1 &
    sleep 3

    if ! pgrep -x "Xvfb" > /dev/null; then
        echo "[$(date)] ERROR: Failed to start Xvfb" >> logs/keepalive.log
        exit 1
    fi
fi

# ---- Run keepalive script ----
echo "[$(date)] Running session keepalive..." >> logs/keepalive.log
python3 session_keepalive.py 2>&1

EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo "[$(date)] WARNING: Session keepalive returned error (exit code: $EXIT_CODE)" >> logs/keepalive.log
    echo "[$(date)] Session may be expired -- manual VNC login required" >> logs/keepalive.log
else
    echo "[$(date)] Session keepalive completed successfully" >> logs/keepalive.log
fi

exit $EXIT_CODE
