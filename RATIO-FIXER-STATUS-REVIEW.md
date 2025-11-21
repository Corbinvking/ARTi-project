# Ratio Fixer Integration - Status Review & Next Steps

**Date:** November 21, 2025  
**Status:** 🟡 **Partially Deployed - Needs API Endpoints & Configuration**  
**Production Ready:** ❌ **Not Yet** - Still requires setup steps

---

## Executive Summary

The Ratio Fixer Flask application is **deployed to the droplet** and **running successfully**, but it's **NOT fully integrated** with the YouTube Manager app yet. The integration code is complete on both sides, but the Flask app needs API endpoints added and the system needs final configuration.

**Current State:**
- ✅ Flask app deployed and running
- ✅ Dependencies installed
- ✅ Service account configured
- ❌ API endpoints NOT added to Flask
- ❌ CORS NOT configured
- ❌ Systemd service NOT set up (runs manually only)
- ❌ API keys NOT configured in YouTube Manager backend
- ❌ End-to-end testing NOT completed

---

## What's Complete ✅

### 1. Backend API Bridge (YouTube Manager Side)
- ✅ **File:** `apps/api/src/routes/ratio-fixer-bridge.ts`
- ✅ **Status:** Code complete, routes registered
- ✅ **Endpoints:**
  - `POST /api/ratio-fixer/start` - Start automated engagement
  - `GET /api/ratio-fixer/status/:id` - Get campaign status
  - `POST /api/ratio-fixer/stop/:id` - Stop campaign
  - `GET /api/ratio-fixer/health` - Health check

### 2. Database Schema
- ✅ **Migration:** `supabase/migrations/050_add_ratio_fixer_tracking.sql`
- ✅ **Status:** Migration file created (NOT YET RUN)
- ✅ **New Columns in `youtube_campaigns`:**
  - `ratio_fixer_campaign_id` - Links to Flask campaign
  - `ratio_fixer_status` - Current state
  - `desired_likes`, `desired_comments` - ML targets
  - `ordered_likes`, `ordered_comments` - Actual orders
- ✅ **New Table:** `youtube_ratio_fixer_orders` - Order history

### 3. Frontend Integration
- ✅ **Hook:** `apps/frontend/.../hooks/useRatioFixer.ts`
- ✅ **UI:** `RatioFixerContent.tsx` updated with Start/Stop buttons
- ✅ **Status:** Code complete, ready for testing

### 4. Flask Application Deployment
- ✅ **Location:** `/opt/ratio-fixer` on droplet
- ✅ **Files:** All Python files deployed
- ✅ **Dependencies:** Installed (Flask, pandas, sklearn, etc.)
- ✅ **Service Account:** JSON file created
- ✅ **Environment:** `.env` file configured
- ✅ **Status:** Flask app runs successfully (`python main.py` works)

---

## What's Missing ❌

### 1. Flask API Endpoints (CRITICAL)
- ❌ **Status:** NOT added to `main.py`
- ❌ **Impact:** YouTube Manager cannot communicate with Flask app
- ❌ **Needed:**
  - `/api/create_campaign` - Create campaign via API
  - `/api/campaign_status/<id>` - Get status
  - `/api/stop_campaign/<id>` - Stop campaign
  - `/healthz` - Health check

### 2. CORS Configuration
- ❌ **Status:** NOT configured
- ❌ **Impact:** API calls from YouTube Manager will be blocked
- ❌ **Needed:** Add `flask-cors` import and initialization

### 3. Systemd Service
- ❌ **Status:** NOT set up
- ❌ **Impact:** Flask app only runs manually, stops on logout
- ❌ **Needed:** Create systemd service for auto-start

### 4. Database Migration
- ❌ **Status:** NOT run
- ❌ **Impact:** YouTube Manager cannot track ratio fixer campaigns
- ❌ **Needed:** Execute migration `050_add_ratio_fixer_tracking.sql`

### 5. API Keys Configuration
- ❌ **Status:** NOT configured in YouTube Manager backend
- ❌ **Impact:** API bridge cannot authenticate with Flask
- ❌ **Needed:** Add to `apps/api/production.env`

### 6. End-to-End Testing
- ❌ **Status:** NOT completed
- ❌ **Impact:** Unknown if integration works
- ❌ **Needed:** Full test flow from UI to Flask to JingleSMM

---

## API Keys Required

### 1. YouTube Data API v3 Key ✅ (Already Have)
- **Current Value:** `AIzaSyDxDflhqOgLuw5wvJ8fYUglhQSpRqsH4U4`
- **Location:** 
  - Flask: `/opt/ratio-fixer/.env` (✅ Set)
  - YouTube Manager: `apps/api/production.env` (✅ Set)
- **Status:** ✅ Configured

### 2. JingleSMM API Key ✅ (Already Have)
- **Current Value:** `708ff328d63c1ce1548596a16f5f67b1`
- **Location:**
  - Flask: `/opt/ratio-fixer/.env` (✅ Set)
  - YouTube Manager: `apps/api/production.env` (❌ NOT SET)
