# ✅ Scraper Admin Controls - Implementation Complete

## 🎯 What Was Built

You now have a **complete admin control panel** for the Spotify scraper with:

### 1. **Health Check System** (10-second validation)
- ✅ Checks all dependencies without running full scrape
- ✅ Tests Python packages, environment vars, Xvfb, browser context, Supabase API
- ✅ Saves results to JSON for API consumption
- ✅ Returns detailed error messages

### 2. **Backend API** (4 endpoints)
- ✅ `GET /api/scraper/status` - Quick status check (is running, last run, cron schedule)
- ✅ `GET /api/scraper/health` - Run full health check (~10 seconds)
- ✅ `POST /api/scraper/trigger` - Manually trigger scraper run
- ✅ `GET /api/scraper/logs` - Fetch production/error/cron logs

### 3. **Frontend Admin UI** (Beautiful dashboard)
- ✅ Real-time status display (updates every 30 seconds)
- ✅ Visual indicators: 🔴 Running / ⚪ Idle
- ✅ Last run timestamp with "hours ago" display
- ✅ ⚠️ Warning alerts when scraper hasn't run in 36+ hours
- ✅ System health status with all checks
- ✅ **Force Re-run** button (manual trigger)
- ✅ **Health Check** button (quick validation)
- ✅ **View Logs** buttons (production, errors, cron)
- ✅ Expandable log viewer with last 100 lines
- ✅ Error message display with full details

---

## 📋 Deployment Status

### ✅ Completed:
1. **Health check script created** (`spotify_scraper/health_check.py`)
2. **Backend API routes created** (`apps/api/src/routes/scraper-control.ts`)
3. **Frontend hook created** (`apps/frontend/hooks/useScraperControl.ts`)
4. **Frontend UI component created** (`apps/frontend/components/admin/scraper-status-card.tsx`)
5. **Admin page updated** to include scraper status card
6. **Code pushed to GitHub** (commits: 9ac2ee2, 9cdbbfc)

### ⏳ Pending:
1. **Deploy backend** on production server (run `deploy-scraper-admin-backend.sh`)
2. **Wait for Vercel** to deploy frontend (auto-triggered by GitHub push)
3. **Test the UI** in admin panel

---

## 🚀 Next Steps (On Server)

### **Step 1: SSH into Server**
```bash
ssh root@artistinfluence.com
```

### **Step 2: Deploy Backend**
```bash
cd /root/arti-marketing-ops
bash deploy-scraper-admin-backend.sh
```

**This script will:**
- Pull latest code
- Make health check scripts executable
- Test the health check
- Install API dependencies
- Build API
- Restart PM2 API server
- Test API endpoints

**Expected output:**
```json
{
  "isRunning": false,
  "lastRun": {
    "timestamp": "2025-12-10T02:00:00Z",
    "status": "success"
  },
  "cronScheduled": true,
  "lastHealthCheck": {
    "overall_status": "degraded",
    "errors": ["Scraper hasn't run successfully in >36 hours"]
  }
}
```

### **Step 3: Check Vercel Deployment**
1. Go to https://vercel.com/dashboard
2. Find your project
3. Wait for deployment to complete (~2-3 minutes)
4. Status should show: **"Ready"**

### **Step 4: Test Frontend**
1. Go to **https://yourdomain.com/admin** (your production URL)
2. Hard refresh browser: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
3. Scroll down to **"Spotify Scraper"** section

---

## 🎨 What You'll See in Admin Panel

