#!/bin/bash
# Spotify for Artists Scraper - Daily Run
# Fetches playlist stream data for all campaigns with SFA links
# Pattern matches youtube-stats-daily-update.sh for consistency

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

# Run the production scraper
python3 run_production_scraper.py >> "$LOG_FILE" 2>&1

EXIT_CODE=$?

# Log result
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Success" >> "$LOG_FILE"
else
    echo "❌ Failed with exit code: $EXIT_CODE" >> "$LOG_FILE"
fi

echo "========================================" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Keep only last 30 days of logs
find /var/log/spotify-scraper -name "run-*.log" -mtime +30 -delete

# Log to syslog for centralized monitoring
logger -t spotify-scraper "Spotify scraper completed with exit code $EXIT_CODE"

exit $EXIT_CODE

