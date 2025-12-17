# Spotify Scraper - Permanent Fix Plan

## Problems Identified

1. **Script not executable** - Missing execute permissions
2. **Cron path error** - Script path not found from cron context  
3. **No status tracking** - No `status.jsonl` file being created
4. **No monitoring** - 2-3 hour runs can fail silently
5. **No failsafes** - No auto-restart or alerting

## Root Cause

The cron job at `0 6 * * *` (6 AM daily) has been failing because:
- The script path in cron is relative, not absolute
- Script lacks execute permissions
- No logging or error tracking

## Comprehensive Fix

### 1. Fix Script Permissions
```bash
chmod +x /root/arti-marketing-ops/spotify_scraper/run_production_scraper.sh
chmod +x /root/arti-marketing-ops/spotify_scraper/run_health_check.sh
```

### 2. Create Monitoring Wrapper Script
Location: `/root/arti-marketing-ops/spotify_scraper/run_scraper_with_monitoring.sh`

Features:
- Lock file to prevent concurrent runs
- Status tracking to `status.jsonl`
- 4-hour timeout (scraper takes 2-3 hours normally)
- Comprehensive logging
- Auto-cleanup on exit

### 3. Update Cron Job
Replace current cron:
```
0 6 * * * cd /root/arti-marketing-ops && bash spotify_scraper/run_production_scraper.sh >> /root/arti-marketing-ops/spotify_scraper/logs/cron.log 2>&1
```

With new monitored version:
```
0 6 * * * /root/arti-marketing-ops/spotify_scraper/run_scraper_with_monitoring.sh
```

### 4. Add Health Check Cron
Run every 6 hours to detect stale runs:
```
0 */6 * * * /root/arti-marketing-ops/spotify_scraper/run_health_check.sh
```

### 5. Add Watchdog Script
Check if scraper is stuck (running > 4 hours):
```bash
#!/bin/bash
# /root/arti-marketing-ops/spotify_scraper/watchdog.sh

PID_FILE="/root/arti-marketing-ops/spotify_scraper/scraper.pid"
MAX_RUNTIME=14400  # 4 hours in seconds

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        # Check how long it's been running
        START_TIME=$(ps -o lstart= -p "$PID" | xargs -I {} date -d "{}" +%s)
        CURRENT_TIME=$(date +%s)
        RUNTIME=$((CURRENT_TIME - START_TIME))
        
        if [ $RUNTIME -gt $MAX_RUNTIME ]; then
            echo "[$(date)] Killing stuck scraper (PID: $PID, Runtime: ${RUNTIME}s)"
            kill -9 "$PID"
            rm -f "$PID_FILE"
        fi
    fi
fi
```

Cron: `*/30 * * * *` (every 30 minutes)

### 6. Frontend Integration
The scraper status is already exposed via:
- `/api/scraper/status` - Current status
- `/api/scraper/health` - Health check
- `/api/scraper/logs` - Recent logs

Frontend displays:
- Last run time
- Current status (running/success/failed)
- Error messages if any

## Deployment Steps

1. SSH to server
2. Fix permissions
3. Create monitoring wrapper
4. Create watchdog script
5. Update crontab
6. Test manually
7. Verify in frontend

## Testing

```bash
# Manual test run
cd /root/arti-marketing-ops/spotify_scraper
./run_scraper_with_monitoring.sh

# Check status
tail -f logs/monitor.log

# Check if it's running
ps aux | grep run_production_scraper

# View status file
tail -10 status.jsonl
```

## Monitoring Commands

```bash
# Check last run
tail -1 /root/arti-marketing-ops/spotify_scraper/status.jsonl | jq

# Check if currently running
ps aux | grep run_production_scraper | grep -v grep

# View recent logs
tail -50 /root/arti-marketing-ops/spotify_scraper/logs/monitor.log

# Check cron execution
tail -20 /root/arti-marketing-ops/spotify_scraper/logs/cron.log
```

## Expected Behavior

- **Daily at 6 AM**: Scraper runs automatically
- **Duration**: 2-3 hours normally
- **Timeout**: Kills after 4 hours if stuck
- **Status**: Updates `status.jsonl` with progress
- **Logs**: All output saved to `logs/`
- **Lock**: Prevents concurrent runs
- **Watchdog**: Checks every 30 min for stuck processes
- **Health Check**: Runs every 6 hours, alerts if stale

## Failsafes

1. **Lock file** - Prevents multiple instances
2. **Timeout** - Kills after 4 hours
3. **Watchdog** - External process killer
4. **Health check** - Detects stale runs
5. **Status tracking** - Visible in frontend
6. **Comprehensive logging** - Easy debugging
7. **Auto-cleanup** - Removes lock files on exit

## Next Steps

After deployment:
1. Monitor for 24 hours
2. Verify scraper runs at 6 AM
3. Check frontend shows correct status
4. Ensure data is being updated
5. Set up alerts (optional)

