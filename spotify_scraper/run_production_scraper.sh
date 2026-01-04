#!/bin/bash

# Spotify Scraper Production Wrapper Script
# This script is called by cron to run the Python scraper
# Author: ARTi Project
# Last Updated: 2025-12-19

# Change to scraper directory
cd /root/arti-marketing-ops/spotify_scraper

# Create logs directory if it doesn't exist
mkdir -p logs

# Lock file for detecting running state
LOCK_FILE="scraper.lock"

# Check if already running
if [ -f "$LOCK_FILE" ]; then
    echo "Scraper already running (lock file exists), exiting" >> logs/production.log
    exit 0
fi

# Create lock file
echo "$$" > "$LOCK_FILE"

# Cleanup function to remove lock file on exit
cleanup() {
    rm -f "$LOCK_FILE"
    echo "=== Scraper Completed at $(date) ===" >> logs/production.log
}
trap cleanup EXIT

# Load environment variables from .env file
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Set up display for GUI mode (Xvfb required for Playwright)
# Spotify detects headless browsers and blocks login, so we MUST use Xvfb with headed mode
export DISPLAY=:99
export HEADLESS=false

# Start Xvfb if not running (needed for Spotify login in GUI mode)
if ! pgrep -x "Xvfb" > /dev/null; then
    echo "Starting Xvfb on display :99 for GUI mode..." >> logs/production.log
    Xvfb :99 -screen 0 1920x1080x24 -ac > /dev/null 2>&1 &
    XVFB_PID=$!
    sleep 3
    
    # Verify Xvfb started
    if ! pgrep -x "Xvfb" > /dev/null; then
        echo "ERROR: Failed to start Xvfb!" >> logs/production.log
        exit 1
    fi
    echo "Xvfb started successfully (PID: $XVFB_PID)" >> logs/production.log
else
    echo "Xvfb already running on display :99" >> logs/production.log
fi

# Log start time
echo "=== Spotify Scraper Started at $(date) ===" >> logs/production.log
echo "DISPLAY=$DISPLAY, HEADLESS=$HEADLESS" >> logs/production.log

# Run the Python scraper
python3 run_production_scraper.py >> logs/production.log 2>&1

# Capture exit code
EXIT_CODE=$?

# Exit with the scraper's exit code (cleanup will run via trap)
exit $EXIT_CODE
