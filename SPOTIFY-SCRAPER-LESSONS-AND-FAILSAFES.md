# Spotify Scraper: Lessons Learned & Failsafe Implementation

> **Date:** December 9, 2025  
> **Incident:** Scraper stopped working for 66 hours (Dec 7 → Dec 9)

---

## 🔍 What We Learned

### 1. **API Connectivity is a Single Point of Failure**
**Problem:** At 2:00 AM on Dec 9, the scraper got a Cloudflare 521 error instead of JSON data.
- The API was temporarily unreachable
- Scraper received HTML error page instead of campaign data
- Logged "No campaigns to scrape" and exited silently
- **Result:** No data updates for 66 hours

**Lesson:** The scraper needs to distinguish between "no campaigns" and "API unreachable".

---

### 2. **Git Pull Can Break Executable Permissions**
**Problem:** After `git pull`, `run_production_scraper.sh` lost its executable flag.
- File permissions changed from `-rwxr-xr-x` to `-rw-r--r--`
- Cron job tried to run non-executable script
- Failed silently with "No such file or directory" error

**Lesson:** Executable permissions need to be preserved or reset after deployments.

---

### 3. **Silent Failures Are Dangerous**
**Problem:** The scraper failed for 66 hours before anyone noticed.
- No alerts or notifications
- Frontend showed stale data (last scraped "66h ago")
- No monitoring or health checks

**Lesson:** We need proactive monitoring and alerting.

---

### 4. **Environment Variables Can Cause Confusion**
**Problem:** Manual testing failed due to missing `$DISPLAY` variable.
- Xvfb was running, but Python couldn't find it
- Error message was unclear about root cause
- Wrapper script worked, but direct Python execution didn't

**Lesson:** Better documentation and clearer error messages needed.

---

## 🛡️ Failsafe Implementation Plan

### **Priority 1: API Connectivity Failsafes**

#### A. Pre-Flight Health Check
Add a health check before starting the scrape:

```python
async def check_api_health():
    """Check if Supabase API is reachable before starting scrape"""
    try:
        headers = {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}'
        }
        
        # Simple health check endpoint
        url = f"{SUPABASE_URL}/rest/v1/"
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            logger.info("✅ API health check passed")
            return True
        else:
            logger.error(f"❌ API health check failed: {response.status_code}")
            return False
            
    except Exception as e:
        logger.error(f"❌ API health check failed: {e}")
        return False

# In main():
if not await check_api_health():
    logger.error("Cannot proceed without API access. Exiting.")
    sys.exit(1)
```

#### B. Retry Logic for API Failures
Implement exponential backoff for API requests:

```python
def fetch_campaigns_with_retry(max_retries=3):
    """Fetch campaigns with retry logic"""
    for attempt in range(max_retries):
        try:
            response = requests.get(url, headers=headers, params=params, timeout=30)
            
            # Check if we got HTML instead of JSON (Cloudflare error)
            if 'text/html' in response.headers.get('Content-Type', ''):
                logger.error(f"Received HTML instead of JSON (likely Cloudflare error)")
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt * 60  # 1min, 2min, 4min
                    logger.info(f"Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                else:
                    logger.error("Max retries exceeded. Exiting.")
                    sys.exit(1)
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt * 60
                logger.info(f"Retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                logger.error("Max retries exceeded. Exiting.")
                sys.exit(1)
```

#### C. Distinguish "No Data" from "API Error"
Improve error handling:

```python
campaigns = fetch_campaigns_from_database(limit=args.limit)

if campaigns is None:
    # API error occurred
    logger.error("🚨 FATAL: Could not connect to API")
    send_alert("Spotify Scraper: API Connection Failed")
    sys.exit(1)
elif len(campaigns) == 0:
    # No campaigns found (this is okay)
    logger.warning("No campaigns to scrape")
    sys.exit(0)
else:
    # Success!
    logger.info(f"Found {len(campaigns)} campaigns")
```

---

### **Priority 2: Monitoring & Alerting**

#### A. Health Check Script
Create `check_scraper_health.sh`:

