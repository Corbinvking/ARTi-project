#!/bin/bash
# Health Check Script for Spotify Scraper
# Checks if the scraper has run recently and alerts if stale

set -e

THRESHOLD_HOURS=26  # Alert if no scrape in 26 hours (cron runs every 24h)
ALERT_EMAIL="${ALERT_EMAIL:-admin@artistinfluence.com}"

echo "=========================================="
echo "Spotify Scraper Health Check"
echo "$(date)"
echo "=========================================="
echo ""

# Check when last scrape happened
LAST_SCRAPE=$(docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -t -c "
SELECT EXTRACT(EPOCH FROM (NOW() - MAX(last_scraped_at)))/3600 
FROM spotify_campaigns 
WHERE last_scraped_at IS NOT NULL;
" 2>/dev/null || echo "999")

HOURS=$(echo $LAST_SCRAPE | xargs)  # Trim whitespace

# Check if we got a valid number
if ! [[ $HOURS =~ ^[0-9]+\.?[0-9]*$ ]]; then
    echo "❌ ERROR: Could not query database"
    echo "Database query failed or returned invalid data"
    exit 1
fi

echo "Last scrape was $HOURS hours ago"
echo "Threshold: $THRESHOLD_HOURS hours"
echo ""

# Compare using bc (handles decimals)
if (( $(echo "$HOURS > $THRESHOLD_HOURS" | bc -l) )); then
    echo "🚨 ALERT: Scraper is STALE!"
    echo "Last scrape was ${HOURS} hours ago (threshold: ${THRESHOLD_HOURS}h)"
    echo ""
    
    # Check if cron is running
    if systemctl is-active --quiet cron; then
        echo "✅ Cron service is running"
    else
        echo "❌ Cron service is NOT running!"
    fi
    
    # Check if Xvfb is running
    if pgrep -x "Xvfb" > /dev/null; then
        echo "✅ Xvfb is running"
    else
        echo "❌ Xvfb is NOT running!"
    fi
    
    # Check cron job exists
    if crontab -l | grep -q "run_production_scraper.sh"; then
        echo "✅ Cron job is scheduled"
        echo "   $(crontab -l | grep run_production_scraper.sh)"
    else
        echo "❌ Cron job is NOT scheduled!"
    fi
    
    # Check last log entries
    echo ""
    echo "Last 5 log entries:"
    tail -5 /root/arti-marketing-ops/spotify_scraper/logs/production.log 2>/dev/null || echo "No logs found"
    
    # Send email alert if mail is available
    if command -v mail &> /dev/null; then
        echo "Sending email alert to $ALERT_EMAIL..."
        cat <<EOF | mail -s "[ALERT] Spotify Scraper Stale - ${HOURS}h" $ALERT_EMAIL
Spotify Scraper Health Check FAILED

Last scrape: ${HOURS} hours ago
Threshold: ${THRESHOLD_HOURS} hours
Status: STALE

Please investigate:
1. Check scraper logs: /root/arti-marketing-ops/spotify_scraper/logs/production.log
2. Check cron logs: /var/log/syslog | grep CRON
3. Verify API is reachable: curl https://api.artistinfluence.com/rest/v1/
4. Manual test: cd /root/arti-marketing-ops/spotify_scraper && bash run_production_scraper.sh

Timestamp: $(date)
EOF
        echo "✅ Alert email sent"
    fi
    
    exit 1
else
    echo "✅ Scraper is HEALTHY"
    echo "Last scrape was ${HOURS} hours ago (within ${THRESHOLD_HOURS}h threshold)"
    
    # Get recent success count
    RECENT_COUNT=$(docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -t -c "
    SELECT COUNT(*) 
    FROM spotify_campaigns 
    WHERE last_scraped_at > NOW() - INTERVAL '24 hours';
    " 2>/dev/null || echo "0")
    
    RECENT_COUNT=$(echo $RECENT_COUNT | xargs)
    echo "Campaigns scraped in last 24h: $RECENT_COUNT"
    
    exit 0
fi

