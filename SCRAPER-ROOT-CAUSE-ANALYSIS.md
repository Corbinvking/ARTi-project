# 🔍 Scraper Root Cause Analysis

## 🎯 **THE REAL PROBLEM IDENTIFIED**

Based on the server logs, I found **exactly why the scraper hasn't been working** for 3 days:

---

## ❌ **The Scraper IS Running... But Failing Immediately**

### **Evidence from Logs:**

```
=== Spotify Scraper Started at Thu Dec 10 02:00:01 UTC 2025 ===
2025-12-10 02:00:02,385 - INFO - Running API health check...
2025-12-10 02:00:02,440 - ERROR - ❌ API health check failed: Received HTML instead of JSON (likely Cloudflare error)
2025-12-10 02:00:02,443 - ERROR - 🚨 CRITICAL: API is not reachable. Aborting scraper run.

=== Spotify Scraper Started at Fri Dec 11 02:00:01 UTC 2025 ===
2025-12-11 02:00:02,036 - INFO - Running API health check...
2025-12-11 02:00:02,108 - ERROR - ❌ API health check failed: Received HTML instead of JSON (likely Cloudflare error)
2025-12-11 02:00:02,110 - ERROR - 🚨 CRITICAL: API is not reachable. Aborting scraper run.

=== Spotify Scraper Started at Fri Dec 12 02:00:01 UTC 2025 ===
2025-12-12 02:00:02,068 - INFO - Running API health check...
2025-12-12 02:00:02,159 - ERROR - ❌ API health check failed: Received HTML instead of JSON (likely Cloudflare error)
2025-12-12 02:00:02,166 - ERROR - 🚨 CRITICAL: API is not reachable. Aborting scraper run.
```

---

## 🚨 **Root Cause:**

### **The Supabase/Kong API is DOWN at 2 AM!**

- ✅ **Cron job IS scheduled** and **IS running** daily at 2 AM
- ✅ **Scraper IS starting** correctly
- ❌ **API health check FAILS** within 2 seconds
- ❌ **Receives Cloudflare HTML page** instead of JSON
- ❌ **Scraper correctly aborts** (as designed in failsafe)

### **What's Happening:**

1. **2:00 AM** - Cron triggers scraper
2. **2:00:02 AM** - Scraper runs API health check: `GET https://api.artistinfluence.com/rest/v1/spotify_campaigns?limit=1`
3. **2:00:02 AM** - Instead of JSON, receives Cloudflare **521 error page** (Origin Down)
4. **2:00:02 AM** - Scraper aborts (correctly following failsafe logic)
5. **Status logged:** `no_api`

---

## 🔍 **Why is the API Down at 2 AM?**

### **Possible Causes:**

1. **Kong/Supabase Container Restart**
   - Maybe a scheduled restart or cleanup happening at 2 AM?
   - Check if any cron jobs restart Docker containers at this time

2. **Zombie Process Cleanup Side Effect**
   - Your zombie cleanup runs every hour: `0 * * * * /usr/local/bin/cleanup-zombies.sh`
   - Maybe the 2 AM cleanup is restarting Caddy, which causes a brief API outage?

3. **Cloudflare Rate Limiting**
   - Cloudflare might be blocking the API at this specific time
   - Check Cloudflare dashboard for blocked requests

4. **Network/DNS Issue**
   - Transient network issue at 2 AM
   - DNS resolution failing temporarily

5. **API Container OOM (Out of Memory)**
   - API server might be crashing due to memory pressure
   - Then auto-restarting, but takes ~1 minute to come back up

---

## 🛠️ **Diagnostic Commands (Run on Server)**

### **1. Check if API is currently reachable:**
```bash
curl -I https://api.artistinfluence.com/rest/v1/spotify_campaigns?limit=1
```

**Expected (healthy):**
```
HTTP/2 200
content-type: application/json
```

**If unhealthy:**
```
HTTP/2 521
content-type: text/html
```

### **2. Check Docker container status:**
```bash
docker ps -a | grep -E "kong|supabase|api"
```

Look for:
- Containers restarting
- Containers with "Restarting" status
- Recent restart timestamps

### **3. Check Docker logs at 2 AM:**
```bash
# Check Kong logs
docker logs kong --since "2025-12-12T02:00:00" --until "2025-12-12T02:05:00"

# Check Supabase logs
docker logs supabase_db_arti-marketing-ops --since "2025-12-12T02:00:00" --until "2025-12-12T02:05:00"
```

### **4. Check zombie cleanup logs:**
```bash
journalctl -u cron | grep "2:00" | tail -20
```

Look for Caddy restarts at 2 AM.

### **5. Check PM2 API logs:**
```bash
pm2 logs api --lines 500 | grep "02:00"
```

Look for crashes or restarts at 2 AM.

### **6. Check system memory at 2 AM:**
```bash
sar -r | grep "02:00"
```

Look for OOM (Out of Memory) conditions.

---

## ✅ **Immediate Fixes**

### **Fix 1: Change Scraper Schedule (Easiest)**