```
┌─────────────────────────────────────────────────────────────┐
│ Spotify Scraper                             ⚪ Idle          │
│                         [Health Check] [🔄 Force Re-run]    │
├─────────────────────────────────────────────────────────────┤
│ Last Run              │ Last Status        │ Cron Schedule   │
│ 72h ago ⚠️            │ ✓ success          │ ✓ Scheduled     │
│ 3 days ago            │                    │ Daily at 2 AM   │
├─────────────────────────────────────────────────────────────┤
│ System Health                                   DEGRADED     │
│ python_deps: ✓ OK              env_vars: ✓ OK               │
│ browser_context: ✓ OK          xvfb: ✓ OK                   │
│ display: ⚠ WARNING             supabase_api: ✓ OK           │
│ playwright_browser: ✓ OK       last_run: ✓ 2025-12-10      │
├─────────────────────────────────────────────────────────────┤
│ ⚠️ Scraper hasn't run in 72 hours! Check logs...           │
├─────────────────────────────────────────────────────────────┤
│ Recent Errors:                                              │
│ • Scraper hasn't run successfully in >36 hours              │
├─────────────────────────────────────────────────────────────┤
│ [Production Logs ▼] [Error Logs ▼] [Cron Logs ▼]          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing the Features

### Test 1: View Current Status
- **Action:** Just load the admin page
- **Expected:** See current scraper status, last run time, errors
- **Result:** Should show "72h ago" with warning

### Test 2: Run Health Check
- **Action:** Click **"Health Check"** button
- **Expected:** ~10 seconds, then shows all checks (✓/⚠/✗)
- **Result:** Should complete without errors

### Test 3: Force Re-run
- **Action:** Click **"🔄 Force Re-run"** button
- **Expected:** Button shows "Triggering...", then success message
- **Result:** Status changes to "🔴 Running" for ~5-10 minutes
- **After:** "Last Run" updates to "< 1h ago", warning disappears

### Test 4: View Logs
- **Action:** Click **"Production Logs ▼"** button
- **Expected:** Expandable section shows last 100 log lines
- **Result:** See recent scraper activity, timestamps, campaign names

### Test 5: Auto-refresh
- **Action:** Leave page open for 30 seconds
- **Expected:** Status automatically updates
- **Result:** "Last Run" timestamp refreshes without page reload

---

## 🔍 Diagnosing Why Scraper Hasn't Run

Once deployed, the health check will tell you exactly why the scraper failed:

### Common Issues:

**Issue 1: Browser Context Missing**
```
browser_context: ⚠ WARNING: No saved context (need to re-login)
```
**Fix:**
```bash
cd /root/arti-marketing-ops/spotify_scraper
bash run_production_scraper.sh
# Follow Spotify login prompts
```

**Issue 2: Cron Job Not Scheduled**
```
cronScheduled: false
```
**Fix:**
```bash
crontab -e
# Add: 0 2 * * * cd /root/arti-marketing-ops && bash spotify_scraper/run_production_scraper.sh >> /root/arti-marketing-ops/spotify_scraper/logs/cron.log 2>&1
```

**Issue 3: API Was Down**
```
supabase_api: ✗ FAIL: Cannot reach Supabase
```
**Fix:** Already fixed with retry logic in scraper (3 attempts with exponential backoff)

**Issue 4: Xvfb Display Already in Use**
```
xvfb: ⚠ WARNING: Display :99 in use
```
**Fix:**
```bash
pkill -f Xvfb
# Wait 5 seconds, then trigger scraper again
```

---

## 📊 Success Metrics

After deployment, you should see:

- ✅ **Status updates every 30 seconds** (no page refresh needed)
- ✅ **Force re-run triggers scraper** (see logs update in real-time)
- ✅ **Health check completes in < 10 seconds** (no full scrape needed)
- ✅ **Logs viewable directly in UI** (no SSH required)
- ✅ **Warnings display when stale** (red alert if >36 hours)
- ✅ **Error messages are actionable** (tell you exactly what to fix)

---

## 🎯 Daily Workflow

### **Normal Operation:**
1. Scraper runs automatically at 2 AM daily
2. Admin panel shows "Last Run: < 24h ago" ✓
3. Status: **HEALTHY**
4. No action needed

### **If Scraper Misses a Run:**
1. Admin panel shows "Last Run: 48h ago ⚠️"
2. Status: **DEGRADED**
3. Red warning: "Scraper hasn't run in 48 hours!"
4. **Action:** Click "Health Check" to diagnose
5. Fix the issue (browser context, cron job, etc.)
6. Click "Force Re-run" to manually trigger
7. Monitor logs to ensure success

---

## 🚨 Emergency Commands

### Force Manual Run (SSH):
```bash
cd /root/arti-marketing-ops/spotify_scraper
bash run_production_scraper.sh
```

### Check Health (No Scrape):
```bash
cd /root/arti-marketing-ops/spotify_scraper
bash run_health_check.sh
cat health_status.json | jq '.'
```

### View Logs (SSH):
```bash
cd /root/arti-marketing-ops/spotify_scraper
tail -100 logs/production.log
tail -100 logs/errors.log
tail -10 status.jsonl
```

### Restart API (If Endpoints Don't Work):
```bash
pm2 restart api
pm2 logs api --lines 50
```

---

## 📚 API Reference

### GET `/api/scraper/status`
**Response:**
```json
{
  "isRunning": false,
  "lastRun": {
    "timestamp": "2025-12-10T02:00:00Z",
    "status": "success"
  },
  "cronScheduled": true,
  "cronSchedule": "0 2 * * * ...",
  "lastHealthCheck": {
    "overall_status": "healthy",
    "timestamp": "2025-12-12T20:00:00Z",
    "checks": { ... },
    "errors": []
  }
}
```

### GET `/api/scraper/health`
**Response:**
```json
{
  "timestamp": "2025-12-12T20:00:00Z",
  "overall_status": "healthy",
  "checks": {
    "python_deps": "✓ OK",
    "env_vars": "✓ OK",
    "browser_context": "✓ OK",
    "xvfb": "✓ OK",
    "display": "⚠ WARNING: No DISPLAY set",
    "supabase_api": "✓ OK",
    "playwright_browser": "✓ OK",
    "last_run": "✓ 2025-12-10T02:00:00+00:00 (success)"
  },
  "errors": []
}
```

### POST `/api/scraper/trigger`
**Response:**
```json
{
  "success": true,
  "message": "Scraper triggered successfully",
  "timestamp": "2025-12-12T20:00:00Z"
}
```

### GET `/api/scraper/logs?type=production&lines=100`
**Response:**
```json
{
  "logs": [
    "[2025-12-12 02:00:00] Starting scraper...",
    "[2025-12-12 02:00:05] Fetching campaigns...",
    "..."
  ],
  "logType": "production",
  "timestamp": "2025-12-12T20:00:00Z"
}
```

---

## 🎉 You're All Set!

**What You've Accomplished:**
- ✅ No more SSH required to check scraper status
- ✅ Real-time monitoring from admin panel
- ✅ One-click manual trigger when needed
- ✅ Instant health diagnostics (no full scrape)
- ✅ Full log visibility in browser
- ✅ Automatic alerts when scraper is stale

**Now Deploy and Test!** 🚀

Run `deploy-scraper-admin-backend.sh` on your server, wait for Vercel, and enjoy your new scraper control panel!