```bash
#!/bin/bash
# Check if scraper has run recently

THRESHOLD_HOURS=26  # Alert if no scrape in 26 hours (cron runs every 24h)

LAST_SCRAPE=$(docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -t -c "
SELECT EXTRACT(EPOCH FROM (NOW() - MAX(last_scraped_at)))/3600 
FROM spotify_campaigns 
WHERE last_scraped_at IS NOT NULL;
")

HOURS=$(echo $LAST_SCRAPE | xargs)  # Trim whitespace

if (( $(echo "$HOURS > $THRESHOLD_HOURS" | bc -l) )); then
    echo "🚨 ALERT: Last scrape was $HOURS hours ago!"
    # Send alert (implement email/Slack webhook here)
    exit 1
else
    echo "✅ Scraper is healthy (last scrape: $HOURS hours ago)"
    exit 0
fi
```

Add to crontab to check every 6 hours:
```bash
0 */6 * * * /root/arti-marketing-ops/spotify_scraper/check_scraper_health.sh >> /var/log/scraper_health.log 2>&1
```

#### B. Success/Failure Logging
Log every run with clear status:

```python
def log_scraper_run(status, campaigns_scraped, error_message=None):
    """Log scraper run to a dedicated status file"""
    log_entry = {
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'status': status,  # 'success', 'partial', 'failed'
        'campaigns_scraped': campaigns_scraped,
        'error_message': error_message
    }
    
    with open('/root/arti-marketing-ops/spotify_scraper/logs/status.json', 'a') as f:
        f.write(json.dumps(log_entry) + '\n')
```

#### C. Email Alerts on Failure
Add email notification:

```python
import smtplib
from email.message import EmailMessage

def send_alert(subject, body):
    """Send email alert on critical failure"""
    try:
        msg = EmailMessage()
        msg['Subject'] = subject
        msg['From'] = 'scraper@artistinfluence.com'
        msg['To'] = 'admin@artistinfluence.com'
        msg.set_content(body)
        
        # Use server's sendmail or SMTP
        with smtplib.SMTP('localhost') as smtp:
            smtp.send_message(msg)
            
        logger.info("Alert email sent")
    except Exception as e:
        logger.error(f"Failed to send alert: {e}")
```

---

### **Priority 3: Executable Permissions Failsafe**

#### A. Git Post-Merge Hook
Create `.git/hooks/post-merge`:

```bash
#!/bin/bash
# Restore executable permissions after git pull

echo "Restoring executable permissions..."
chmod +x /root/arti-marketing-ops/spotify_scraper/run_production_scraper.sh
chmod +x /root/arti-marketing-ops/spotify_scraper/run_production_scraper.py
chmod +x /root/arti-marketing-ops/spotify_scraper/manual_browser_login.py

echo "✅ Permissions restored"
```

Make the hook executable:
```bash
chmod +x .git/hooks/post-merge
```

#### B. Deployment Script
Create `deploy.sh`:

```bash
#!/bin/bash
# Safe deployment script

set -e

echo "🚀 Deploying Spotify Scraper..."

# Pull latest code
git pull origin main

# Restore permissions
chmod +x spotify_scraper/*.sh
chmod +x spotify_scraper/*.py

# Verify cron job exists
if ! crontab -l | grep -q "run_production_scraper.sh"; then
    echo "⚠️  WARNING: Cron job not found!"
fi

# Check if Xvfb is running
if ! pgrep -x "Xvfb" > /dev/null; then
    echo "⚠️  WARNING: Xvfb is not running!"
fi

# Test API connectivity
if curl -f -s https://api.artistinfluence.com/rest/v1/ > /dev/null; then
    echo "✅ API is reachable"
else
    echo "❌ API is NOT reachable!"
    exit 1
fi

echo "✅ Deployment complete"
```

---

### **Priority 4: Better Logging**

#### A. Structured Logging
Improve log format:

```python
import logging
import json

class StructuredLogger:
    def __init__(self, name):
        self.logger = logging.getLogger(name)
        
    def log_event(self, event_type, **kwargs):
        log_entry = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'event_type': event_type,
            **kwargs
        }
        self.logger.info(json.dumps(log_entry))

# Usage:
logger.log_event('scrape_start', campaigns_count=131)
logger.log_event('campaign_success', campaign_id=123, streams_24h=1500)
logger.log_event('api_error', error='Connection timeout', retry_count=2)
```

