# Ratio Fixer Full Integration Guide

**Date:** November 21, 2025  
**Estimated Time:** 1.5 hours  
**Status:** Ready to Execute

---

## Overview

This guide will walk you through completing the full integration of the Ratio Fixer Flask app with the YouTube Manager. All code is ready - we just need to configure and deploy.

---

## Prerequisites

- ✅ Flask app deployed to `/opt/ratio-fixer`
- ✅ Dependencies installed
- ✅ Service account JSON file exists
- ✅ YouTube Manager API bridge code complete
- ✅ Frontend UI complete

---

## Step-by-Step Integration

### Step 1: Add API Endpoints to Flask (15 minutes)

#### 1.1: Copy Patch Script to Droplet

**On your local machine:**
```bash
# From project root
scp flask-api-endpoints-patch.py root@YOUR_DROPLET_IP:/opt/ratio-fixer/
```

**Or create it directly on droplet:**
```bash
# SSH to droplet
ssh root@YOUR_DROPLET_IP

# Navigate to ratio-fixer directory
cd /opt/ratio-fixer

# Pull latest from GitHub (if you committed the patch script)
cd ~/arti-marketing-ops
git pull origin main
cp flask-api-endpoints-patch.py /opt/ratio-fixer/
```

#### 1.2: Run Patch Script

```bash
cd /opt/ratio-fixer
source venv/bin/activate
python3 flask-api-endpoints-patch.py main.py
```

**Expected output:**
```
✅ Added CORS import
✅ Added CORS initialization
✅ Added API endpoints
✅ Successfully patched main.py
```

#### 1.3: Install flask-cors

```bash
cd /opt/ratio-fixer
source venv/bin/activate
pip install flask-cors
```

#### 1.4: Test Flask API

```bash
# Start Flask app (in a separate terminal or screen session)
cd /opt/ratio-fixer
source venv/bin/activate
python main.py

# In another terminal, test health endpoint
curl http://localhost:5000/healthz
# Expected: {"status":"healthy"}

# Test with API key (if set)
curl -H "X-API-Key: test-key" http://localhost:5000/healthz
```

**Stop Flask app** (Ctrl+C) - we'll set it up as a service next.

---

### Step 2: Configure API Keys (10 minutes)

#### 2.1: Generate Shared Secret

```bash
# On droplet
openssl rand -hex 32
# Copy the output - this is your RATIO_FIXER_API_KEY
# Example: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

#### 2.2: Add to Flask .env

```bash
cd /opt/ratio-fixer
nano .env
```

**Add these lines:**
```bash
RATIO_FIXER_API_KEY=YOUR_GENERATED_KEY_HERE
GOOGLE_APPLICATION_CREDENTIALS=/opt/ratio-fixer/rich-phenomenon-428302-q5-dba5f2f381c1.json
```

**Save and exit** (Ctrl+X, Y, Enter)

#### 2.3: Add to YouTube Manager Backend

```bash
cd ~/arti-marketing-ops
nano apps/api/production.env
```

**Add these lines:**
```bash
# Ratio Fixer API Bridge
RATIO_FIXER_URL=http://localhost:5000
RATIO_FIXER_API_KEY=YOUR_GENERATED_KEY_HERE
JINGLE_SMM_API_KEY=708ff328d63c1ce1548596a16f5f67b1
```

**Save and exit** (Ctrl+X, Y, Enter)

#### 2.4: Rebuild and Restart API Container

```bash
cd ~/arti-marketing-ops
docker compose build --no-cache api
docker compose up -d api

# Verify API is running
docker compose logs api --tail 50
```

---

### Step 3: Set Up Systemd Service (10 minutes)

#### 3.1: Create Service File

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
EnvironmentFile=/opt/ratio-fixer/.env
ExecStart=/opt/ratio-fixer/venv/bin/python main.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Save and exit** (Ctrl+X, Y, Enter)

#### 3.2: Enable and Start Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable ratio-fixer
sudo systemctl start ratio-fixer
sudo systemctl status ratio-fixer
```

**Expected output:**
```
● ratio-fixer.service - Ratio Fixer Flask App
     Loaded: loaded (/etc/systemd/system/ratio-fixer.service; enabled)
     Active: active (running) since ...
```

#### 3.3: Verify Service is Running

```bash
# Check logs
sudo journalctl -u ratio-fixer -f

# Test health endpoint
curl http://localhost:5000/healthz
# Expected: {"status":"healthy"}

# Check if service auto-starts on reboot
sudo systemctl is-enabled ratio-fixer
# Expected: enabled
```

---

### Step 4: Run Database Migration (5 minutes)

#### 4.1: Run Migration

```bash
cd ~/arti-marketing-ops

# Run migration
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/050_add_ratio_fixer_tracking.sql
```

**Expected output:**
```
ALTER TABLE
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
```

#### 4.2: Verify Migration

```bash
# Check columns added
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'youtube_campaigns' 
AND column_name LIKE 'ratio_fixer%'
ORDER BY column_name;
"

# Check table created
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'youtube_ratio_fixer_orders';
"
```

**Expected output:**
```
ratio_fixer_campaign_id
ratio_fixer_last_update
ratio_fixer_status
desired_comments
desired_likes
ordered_comments
ordered_likes
```

---

### Step 5: Test Integration (30 minutes)

