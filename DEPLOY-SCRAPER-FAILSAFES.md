# Deploying Scraper Failsafes to Production Server

## 🚀 Quick Deployment

SSH into the server and run:

```bash
cd /root/arti-marketing-ops
bash deploy-scraper.sh
```

This will:
- Pull latest code
- Restore executable permissions
- Validate all components
- Check API connectivity
- Verify environment variables

---

## 📋 Manual Deployment Steps

If you prefer to deploy manually:

### 1. Pull Latest Code

```bash
cd /root/arti-marketing-ops
git pull origin main
```

### 2. Restore Permissions

```bash
chmod +x spotify_scraper/*.sh
chmod +x spotify_scraper/*.py
chmod +x deploy-scraper.sh
```

### 3. Install Git Hook (Optional but Recommended)

```bash
# Copy hook to .git/hooks
cp .git-hooks/post-merge .git/hooks/post-merge
chmod +x .git/hooks/post-merge

# Test it
.git/hooks/post-merge
```

This will automatically restore permissions after every `git pull`.

### 4. Set Up Health Check Cron Job

```bash
# Edit crontab
crontab -e

# Add this line to check health every 6 hours
0 */6 * * * bash /root/arti-marketing-ops/spotify_scraper/check_scraper_health.sh >> /var/log/scraper_health.log 2>&1
```

### 5. Configure Email Alerts (Optional)

Add to `.env`:

```bash
ALERT_EMAIL=admin@artistinfluence.com
```

If you want email alerts, install mail client:

```bash
apt-get install -y mailutils
```

### 6. Test the Scraper

```bash
cd /root/arti-marketing-ops/spotify_scraper
bash run_production_scraper.sh
```

Watch the logs for new features:
- ✅ API health check
- ✅ Retry logic with backoff
- ✅ HTML error detection
- ✅ Status logging

### 7. Verify Logs

Check the new log files:

```bash
# Structured status log
tail -f spotify_scraper/logs/status.jsonl

# Error log
tail -f spotify_scraper/logs/errors.log

# Standard log
tail -f spotify_scraper/logs/production.log
```

---

## 🧪 Testing the Failsafes

### Test 1: API Health Check

```bash
# Temporarily break API access
export SUPABASE_URL="https://fake-api.example.com"

# Run scraper - should fail gracefully with health check error
cd spotify_scraper
python3 run_production_scraper.py --limit 1

# Should see:
# ❌ API health check failed
# 🚨 CRITICAL: API is not reachable. Aborting scraper run.
```

### Test 2: Retry Logic

Watch the logs during next scrape - if API is slow, you'll see:
```
Fetching campaigns (attempt 1/3)...
⏳ Retrying in 60s... (attempt 1/3)
```

### Test 3: Health Check Script

```bash
# Run health check manually
bash spotify_scraper/check_scraper_health.sh

# Should output:
# ✅ Scraper is HEALTHY
# Last scrape was X hours ago
```

### Test 4: Status Logging

```bash
# View scraper run history
cat spotify_scraper/logs/status.jsonl | jq '.'

# Example output:
# {
#   "timestamp": "2025-12-09T20:30:00Z",
#   "status": "success",
#   "campaigns_total": 131,
#   "campaigns_success": 131,
#   "campaigns_failed": 0
# }
```

---

## 📊 Monitoring Dashboard

### Check Last Run Status

```bash
# Quick status
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT campaign, last_scraped_at, streams_24h, streams_7d
FROM spotify_campaigns 
ORDER BY last_scraped_at DESC 
LIMIT 5;
"
```

### Check Success Rate

```bash
# View last 10 runs
tail -10 spotify_scraper/logs/status.jsonl | jq '{time: .timestamp, status: .status, success: .campaigns_success, total: .campaigns_total}'
```

---

## 🔧 Troubleshooting

### Issue: Health Check Always Fails

**Check:**
```bash
# Test API manually
curl -I https://api.artistinfluence.com/rest/v1/

# Check if database is accessible
docker ps | grep supabase
```

### Issue: No Email Alerts

**Solution:**
```bash
# Test mail command
echo "Test email" | mail -s "Test" admin@artistinfluence.com

# If fails, install mailutils
apt-get update && apt-get install -y mailutils
```

### Issue: Git Hook Not Working

**Solution:**
```bash
# Ensure hook is executable
chmod +x .git/hooks/post-merge

# Test manually
.git/hooks/post-merge

# Check if git is using hooks
git config --get core.hooksPath
```

### Issue: Permissions Reset After Pull

**Cause:** Git hook not installed or not executable

**Solution:**
```bash
# Use deployment script instead
bash deploy-scraper.sh

# Or manually restore
chmod +x spotify_scraper/*.sh spotify_scraper/*.py
```

---

## 📝 What Changed

### Modified Files

1. **`spotify_scraper/run_production_scraper.py`**
   - Added `check_api_health()` function
   - Added `fetch_campaigns_with_retry()` with exponential backoff
   - Added `send_alert_email()` for critical failures
   - Added `log_scraper_run()` for status tracking
   - Modified `main()` to use health checks and logging
   - Improved error handling throughout

### New Files

1. **`spotify_scraper/check_scraper_health.sh`**
   - Monitors last scrape time
   - Alerts if scraper is stale (>26 hours)
   - Checks system components (cron, Xvfb, API)

2. **`deploy-scraper.sh`**
   - Safe deployment automation
   - Validates all components
   - Restores permissions
   - Runs health checks

3. **`.git-hooks/post-merge`**
   - Automatically restores executable permissions after `git pull`

### New Log Files

1. **`spotify_scraper/logs/errors.log`**
   - ERROR level logs only
   - Easy to scan for problems

2. **`spotify_scraper/logs/status.jsonl`**
   - Structured JSON logs
   - Each line = one scraper run
   - Easy to parse and analyze

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Code pulled successfully
- [ ] Executable permissions restored
- [ ] Git hook installed (optional)
- [ ] Health check cron job added
- [ ] `.env` has `ALERT_EMAIL` set
- [ ] Manual test run completes
- [ ] Health check script runs without errors
- [ ] Status logs are being created
- [ ] No errors in production.log

---

## 🎯 Next Cron Run

The scraper will run automatically at **2:00 AM UTC** daily.

After the next run, check:

```bash
# View latest status
tail -1 spotify_scraper/logs/status.jsonl | jq '.'

# Check if it ran
bash spotify_scraper/check_scraper_health.sh
```

---

**Deployment completed! The scraper now has comprehensive failsafes.** 🎉