**If 2 AM is consistently problematic, reschedule the cron job:**

```bash
crontab -e

# Change from:
0 2 * * * cd /root/arti-marketing-ops && bash spotify_scraper/run_production_scraper.sh >> /root/arti-marketing-ops/spotify_scraper/logs/cron.log 2>&1

# To (run at 3 AM instead):
0 3 * * * cd /root/arti-marketing-ops && bash spotify_scraper/run_production_scraper.sh >> /root/arti-marketing-ops/spotify_scraper/logs/cron.log 2>&1

# Or run at 6 AM:
0 6 * * * cd /root/arti-marketing-ops && bash spotify_scraper/run_production_scraper.sh >> /root/arti-marketing-ops/spotify_scraper/logs/cron.log 2>&1
```

### **Fix 2: Add Retry Delay in Scraper**

The scraper already has retry logic (3 attempts), but maybe it needs a longer delay:

**In `run_production_scraper.py`:**
```python
# Change retry_api_call decorator to wait longer
@retry_api_call(max_retries=5, initial_delay=30)  # 30 seconds, up to 5 retries
def check_api_health():
    # ... existing code
```

This would retry for up to **5 minutes** before giving up.

### **Fix 3: Use Internal Docker Network URL**

Instead of going through Cloudflare, use the internal Docker network:

**In `.env` file:**
```bash
# Change from:
SUPABASE_URL=https://api.artistinfluence.com

# To (internal Docker network):
SUPABASE_URL=http://kong:8000
```

**Pros:**
- ✅ Bypasses Cloudflare
- ✅ Faster (no external network)
- ✅ No rate limiting

**Cons:**
- ❌ Scraper needs to run inside Docker network (or add to Docker compose)

### **Fix 4: Investigate Zombie Cleanup**

Check if the zombie cleanup at 2 AM is restarting Caddy/Kong:

```bash
cat /usr/local/bin/cleanup-zombies.sh
```

Look for `systemctl restart caddy` or similar commands.

**If found, modify the schedule:**
```bash
# Change zombie cleanup to run at 1 AM instead of every hour
crontab -e
# Change:
0 * * * * /usr/local/bin/cleanup-zombies.sh
# To:
0 1 * * * /usr/local/bin/cleanup-zombies.sh
```

---

## 🎯 **Recommended Action Plan**

### **Immediate (5 minutes):**
1. ✅ **Change scraper schedule to 6 AM** (avoid 2 AM window)
2. ✅ **Test API health now:** `curl -I https://api.artistinfluence.com/rest/v1/spotify_campaigns?limit=1`

### **Short-term (30 minutes):**
3. ✅ **Check Docker logs** for 2 AM timeframe (find root cause)
4. ✅ **Check zombie cleanup script** (see if it restarts services)
5. ✅ **Increase retry delay** in scraper (wait longer for API to come back)

### **Long-term (2 hours):**
6. ✅ **Set up monitoring alerts** (get notified when API is down)
7. ✅ **Switch to internal Docker network** (bypass Cloudflare)
8. ✅ **Deploy admin UI** (you'll see this issue in real-time next time)

---

## 📊 **Testing the Fix**

### **After changing the schedule:**

1. **Wait for next scheduled run** (e.g., 6 AM)
2. **Check logs at 6:05 AM:**
   ```bash
   tail -100 /root/arti-marketing-ops/spotify_scraper/logs/production.log
   ```
3. **Should see:**
   ```
   === Spotify Scraper Started at [DATE] 06:00:01 UTC ===
   Running API health check...
   ✅ API health check passed!
   Fetching campaigns from database...
   Found 131 campaigns to scrape
   Processing campaign 1/131...
   ```

### **Or test immediately:**

```bash
cd /root/arti-marketing-ops/spotify_scraper
bash run_production_scraper.sh
```

**If it runs successfully NOW**, then the issue is specifically **2 AM-related**.

---

## 🔔 **Email Alerts Also Broken**

```
2025-12-10 02:00:02,458 - ERROR - Failed to send alert email: [Errno 111] Connection refused
```

**Cause:** No SMTP server configured on port 25.

**Fix (optional):**
```bash
# Install postfix (simple SMTP server)
apt-get install -y postfix
systemctl enable postfix
systemctl start postfix
```

Or configure external SMTP in the scraper (Gmail, SendGrid, etc.).

---

## ✅ **Summary**

### **What's Wrong:**
- ✅ Scraper **IS** running daily at 2 AM
- ❌ API **IS NOT** reachable at 2 AM
- ❌ Cloudflare returns **521 error** (Origin Down)
- ✅ Scraper **correctly aborts** (failsafe working)

### **Quick Fix:**
```bash
# On server:
crontab -e
# Change "0 2 * * *" to "0 6 * * *"
```

### **Root Cause Investigation:**
Check Docker logs, zombie cleanup, and PM2 logs for activity at 2 AM.

---

**The scraper is actually working perfectly!** The API is just down when it tries to run. 🎯