- **Status:** ⚠️ Needs to be added to YouTube Manager backend

### 3. Ratio Fixer API Key (Shared Secret) ❌ (NOT SET)
- **Purpose:** Authenticate API calls between YouTube Manager and Flask
- **Location:**
  - Flask: `/opt/ratio-fixer/.env` (❌ NOT SET)
  - YouTube Manager: `apps/api/production.env` (❌ NOT SET)
- **Status:** ❌ Needs to be generated and configured
- **Action:** Generate a random secret key (32+ characters)

### 4. Google Cloud Service Account ✅ (Already Have)
- **File:** `/opt/ratio-fixer/rich-phenomenon-428302-q5-dba5f2f381c1.json`
- **Status:** ✅ Created and configured
- **Environment Variable:** `GOOGLE_APPLICATION_CREDENTIALS` (❌ NOT in .env permanently)

---

## Integration Status

### Current Integration Level: **30% Complete**

```
┌─────────────────────────────────────┐
│   YouTube Manager (Next.js)         │
│   ✅ Frontend UI ready               │
│   ✅ API bridge code ready           │
│   ❌ API keys NOT configured         │
└────────────┬────────────────────────┘
             │ HTTP API Calls
             │ ❌ Will fail - no endpoints
             ▼
┌─────────────────────────────────────┐
│   Ratio Fixer (Flask)               │
│   ✅ App deployed                    │
│   ✅ Dependencies installed          │
│   ❌ API endpoints NOT added         │
│   ❌ CORS NOT configured              │
│   ❌ Not running as service          │
└────────────┬────────────────────────┘
             │
             ├─▶ YouTube API ✅
             ├─▶ Google Sheets ✅
             └─▶ JingleSMM ✅
```

**Blockers:**
1. Flask API endpoints missing → Cannot receive requests
2. CORS not configured → Requests will be blocked
3. API keys not set → Authentication will fail
4. Database migration not run → Cannot track campaigns

---

## Actionable Next Steps

### Phase 1: Complete Flask Setup (30 minutes)

#### Step 1.1: Add API Endpoints to Flask
```bash
# On droplet
cd /opt/ratio-fixer
nano main.py

# Add these imports at the top (around line 18):
from flask_cors import CORS

# Add CORS initialization (after app = Flask line):
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Add API endpoints before "if __name__ == '__main__':"
# (Copy from RATIO-FIXER-DEPLOYMENT-GUIDE.md or use the script)
```

**Or use automated script:**
```bash
# I'll provide a complete patch file you can apply
```

#### Step 1.2: Add CORS to Dependencies
```bash
cd /opt/ratio-fixer
source venv/bin/activate
pip install flask-cors
```

#### Step 1.3: Test Flask API
```bash
# Test health endpoint
curl http://localhost:5000/healthz

# Should return: {"status":"healthy"}
```

---

### Phase 2: Configure API Keys (15 minutes)

#### Step 2.1: Generate Shared Secret
```bash
# On droplet, generate a random key
openssl rand -hex 32
# Copy the output - this is your RATIO_FIXER_API_KEY
```

#### Step 2.2: Add to Flask .env
```bash
cd /opt/ratio-fixer
echo "RATIO_FIXER_API_KEY=YOUR_GENERATED_KEY_HERE" >> .env
echo "GOOGLE_APPLICATION_CREDENTIALS=/opt/ratio-fixer/rich-phenomenon-428302-q5-dba5f2f381c1.json" >> .env
```

#### Step 2.3: Add to YouTube Manager Backend
```bash
# On droplet
cd ~/arti-marketing-ops
nano apps/api/production.env

# Add these lines:
RATIO_FIXER_URL=http://localhost:5000
RATIO_FIXER_API_KEY=YOUR_GENERATED_KEY_HERE
JINGLE_SMM_API_KEY=708ff328d63c1ce1548596a16f5f67b1

# Rebuild and restart API
docker compose build api
docker compose up -d api
```

---

### Phase 3: Set Up Systemd Service (15 minutes)

#### Step 3.1: Create Service File
```bash
sudo nano /etc/systemd/system/ratio-fixer.service
```

**Paste this content:**
```ini
[Unit]
Description=Ratio Fixer Flask App
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/ratio-fixer
Environment="PATH=/opt/ratio-fixer/venv/bin"
Environment="GOOGLE_APPLICATION_CREDENTIALS=/opt/ratio-fixer/rich-phenomenon-428302-q5-dba5f2f381c1.json"
ExecStart=/opt/ratio-fixer/venv/bin/python main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### Step 3.2: Enable and Start
```bash
sudo systemctl daemon-reload
sudo systemctl enable ratio-fixer
sudo systemctl start ratio-fixer
sudo systemctl status ratio-fixer
```

---

### Phase 4: Run Database Migration (5 minutes)

```bash
# On droplet
cd ~/arti-marketing-ops

# Run migration
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/050_add_ratio_fixer_tracking.sql

