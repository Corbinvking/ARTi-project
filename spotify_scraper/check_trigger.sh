#!/bin/bash
# Check for manual trigger file and run scraper if found
# Also runs the watchdog to clean up stuck processes

TRIGGER_FILE="/root/arti-marketing-ops/spotify_scraper/trigger_manual_run.flag"
LOCK_FILE="/root/arti-marketing-ops/spotify_scraper/scraper.lock"
SCRIPT_DIR="/root/arti-marketing-ops/spotify_scraper"
LOG_FILE="$SCRIPT_DIR/logs/trigger.log"

mkdir -p "$SCRIPT_DIR/logs"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Check if scraper is already running
if [ -f "$LOCK_FILE" ]; then
    log "Scraper already running (lock file exists), skipping"
    exit 0
fi

# Check for trigger file
if [ -f "$TRIGGER_FILE" ]; then
    log "Manual trigger detected! Starting scraper..."
    
    # Remove trigger file immediately to prevent re-runs
    rm -f "$TRIGGER_FILE"
    
    # Run the scraper
    cd "$SCRIPT_DIR"
    bash run_production_scraper.sh >> "$LOG_FILE" 2>&1 &
    
    log "Scraper started in background"
fi

