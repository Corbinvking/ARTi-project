#!/bin/bash
# Cron job script for fetching YouTube stats
# Add to crontab with: crontab -e
# Example: 0 8,14,20 * * * /root/arti-marketing-ops/scripts/youtube-stats-cron.sh

# Set working directory
cd /root/arti-marketing-ops

# Load environment variables
export $(cat apps/api/production.env | grep -v '^#' | xargs)

# Create log directory if it doesn't exist
mkdir -p logs/youtube-stats

# Generate log filename with timestamp
LOG_FILE="logs/youtube-stats/fetch-$(date +%Y%m%d-%H%M%S).log"

# Run the fetch script and log output
echo "========================================" >> "$LOG_FILE"
echo "YouTube Stats Fetch - $(date)" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

node scripts/fetch-youtube-stats-production.js >> "$LOG_FILE" 2>&1

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Success" >> "$LOG_FILE"
else
    echo "❌ Failed with exit code: $EXIT_CODE" >> "$LOG_FILE"
fi

echo "========================================" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Keep only last 30 days of logs
find logs/youtube-stats -name "fetch-*.log" -mtime +30 -delete

exit $EXIT_CODE

