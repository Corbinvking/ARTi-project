#!/bin/bash
# Spotify for Artists Production Scraper - Cron Job Script
# This script is designed to be run by cron on the production droplet
# It runs the scraper in headless mode and updates all active campaigns

# Set the working directory (adjust if needed)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Log start time
echo "========================================================================"
echo "Spotify for Artists Scraper - Cron Job"
echo "Started at: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================================================"

# Run the production scraper
python3 run_production_scraper.py

# Log completion
echo "========================================================================"
echo "Completed at: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================================================"

