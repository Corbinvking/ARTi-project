#!/bin/bash
# Permanent fix for Spotify scraper cron issues
# This script implements all failsafes and monitoring

set -e

SCRAPER_DIR="/root/arti-marketing-ops/spotify_scraper"

echo "🔧 Fixing Spotify Scraper Permanently..."
echo "========================================"

# Step 1: Fix permissions
echo ""
echo "1️⃣  Fixing script permissions..."
chmod +x "$SCRAPER_DIR/run_production_scraper.sh"
chmod +x "$SCRAPER_DIR/run_health_check.sh"
echo "✅ Scripts are now executable"

# Step 2: Create logs directory
echo ""
echo "2️⃣  Creating logs directory..."
mkdir -p "$SCRAPER_DIR/logs"
echo "✅ Logs directory created"

# Step 3: Create monitoring wrapper
echo ""
echo "3️⃣  Creating monitoring wrapper..."
cat > "$SCRAPER_DIR/run_scraper_with_monitoring.sh" << 'EOF'
#!/bin/bash
set -e

SCRAPER_DIR="/root/arti-marketing-ops/spotify_scraper"
LOG_DIR="$SCRAPER_DIR/logs"
STATUS_FILE="$SCRAPER_DIR/status.jsonl"
LOCK_FILE="$SCRAPER_DIR/scraper.lock"
PID_FILE="$SCRAPER_DIR/scraper.pid"

mkdir -p "$LOG_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_DIR/monitor.log"
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

log "🚀 Starting Spotify scraper..."
send_status "running" "Scraper started"

# Run the scraper with timeout (4 hours max)
cd "$SCRAPER_DIR"
if timeout 14400 bash run_production_scraper.sh >> "$LOG_DIR/production.log" 2>> "$LOG_DIR/errors.log"; then
    log "✅ Scraper completed successfully"
    send_status "success" "Scraper completed successfully"
else
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 124 ]; then
        log "❌ Scraper timed out after 4 hours"
        send_status "timeout" "Scraper exceeded 4 hour limit"
    else
        log "❌ Scraper failed with exit code $EXIT_CODE"
        send_status "failed" "Scraper failed with exit code $EXIT_CODE"
    fi
    exit $EXIT_CODE
fi
EOF

chmod +x "$SCRAPER_DIR/run_scraper_with_monitoring.sh"
echo "✅ Monitoring wrapper created"

# Step 4: Create watchdog script
echo ""
echo "4️⃣  Creating watchdog script..."
cat > "$SCRAPER_DIR/watchdog.sh" << 'EOF'
#!/bin/bash
# Watchdog to kill stuck scraper processes

PID_FILE="/root/arti-marketing-ops/spotify_scraper/scraper.pid"
LOG_FILE="/root/arti-marketing-ops/spotify_scraper/logs/watchdog.log"
MAX_RUNTIME=14400  # 4 hours in seconds

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE" 2>/dev/null || echo "")
    if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
        # Get process start time
        if ps -p "$PID" > /dev/null 2>&1; then
            START_TIME=$(ps -o lstart= -p "$PID" 2>/dev/null | head -1)
            if [ -n "$START_TIME" ]; then
                START_EPOCH=$(date -d "$START_TIME" +%s 2>/dev/null || echo "0")
                CURRENT_EPOCH=$(date +%s)
                RUNTIME=$((CURRENT_EPOCH - START_EPOCH))
                
                if [ $RUNTIME -gt $MAX_RUNTIME ]; then
                    log "⚠️  Killing stuck scraper (PID: $PID, Runtime: ${RUNTIME}s)"
                    kill -9 "$PID" 2>/dev/null || true
                    rm -f "$PID_FILE"
                    rm -f "/root/arti-marketing-ops/spotify_scraper/scraper.lock"
                    log "✅ Stuck scraper killed and cleaned up"
                fi
            fi
        fi
    else
        # PID file exists but process is dead
        rm -f "$PID_FILE"
    fi
fi
EOF

chmod +x "$SCRAPER_DIR/watchdog.sh"
echo "✅ Watchdog script created"

# Step 5: Update crontab
echo ""
echo "5️⃣  Updating crontab..."

# Backup current crontab
crontab -l > /tmp/crontab.backup 2>/dev/null || echo "# New crontab" > /tmp/crontab.backup

# Remove old spotify scraper entries
grep -v "spotify_scraper/run_production_scraper.sh" /tmp/crontab.backup > /tmp/crontab.new || true

# Add new entries
cat >> /tmp/crontab.new << 'EOF'

# Spotify Scraper - Daily at 6 AM UTC (with monitoring)
0 6 * * * /root/arti-marketing-ops/spotify_scraper/run_scraper_with_monitoring.sh

# Spotify Scraper - Health check every 6 hours
0 */6 * * * /root/arti-marketing-ops/spotify_scraper/run_health_check.sh >> /root/arti-marketing-ops/spotify_scraper/logs/health.log 2>&1

# Spotify Scraper - Watchdog every 30 minutes
*/30 * * * * /root/arti-marketing-ops/spotify_scraper/watchdog.sh
EOF

# Install new crontab
crontab /tmp/crontab.new
echo "✅ Crontab updated"

# Step 6: Show new crontab
echo ""
echo "6️⃣  New crontab entries:"
echo "----------------------------------------"
crontab -l | grep -A 1 "Spotify Scraper"

# Step 7: Create initial status file
echo ""
echo "7️⃣  Creating initial status file..."
echo "{\"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"status\": \"initialized\", \"message\": \"Scraper system initialized\"}" > "$SCRAPER_DIR/status.jsonl"
echo "✅ Status file created"

# Summary
echo ""
echo "========================================"
echo "✅ Spotify Scraper Fixed Permanently!"
echo "========================================"
echo ""
echo "📋 What was fixed:"
echo "  • Script permissions (now executable)"
echo "  • Cron job path (now absolute)"
echo "  • Monitoring wrapper (tracks status)"
echo "  • Watchdog (kills stuck processes)"
echo "  • Health checks (runs every 6 hours)"
echo "  • Status tracking (visible in frontend)"
echo ""
echo "⏰ Schedule:"
echo "  • Daily scrape: 6:00 AM UTC"
echo "  • Health check: Every 6 hours"
echo "  • Watchdog: Every 30 minutes"
echo ""
echo "📊 Monitoring:"
echo "  • Status: $SCRAPER_DIR/status.jsonl"
echo "  • Logs: $SCRAPER_DIR/logs/"
echo "  • Frontend: /admin (Scraper Status Card)"
echo ""
echo "🧪 Test it now:"
echo "  cd $SCRAPER_DIR"
echo "  ./run_scraper_with_monitoring.sh"
echo ""