#### B. Separate Log Files
```python
# Success log
success_handler = logging.FileHandler('logs/success.log')
success_logger = logging.getLogger('success')
success_logger.addHandler(success_handler)

# Error log
error_handler = logging.FileHandler('logs/errors.log')
error_logger = logging.getLogger('errors')
error_logger.addHandler(error_handler)
```

---

### **Priority 5: Dashboard & Metrics**

#### A. Simple Status Dashboard
Create `spotify_scraper/status.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Scraper Status</title>
    <meta http-equiv="refresh" content="60">
</head>
<body>
    <h1>Spotify Scraper Status</h1>
    <div id="status">Loading...</div>
    
    <script>
        fetch('/api/scraper-status')
            .then(r => r.json())
            .then(data => {
                document.getElementById('status').innerHTML = `
                    <p>Last Scrape: ${data.last_scrape_time}</p>
                    <p>Hours Ago: ${data.hours_ago}</p>
                    <p>Campaigns Scraped: ${data.campaigns_count}</p>
                    <p>Status: ${data.status}</p>
                `;
            });
    </script>
</body>
</html>
```

#### B. Add Status Endpoint to API
In `apps/api/src/routes/scraper-status.ts`:

```typescript
router.get('/scraper-status', async (req, res) => {
    const { data } = await supabase
        .from('spotify_campaigns')
        .select('last_scraped_at')
        .order('last_scraped_at', { ascending: false })
        .limit(1)
        .single();
    
    const hoursAgo = data 
        ? (Date.now() - new Date(data.last_scraped_at).getTime()) / (1000 * 60 * 60)
        : null;
    
    res.json({
        last_scrape_time: data?.last_scraped_at,
        hours_ago: hoursAgo,
        status: hoursAgo < 26 ? 'healthy' : 'stale'
    });
});
```

---

## 📋 Implementation Checklist

### **Immediate (Do Now)**
- [x] Fix executable permissions (`chmod +x`)
- [x] Verify cron job is scheduled
- [x] Test manual scraper run
- [ ] Add API health check to scraper
- [ ] Implement retry logic for API failures
- [ ] Create `check_scraper_health.sh` monitoring script

### **Short Term (This Week)**
- [ ] Add email alerting on failures
- [ ] Create git post-merge hook
- [ ] Implement structured logging
- [ ] Add separate error log file
- [ ] Create deployment script (`deploy.sh`)

### **Medium Term (This Month)**
- [ ] Build status dashboard
- [ ] Add metrics collection (scrape duration, success rate)
- [ ] Implement Slack/Discord webhook alerts
- [ ] Create runbook for common issues
- [ ] Add automated tests for scraper logic

### **Long Term (Nice to Have)**
- [ ] Move scraper to containerized environment
- [ ] Implement distributed scraping (multiple workers)
- [ ] Add rate limiting intelligence (adjust based on API health)
- [ ] Create admin UI for scraper management
- [ ] Implement automatic session refresh (re-login on expiry)

---

## 🚨 Quick Fix Commands

### If Scraper Stops Working:

```bash
# 1. Check API health
curl -I https://api.artistinfluence.com/rest/v1/

# 2. Check cron job
crontab -l | grep spotify

# 3. Check Xvfb
ps aux | grep Xvfb

# 4. Check permissions
ls -lah /root/arti-marketing-ops/spotify_scraper/*.sh

# 5. Check last run
tail -100 /root/arti-marketing-ops/spotify_scraper/logs/production.log

# 6. Manual test run
cd /root/arti-marketing-ops/spotify_scraper
bash run_production_scraper.sh

# 7. Check database
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT campaign, last_scraped_at 
FROM spotify_campaigns 
ORDER BY last_scraped_at DESC LIMIT 5;"
```

---

## 📞 Escalation Path

1. **Check logs first** - `tail -100 logs/production.log`
2. **Test API connectivity** - `curl https://api.artistinfluence.com/rest/v1/`
3. **Run health check** - `bash check_scraper_health.sh`
4. **Manual test** - `bash run_production_scraper.sh`
5. **Check VNC** - Connect to port 5900 to see browser
6. **Review this document** - Follow troubleshooting steps

---

**Last Updated:** December 9, 2025  
**Status:** ✅ Scraper operational, failsafes pending implementation

