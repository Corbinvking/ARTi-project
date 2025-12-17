#!/bin/bash
# Test the monitoring system with 2-3 campaigns

set -e

SCRAPER_DIR="/root/arti-marketing-ops/spotify_scraper"
LOG_DIR="$SCRAPER_DIR/logs"
STATUS_FILE="$SCRAPER_DIR/status.jsonl"
LOCK_FILE="$SCRAPER_DIR/scraper.lock"
PID_FILE="$SCRAPER_DIR/scraper.pid"

mkdir -p "$LOG_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_DIR/test.log"
}

send_status() {
    local status="$1"
    local message="$2"
    echo "{\"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"status\": \"$status\", \"message\": \"$message\"}" >> "$STATUS_FILE"
    tail -100 "$STATUS_FILE" > "$STATUS_FILE.tmp" 2>/dev/null && mv "$STATUS_FILE.tmp" "$STATUS_FILE" || true
}

# Check if already running
if [ -f "$LOCK_FILE" ]; then
    LOCK_PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
    if [ -n "$LOCK_PID" ] && kill -0 "$LOCK_PID" 2>/dev/null; then
        log "⚠️  Scraper already running (PID: $LOCK_PID)"
        exit 0
    else
        log "🧹 Removing stale lock file"
        rm -f "$LOCK_FILE"
    fi
fi

# Create lock file
echo $$ > "$LOCK_FILE"
echo $$ > "$PID_FILE"

# Cleanup on exit
cleanup() {
    rm -f "$LOCK_FILE" "$PID_FILE"
}
trap cleanup EXIT

log "🧪 Testing scraper with 3 campaigns..."
send_status "running" "Test: Scraping 3 campaigns"

# Set up Xvfb (required for browser)
export DISPLAY=:99
if ! pgrep -x "Xvfb" > /dev/null; then
    log "Starting Xvfb..."
    Xvfb :99 -screen 0 1920x1080x24 > /dev/null 2>&1 &
    sleep 2
fi

# Run the scraper with limit and timeout (5 minutes should be enough for 3 campaigns)
cd "$SCRAPER_DIR"
if timeout 300 python3 run_production_scraper.py --limit 3 >> "$LOG_DIR/test.log" 2>> "$LOG_DIR/test_errors.log"; then
    log "✅ Test completed successfully"
    send_status "success" "Test: 3 campaigns scraped successfully"
else
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 124 ]; then
        log "❌ Test timed out after 5 minutes"
        send_status "timeout" "Test: Exceeded 5 minute limit"
    else
        log "❌ Test failed with exit code $EXIT_CODE"
        send_status "failed" "Test: Failed with exit code $EXIT_CODE"
    fi
    exit $EXIT_CODE
fi

# Show results
echo ""
echo "========================================"
echo "✅ Test Complete!"
echo "========================================"
echo ""
echo "📊 Status:"
tail -1 "$STATUS_FILE" | python3 -m json.tool 2>/dev/null || tail -1 "$STATUS_FILE"
echo ""
echo "📝 Last 10 log lines:"
tail -10 "$LOG_DIR/test.log"
echo ""
echo "🔍 Check frontend at /admin to see status"
echo ""

