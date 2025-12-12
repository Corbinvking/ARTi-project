# 🚀 Deploy Scraper Admin Controls

## Overview
This deployment adds:
1. **Health Check Script** - Quick 10-second test of all scraper dependencies
2. **Backend API** - Health status, logs, manual trigger endpoints  
3. **Frontend Admin UI** - Visual status, errors, and force re-run button

---

## 📦 Phase 1: Deploy Health Check Script (5 min)

### On Server (SSH):

```bash
cd /root/arti-marketing-ops

# Pull latest code
git pull origin main

# Make scripts executable
chmod +x spotify_scraper/health_check.py
chmod +x spotify_scraper/run_health_check.sh

# Test health check
cd spotify_scraper
bash run_health_check.sh
```

**Expected Output:**
```
🔍 Running Spotify Scraper Health Check...

============================================================
Status: HEALTHY
Time: 2025-12-12T20:45:00.123456
============================================================

Checks:
  python_deps              : ✓ OK
  env_vars                 : ✓ OK
  browser_context          : ✓ OK
  xvfb                     : ✓ OK
  display                  : ⚠ WARNING: No DISPLAY set (cron will use xvfb-run)
  supabase_api             : ✓ OK
  playwright_browser       : ✓ OK
  last_run                 : ✓ 2025-12-10T02:00:00+00:00 (success)

❌ Errors (1):
  - Scraper hasn't run successfully in >36 hours

✅ Health check saved to health_status.json
```

---

## 📦 Phase 2: Deploy Backend API (10 min)

### On Server:

```bash
cd /root/arti-marketing-ops/apps/api

# Rebuild API
pnpm install
pnpm build

# Restart API server
pm2 restart api

# Verify API is running
pm2 logs api --lines 50

# Test endpoints
curl http://localhost:3002/api/scraper/status
curl http://localhost:3002/api/scraper/health
```

**Expected Response (status):**
```json
{
  "isRunning": false,
  "lastRun": {
    "timestamp": "2025-12-10T02:00:00Z",
    "status": "success"
  },
  "cronScheduled": true,
  "cronSchedule": "0 2 * * * cd /root/arti-marketing-ops && bash spotify_scraper/run_production_scraper.sh >> /root/arti-marketing-ops/spotify_scraper/logs/cron.log 2>&1",
  "lastHealthCheck": {
    "overall_status": "degraded",
    "errors": ["Scraper hasn't run successfully in >36 hours"]
  },
  "timestamp": "2025-12-12T20:45:00.000Z"
}
```

---

## 📦 Phase 3: Deploy Frontend (Auto via Vercel)

### Trigger Deployment:

```bash
# From local machine
cd C:\Users\corbi\OneDrive\Documents\GitHub\ARTi-project

# Push to GitHub (triggers Vercel)
git add .
git commit -m "feat: add scraper admin controls with health monitoring"
git push origin main
```

### Verify Deployment:

1. Go to **https://vercel.com/dashboard**
2. Wait for build to complete (~2 min)
3. Once deployed, hard refresh browser:
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

---

## 📦 Phase 4: Test Admin UI

### Navigate to Admin Page:

1. Go to **https://yourdomain.com/admin** (or wherever admin settings are)
2. Look for **"Spotify Scraper"** section

### Expected UI:

```
┌─────────────────────────────────────────────────────┐
│ Spotify Scraper                           ⚪ Idle   │
│                                      [🔄 Force Re-run]│
├─────────────────────────────────────────────────────┤
│ Last Run:           72 hours ago ⚠️                 │
│ Last Status:        success                         │
│ Cron Job:           ✓ Scheduled                     │
├─────────────────────────────────────────────────────┤
│ ⚠️ Scraper hasn't run in 72 hours! Check logs...   │
├─────────────────────────────────────────────────────┤
│ Recent Errors:                                      │
│ • Scraper hasn't run successfully in >36 hours      │
├─────────────────────────────────────────────────────┤
│                     [📜 View Logs]                  │
└─────────────────────────────────────────────────────┘
```

### Test Force Re-run:

1. Click **"🔄 Force Re-run"** button
2. Should see: `✅ Scraper triggered successfully`
3. Status should change to: `🔴 Running`
4. Wait 5-10 minutes for scraper to complete
5. Status should return to: `⚪ Idle`
6. "Last Run" should update to "< 1 hour ago"

---

## 🔍 Troubleshooting

### If Health Check Fails:

**Issue: `python_deps ✗ FAIL`**
```bash
cd /root/arti-marketing-ops/spotify_scraper
pip3 install -r requirements.txt
```

**Issue: `browser_context ⚠ WARNING`**
```bash
# Need to re-login to Spotify
cd /root/arti-marketing-ops/spotify_scraper
bash run_production_scraper.sh
# Follow login prompts
```

**Issue: `supabase_api ✗ FAIL`**
```bash
# Check environment variables
cd /root/arti-marketing-ops
cat .env | grep SUPABASE
# If missing, add them
```

### If API Endpoints Return 404:

```bash
# Check API server is running
pm2 status

# Check logs
pm2 logs api --lines 100

# Restart API
pm2 restart api
```

### If Frontend Doesn't Show New UI:

1. Hard refresh browser (Ctrl + Shift + R)
2. Check Vercel deployment status
3. Clear browser cache
4. Check browser console for errors (F12)

---

## 🎯 Next Steps

After deployment is successful:

1. **Monitor for 24 hours** - Check if scraper runs at 2 AM
2. **Set up alerts** - If scraper fails >36 hours, you'll see red warning
3. **Use force re-run** - If scraper misses a run, manually trigger it
4. **Check logs** - Use "View Logs" button to see what happened

---

## 🚨 Emergency: Scraper Still Not Running

If scraper hasn't run in 72+ hours:

### Quick Fix - Manual Trigger:

```bash
cd /root/arti-marketing-ops/spotify_scraper
bash run_production_scraper.sh
```

### Check Cron Logs:

```bash
# Check if cron job actually executed
grep "run_production_scraper" /var/log/syslog
journalctl -u cron | grep scraper

# Check scraper-specific logs
cd /root/arti-marketing-ops/spotify_scraper
tail -100 logs/cron.log
tail -100 logs/production.log
tail -100 logs/errors.log
```

### Common Issues:

1. **Cron job removed** - Re-add with `crontab -e`
2. **Xvfb zombies** - Kill with `pkill -f Xvfb`
3. **Browser context expired** - Re-login manually
4. **API was down** - Scraper now has retry logic (3 attempts)
5. **Disk full** - Check with `df -h`

---

## 📊 Success Criteria

✅ Health check runs in < 10 seconds  
✅ Backend API responds to `/api/scraper/status`  
✅ Frontend shows scraper status card  
✅ Force re-run button triggers scraper  
✅ Errors display in admin UI  
✅ Logs are viewable from frontend  
✅ Status updates every 30 seconds  

---

**🎉 Once deployed, you'll have full visibility and control over the scraper from the admin panel!**