#### 5.1: Test Flask Health

```bash
curl http://localhost:5000/healthz
# Expected: {"status":"healthy"}
```

#### 5.2: Test API Bridge Health

```bash
curl http://localhost:3001/api/ratio-fixer/health
# Expected: {"status":"healthy","available":true,"ratioFixerUrl":"http://localhost:5000"}
```

#### 5.3: Test from Frontend

1. **Go to:** https://app.artistinfluence.com/youtube/campaigns
2. **Click** a campaign
3. **Navigate** to "Ratio Fixer" tab
4. **Configure prerequisites:**
   - Comments Sheet URL (Google Sheets)
   - Comment Server ID (default: 439)
   - Like Server ID (default: 2324)
   - Sheet Tier (default: Tier One)
5. **Click** "Start Automated Ratio Fixer"
6. **Verify:**
   - Status shows "Ratio Fixer Active"
   - Desired likes/comments calculated
   - Ordered quantities update over time

#### 5.4: Verify Database Tracking

```bash
# Check campaign status
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
    campaign_name, 
    ratio_fixer_status, 
    ratio_fixer_campaign_id,
    desired_likes, 
    desired_comments,
    ordered_likes, 
    ordered_comments
FROM youtube_campaigns
WHERE ratio_fixer_status = 'running'
LIMIT 5;
"

# Check orders table
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
    campaign_id,
    order_type,
    quantity,
    status,
    ordered_at
FROM youtube_ratio_fixer_orders
ORDER BY ordered_at DESC
LIMIT 10;
"
```

#### 5.5: Monitor Flask Logs

```bash
# Watch Flask app logs
sudo journalctl -u ratio-fixer -f

# Look for:
# - Campaign creation logs
# - Order placement logs
# - Status update logs
```

---

## Troubleshooting

### Flask App Won't Start

```bash
# Check service status
sudo systemctl status ratio-fixer

# Check logs
sudo journalctl -u ratio-fixer -n 50

# Common issues:
# - Missing flask-cors: pip install flask-cors
# - Missing .env variables: check /opt/ratio-fixer/.env
# - Port 5000 in use: lsof -i :5000
```

### API Bridge Returns 502

```bash
# Check Flask is running
curl http://localhost:5000/healthz

# Check API container logs
docker compose logs api --tail 50

# Verify API keys match
# Flask .env: RATIO_FIXER_API_KEY
# API production.env: RATIO_FIXER_API_KEY
```

### Database Migration Fails

```bash
# Check if columns already exist
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'youtube_campaigns' 
AND column_name LIKE 'ratio_fixer%';
"

# If columns exist, migration may have already run
# Check migration history
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT version, name FROM supabase_migrations.schema_migrations 
WHERE name LIKE '%ratio_fixer%';
"
```

### Frontend Shows "Ratio Fixer Unavailable"

1. **Check API bridge health:**
   ```bash
   curl http://localhost:3001/api/ratio-fixer/health
   ```

2. **Check Flask health:**
   ```bash
   curl http://localhost:5000/healthz
   ```

3. **Verify network connectivity:**
   ```bash
   # From API container
   docker exec -it arti-api curl http://localhost:5000/healthz
   ```

---

## Verification Checklist

### Flask App
- [ ] API endpoints added to `main.py`
- [ ] `flask-cors` installed
- [ ] `RATIO_FIXER_API_KEY` in `.env`
- [ ] `GOOGLE_APPLICATION_CREDENTIALS` in `.env`
- [ ] Systemd service created and enabled
- [ ] Service starts on boot
- [ ] Health endpoint returns `{"status":"healthy"}`

### YouTube Manager Backend
- [ ] `RATIO_FIXER_URL` in `production.env`
- [ ] `RATIO_FIXER_API_KEY` in `production.env`
- [ ] `JINGLE_SMM_API_KEY` in `production.env`
- [ ] API container rebuilt
- [ ] API container restarted
- [ ] API bridge health returns `{"available":true}`

### Database
- [ ] Migration `050_add_ratio_fixer_tracking.sql` executed
- [ ] Columns added to `youtube_campaigns`
- [ ] Table `youtube_ratio_fixer_orders` created
- [ ] Indexes created

### Integration Testing
- [ ] Flask health endpoint works
- [ ] API bridge health endpoint works
- [ ] Campaign creation from UI works
- [ ] Status polling works
- [ ] Orders are placed
- [ ] Database tracking works

---

## Post-Deployment

### Monitor Logs

```bash
# Flask app logs
sudo journalctl -u ratio-fixer -f

# API container logs
docker compose logs api -f

# Database queries
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT COUNT(*) as active_campaigns 
FROM youtube_campaigns 
WHERE ratio_fixer_status = 'running';
"
```

### Update Documentation

After successful deployment, update:
- `RATIO-FIXER-STATUS-REVIEW.md` - Mark items as complete
- `RATIO-FIXER-INTEGRATION-COMPLETE.md` - Add deployment date

---

## Support

If you encounter issues:
1. Check logs (Flask, API, Database)
2. Verify API keys match
3. Test endpoints individually
4. Check network connectivity
5. Review this guide's troubleshooting section

---

**Status:** Ready to Execute  
**Estimated Time:** 1.5 hours  
**Risk Level:** 🟢 Low - All code complete, just needs configuration

