# Check Spotify Scraper Cron Job Status

Run these commands on your server to diagnose the issue:

## 1. Check if Cron Job is Active

```bash
# View current crontab
crontab -l
```

**Expected output:**
```
0 2 * * * cd /root/arti-marketing-ops && bash spotify_scraper/run_production_scraper.sh >> /root/arti-marketing-ops/spotify_scraper/logs/cron.log 2>&1
```

---

## 2. Check Cron Service Status

```bash
# Check if cron daemon is running
systemctl status cron
```

Should show: `Active: active (running)`

---

## 3. Check Scraper Logs

```bash
# Check production log
tail -50 /root/arti-marketing-ops/spotify_scraper/logs/production.log

# Check cron-specific log
tail -50 /root/arti-marketing-ops/spotify_scraper/logs/cron.log

# Check system cron logs
grep CRON /var/log/syslog | tail -20
```

---

## 4. Check Last Scrape in Database

```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres << 'EOF'
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
LIMIT 10;
EOF
```

---

## 5. Manual Test Run

```bash
cd /root/arti-marketing-ops/spotify_scraper
bash run_production_scraper.sh
```

Watch for:
- ✓ Login successful
- ✓ Campaigns scraped
- ✓ Database updated
- ❌ Any errors

---

## Common Issues & Fixes

### Issue 1: Cron Job Not Set

**Fix:**
```bash
crontab -e
# Add this line:
0 2 * * * cd /root/arti-marketing-ops && bash spotify_scraper/run_production_scraper.sh >> /root/arti-marketing-ops/spotify_scraper/logs/cron.log 2>&1
```

### Issue 2: Cron Service Not Running

**Fix:**
```bash
sudo systemctl start cron
sudo systemctl enable cron
```

### Issue 3: Wrong Timezone

**Fix:**
```bash
# Check server timezone
timedatectl

# Set to your timezone (example: US Eastern)
sudo timedatectl set-timezone America/New_York
```

### Issue 4: Log Directory Doesn't Exist

**Fix:**
```bash
mkdir -p /root/arti-marketing-ops/spotify_scraper/logs
chmod 755 /root/arti-marketing-ops/spotify_scraper/logs
```

### Issue 5: Script Permissions

**Fix:**
```bash
chmod +x /root/arti-marketing-ops/spotify_scraper/run_production_scraper.sh
```

---

## Quick Diagnostic Script

Run this all-in-one diagnostic:

```bash
echo "=== CRON JOB CHECK ==="
crontab -l | grep spotify || echo "❌ No cron job found"
echo ""

echo "=== CRON SERVICE STATUS ==="
systemctl is-active cron || echo "❌ Cron service not running"
echo ""

echo "=== SERVER TIME ==="
date
timedatectl | grep "Time zone"
echo ""

echo "=== LAST SCRAPE FROM LOGS ==="
if [ -f /root/arti-marketing-ops/spotify_scraper/logs/production.log ]; then
  echo "Last 5 lines of production.log:"
  tail -5 /root/arti-marketing-ops/spotify_scraper/logs/production.log
else
  echo "❌ production.log not found"
fi
echo ""

echo "=== CRON LOG ==="
if [ -f /root/arti-marketing-ops/spotify_scraper/logs/cron.log ]; then
  echo "Last 10 lines of cron.log:"
  tail -10 /root/arti-marketing-ops/spotify_scraper/logs/cron.log
else
  echo "❌ cron.log not found"
fi
echo ""

echo "=== RECENT CRON EXECUTIONS ==="
grep "spotify_scraper" /var/log/syslog 2>/dev/null | tail -5 || echo "No cron executions found in syslog"
```

---

## Expected Cron Behavior

- **Schedule:** Daily at 2:00 AM server time
- **Duration:** 5-15 minutes (depending on number of campaigns)
- **Logs:** Written to `cron.log` and `production.log`
- **Database:** `last_scraped_at` updated after each successful scrape

---

## Next Steps

1. Run diagnostic script above
2. Share the output
3. I'll help identify the exact issue
4. Fix and verify cron runs tonight



