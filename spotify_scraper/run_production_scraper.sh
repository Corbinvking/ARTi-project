#!/bin/bash

# Spotify Scraper Production Wrapper Script
# This script is called by cron to run the Python scraper
# Author: ARTi Project
# Last Updated: 2025-11-26

set -e  # Exit on any error

# Change to scraper directory
cd /root/arti-marketing-ops/spotify_scraper

# Create logs directory if it doesn't exist
mkdir -p logs

# Load environment variables from .env file
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Set up display for GUI mode (Xvfb required for Playwright)
export DISPLAY=:99

# Start Xvfb if not running (needed for Spotify login in GUI mode)
if ! pgrep -x "Xvfb" > /dev/null; then
    echo "Starting Xvfb for GUI mode..."
    Xvfb :99 -screen 0 1920x1080x24 > /dev/null 2>&1 &
    sleep 2
fi

# Log start time
echo "=== Spotify Scraper Started at $(date) ===" >> logs/production.log

# Run the Python scraper
python3 run_production_scraper.py >> logs/production.log 2>&1

# Capture exit code
EXIT_CODE=$?

# Log completion
echo "=== Scraper Completed at $(date) with exit code $EXIT_CODE ===" >> logs/production.log
echo "" >> logs/production.log

# Exit with the scraper's exit code
exit $EXIT_CODE

