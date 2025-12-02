#!/bin/bash

# Complete Cron Job Diagnostic Script
# Run this on the server to identify why the scraper isn't running

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 SPOTIFY SCRAPER CRON JOB DIAGNOSTIC"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Check current crontab
echo "=== 1. CURRENT CRONTAB ==="
crontab -l | grep -v "^#" | grep -v "^$"
echo ""

# 2. Check cron service
echo "=== 2. CRON SERVICE STATUS ==="
systemctl is-active cron && echo "✓ Cron service is running" || echo "❌ Cron service is NOT running"
echo ""

# 3. Check server time
echo "=== 3. CURRENT SERVER TIME ==="
date
timedatectl | grep "Time zone"
echo ""

# 4. Check if script exists and is executable
echo "=== 4. SCRIPT FILE CHECK ==="
if [ -f "/root/arti-marketing-ops/spotify_scraper/run_production_scraper.sh" ]; then
    echo "✓ Script exists"
    ls -lh /root/arti-marketing-ops/spotify_scraper/run_production_scraper.sh
    if [ -x "/root/arti-marketing-ops/spotify_scraper/run_production_scraper.sh" ]; then
        echo "✓ Script is executable"
    else
        echo "❌ Script is NOT executable"
    fi
else
    echo "❌ Script does NOT exist"
fi
echo ""

# 5. Check recent cron executions from syslog
echo "=== 5. RECENT CRON EXECUTIONS (Last 10) ==="
grep "spotify_scraper\|run_production" /var/log/syslog 2>/dev/null | tail -10 || echo "No cron executions found in syslog"
echo ""

# 6. Check cron log file
echo "=== 6. CRON LOG FILE ==="
if [ -f "/root/arti-marketing-ops/spotify_scraper/logs/cron.log" ]; then
    echo "✓ Cron log exists"
    echo "File size: $(du -h /root/arti-marketing-ops/spotify_scraper/logs/cron.log | cut -f1)"
    echo "Last modified: $(stat -c '%y' /root/arti-marketing-ops/spotify_scraper/logs/cron.log)"
    echo ""
    echo "Last 30 lines:"
    tail -30 /root/arti-marketing-ops/spotify_scraper/logs/cron.log
else
    echo "❌ Cron log does NOT exist at /root/arti-marketing-ops/spotify_scraper/logs/cron.log"
fi
echo ""

# 7. Check production log
echo "=== 7. PRODUCTION LOG FILE ==="
if [ -f "/root/arti-marketing-ops/spotify_scraper/logs/production.log" ]; then
    echo "✓ Production log exists"
    echo "File size: $(du -h /root/arti-marketing-ops/spotify_scraper/logs/production.log | cut -f1)"
    echo "Last modified: $(stat -c '%y' /root/arti-marketing-ops/spotify_scraper/logs/production.log)"
    echo ""
    echo "Last 30 lines:"
    tail -30 /root/arti-marketing-ops/spotify_scraper/logs/production.log
else
    echo "❌ Production log does NOT exist"
fi
echo ""

# 8. Check log directory permissions
echo "=== 8. LOG DIRECTORY PERMISSIONS ==="
ls -ld /root/arti-marketing-ops/spotify_scraper/logs/ 2>/dev/null || echo "❌ Logs directory does not exist"
echo ""

# 9. Check if .env file exists
echo "=== 9. ENVIRONMENT FILE CHECK ==="
if [ -f "/root/arti-marketing-ops/spotify_scraper/.env" ]; then
    echo "✓ .env file exists"
    ls -lh /root/arti-marketing-ops/spotify_scraper/.env
    echo "Contains $(grep -c "=" /root/arti-marketing-ops/spotify_scraper/.env) environment variables"
else
    echo "❌ .env file does NOT exist"
fi
echo ""

# 10. Check Python and dependencies
echo "=== 10. PYTHON ENVIRONMENT ==="
which python3
python3 --version
echo ""
if [ -f "/root/arti-marketing-ops/spotify_scraper/requirements-scraper-only.txt" ]; then
    echo "Checking key dependencies:"
    python3 -c "import playwright; print('✓ playwright installed')" 2>/dev/null || echo "❌ playwright NOT installed"
    python3 -c "import requests; print('✓ requests installed')" 2>/dev/null || echo "❌ requests NOT installed"
    python3 -c "import dotenv; print('✓ python-dotenv installed')" 2>/dev/null || echo "❌ python-dotenv NOT installed"
fi
echo ""

# 11. Check Xvfb (needed for GUI mode)
echo "=== 11. XVFB CHECK ==="
which Xvfb > /dev/null && echo "✓ Xvfb installed" || echo "❌ Xvfb NOT installed"
pgrep -f "Xvfb :99" > /dev/null && echo "✓ Xvfb is running" || echo "❌ Xvfb is NOT running"
echo ""

# 12. Check database from last scrape
echo "=== 12. LAST SCRAPE FROM DATABASE ==="
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres << 'EOF' 2>/dev/null || echo "❌ Could not connect to database"
SELECT 
  id,
  campaign,
  last_scraped_at,
  streams_24h,
  streams_7d,
  NOW() - last_scraped_at as time_since_scrape
FROM spotify_campaigns
WHERE last_scraped_at IS NOT NULL
ORDER BY last_scraped_at DESC
LIMIT 5;
EOF
echo ""

# 13. Check for running scraper processes
echo "=== 13. RUNNING SCRAPER PROCESSES ==="
ps aux | grep -i "run_production_scraper\|spotify.*scraper" | grep -v grep || echo "No scraper processes currently running"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DIAGNOSTIC COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"



