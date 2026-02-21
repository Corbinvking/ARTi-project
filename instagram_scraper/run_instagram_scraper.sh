#!/bin/bash
# Instagram Scraper Cron Job Script
# This script is called by cron to run the Instagram scraper 3x daily (same idea as YouTube)
#
# Setup:
# 1. chmod +x /root/arti-marketing-ops/instagram_scraper/run_instagram_scraper.sh
# 2. Add to crontab (3x daily at 6:00, 14:00, 22:00 UTC):
#    0 6,14,22 * * * /root/arti-marketing-ops/instagram_scraper/run_instagram_scraper.sh >> /var/log/instagram_scraper.log 2>&1

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/instagram_scraper.log"
API_URL="${API_URL:-http://localhost:3001}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S UTC')] $1"
}

log "=========================================="
log "Instagram Scraper Cron Job Starting"
log "=========================================="

# Check if API is running
log "Checking API health..."
if ! curl -s "${API_URL}/health" > /dev/null 2>&1; then
    log "ERROR: API is not running at ${API_URL}"
    exit 1
fi
log "✅ API is healthy"

# Run the batch scraper
log "Starting batch scraper..."
RESPONSE=$(curl -s -X POST "${API_URL}/api/instagram-scraper/batch" \
    -H "Content-Type: application/json" \
    -d '{"resultsLimit": 30}')

# Parse response
SUCCESS=$(echo "$RESPONSE" | grep -o '"success":true' || true)

if [ -n "$SUCCESS" ]; then
    log "✅ Batch scraper completed successfully"
    log "Response: $RESPONSE"
else
    log "❌ Batch scraper failed"
    log "Response: $RESPONSE"
    exit 1
fi

# Track individual campaign post URLs (views/likes/comments)
log "Starting campaign post tracking..."
TRACK_RESPONSE=$(curl -s -X POST "${API_URL}/api/instagram-scraper/track-campaign-posts" \
    -H "Content-Type: application/json" \
    -d '{}')

TRACK_SUCCESS=$(echo "$TRACK_RESPONSE" | grep -o '"success":true' || true)

if [ -n "$TRACK_SUCCESS" ]; then
    log "✅ Campaign post tracking completed"
    log "Response: $TRACK_RESPONSE"
else
    log "⚠️ Campaign post tracking failed (non-fatal)"
    log "Response: $TRACK_RESPONSE"
fi

log "=========================================="
log "Instagram Scraper Cron Job Complete"
log "=========================================="