# Verify columns added
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'youtube_campaigns' 
AND column_name LIKE 'ratio_fixer%';
"
```

---

### Phase 5: Test Integration (30 minutes)

#### Step 5.1: Test Flask Health
```bash
curl http://localhost:5000/healthz
# Expected: {"status":"healthy"}
```

#### Step 5.2: Test API Bridge Health
```bash
curl http://localhost:3001/api/ratio-fixer/health
# Expected: {"status":"healthy","available":true}
```

#### Step 5.3: Test from Frontend
1. Go to https://app.artistinfluence.com/youtube/campaigns
2. Click a campaign
3. Navigate to "Ratio Fixer" tab
4. Configure prerequisites (Comments Sheet URL, servers)
5. Click "Start Automated Ratio Fixer"
6. Should see "Ratio Fixer Active" status

#### Step 5.4: Verify Orders
```bash
# Check Flask logs
sudo journalctl -u ratio-fixer -f

# Check database
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT campaign_name, ratio_fixer_status, ordered_likes, ordered_comments
FROM youtube_campaigns
WHERE ratio_fixer_status = 'running';
"
```

---

## Quick Checklist

### Flask App Setup
- [ ] Add API endpoints to `main.py`
- [ ] Install and configure `flask-cors`
- [ ] Add `RATIO_FIXER_API_KEY` to `.env`
- [ ] Add `GOOGLE_APPLICATION_CREDENTIALS` to `.env`
- [ ] Test Flask API endpoints locally
- [ ] Create systemd service
- [ ] Start and enable service
- [ ] Verify service runs on boot

### YouTube Manager Backend
- [ ] Add `RATIO_FIXER_URL` to `production.env`
- [ ] Add `RATIO_FIXER_API_KEY` to `production.env`
- [ ] Add `JINGLE_SMM_API_KEY` to `production.env`
- [ ] Rebuild API container
- [ ] Restart API container
- [ ] Test API bridge health endpoint

### Database
- [ ] Run migration `050_add_ratio_fixer_tracking.sql`
- [ ] Verify columns added to `youtube_campaigns`
- [ ] Verify `youtube_ratio_fixer_orders` table created

### Testing
- [ ] Test Flask health endpoint
- [ ] Test API bridge health endpoint
- [ ] Test campaign creation from UI
- [ ] Verify status polling works
- [ ] Verify orders are placed
- [ ] Check database tracking

---

## Current Deployment Status

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| **Flask App** | 🟡 Partial | `/opt/ratio-fixer` | Running manually, needs API endpoints |
| **API Bridge** | ✅ Complete | `apps/api/src/routes/ratio-fixer-bridge.ts` | Code ready, needs config |
| **Frontend UI** | ✅ Complete | `RatioFixerContent.tsx` | Ready for testing |
| **Database** | ❌ Not Run | Migration file exists | Needs execution |
| **Systemd Service** | ❌ Not Created | N/A | Needs setup |
| **API Keys** | 🟡 Partial | `.env` files | Some set, some missing |

---

## Estimated Time to Production Ready

- **Phase 1 (Flask Setup):** 30 minutes
- **Phase 2 (API Keys):** 15 minutes
- **Phase 3 (Systemd):** 15 minutes
- **Phase 4 (Database):** 5 minutes
- **Phase 5 (Testing):** 30 minutes

**Total: ~1.5 hours** to fully production-ready

---

## API Keys Summary

| Key | Purpose | Current Status | Where Needed |
|-----|---------|----------------|--------------|
| **YOUTUBE_API_KEY** | Fetch video stats | ✅ Set | Flask `.env`, API `production.env` |
| **JINGLE_SMM_KEY** | Order likes/comments | ✅ Set | Flask `.env`, ❌ API `production.env` |
| **RATIO_FIXER_API_KEY** | Auth between apps | ❌ Not Set | Flask `.env`, API `production.env` |
| **GOOGLE_APPLICATION_CREDENTIALS** | GCP service account | ✅ File exists | Flask `.env` (needs permanent) |

---

## Critical Path to Production

1. **Add API endpoints to Flask** ← BLOCKER
2. **Configure CORS** ← BLOCKER
3. **Set up systemd service** ← Required for production
4. **Configure API keys** ← Required for communication
5. **Run database migration** ← Required for tracking
6. **Test end-to-end** ← Required for validation

---

## Support Resources

- **Deployment Guide:** `RATIO-FIXER-DEPLOYMENT-GUIDE.md`
- **Integration Guide:** `RATIO-FIXER-INTEGRATION-COMPLETE.md`
- **Technical Deep Dive:** `RATIO-FIXER-DEEP-DIVE.md`
- **Comparison Guide:** `RATIO-FIXER-VS-YOUTUBE-MANAGER.md`

---

## Next Immediate Action

**Priority 1:** Add API endpoints to Flask app  
**Priority 2:** Configure CORS  
**Priority 3:** Set up systemd service  

Once these 3 items are complete, the integration will be functional and ready for testing.

---

**Status:** 🟡 **30% Complete - Needs API Endpoints & Configuration**  
**Production Ready:** ❌ **No - Estimated 1.5 hours remaining**  
**Risk Level:** 🟢 **Low - All code complete, just needs setup**

