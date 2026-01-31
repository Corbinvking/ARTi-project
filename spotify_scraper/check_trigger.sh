#!/bin/bash
# Check for manual trigger file and run scraper if found
# Has stale lock detection to prevent stuck states
# Updated: 2026-01-07

TRIGGER_FILE="/root/arti-marketing-ops/spotify_scraper/trigger_manual_run.flag"
LOCK_FILE="/root/arti-marketing-ops/spotify_scraper/scraper.lock"
SCRIPT_DIR="/root/arti-marketing-ops/spotify_scraper"
LOG_FILE="$SCRIPT_DIR/logs/trigger.log"
CONTAINER_NAME="arti-api-prod"
CONTAINER_TRIGGER_FILE="/app/scraper_data/trigger_manual_run.flag"
CONTAINER_TRIGGER_DETECTED=0
# Max age for lock file in seconds (4 hours = 14400 seconds)
MAX_LOCK_AGE=14400

mkdir -p "$SCRIPT_DIR/logs"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Mirror trigger flag from the API container if it exists
if command -v docker >/dev/null 2>&1; then
    if docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME" >/dev/null 2>&1; then
        if docker exec "$CONTAINER_NAME" sh -c "test -f $CONTAINER_TRIGGER_FILE"; then
            log "Container trigger detected"
            CONTAINER_TRIGGER_DETECTED=1
            docker exec "$CONTAINER_NAME" sh -c "rm -f $CONTAINER_TRIGGER_FILE" || true
        fi
    fi
fi

# Function to check if a PID is still running
is_pid_running() {
    local pid=$1
    if [ -z "$pid" ]; then
        return 1
    fi
    if ps -p "$pid" > /dev/null 2>&1; then
        return 0
    fi
    return 1
}

# Check if scraper is already running with stale lock detection
if [ -f "$LOCK_FILE" ]; then
    OLD_PID=$(cat "$LOCK_FILE" 2>/dev/null)
    LOCK_AGE=$(( $(date +%s) - $(stat -c %Y "$LOCK_FILE" 2>/dev/null || echo 0) ))
    
    # Check if PID is still running
    if is_pid_running "$OLD_PID"; then
        # Check if lock is too old (might be a zombie process)
        if [ "$LOCK_AGE" -gt "$MAX_LOCK_AGE" ]; then
            log "Lock file too old ($LOCK_AGE seconds), killing stale process $OLD_PID"
            kill -9 "$OLD_PID" 2>/dev/null || true
            rm -f "$LOCK_FILE"
        else
            log "Scraper running (PID: $OLD_PID, age: ${LOCK_AGE}s), skipping"
            exit 0
        fi
    else
        log "Removing stale lock file (PID $OLD_PID no longer running)"
        rm -f "$LOCK_FILE"
    fi
fi

# Check for trigger file
if [ -f "$TRIGGER_FILE" ] || [ "$CONTAINER_TRIGGER_DETECTED" -eq 1 ]; then
    log "Manual trigger detected! Starting scraper..."
    
    # Remove trigger file immediately to prevent re-runs
    rm -f "$TRIGGER_FILE"
    
    # Run the scraper
    cd "$SCRIPT_DIR"
    bash run_production_scraper.sh >> "$LOG_FILE" 2>&1 &
    
    log "Scraper started in background (PID: $!)"
fi

