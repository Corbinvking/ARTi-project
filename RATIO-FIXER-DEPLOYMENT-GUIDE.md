# Ratio Fixer Integration - Deployment Guide

**Last Updated:** November 18, 2025  
**Integration Type:** API Bridge  
**Status:** Ready for Deployment

---

## Overview

This guide covers deploying the Ratio Fixer Flask application and integrating it with the YouTube Manager app via API bridge.

---

## Architecture

```
┌────────────────────────────────┐
│   YouTube Manager (Next.js)    │
│   Frontend: Vercel              │
│   Backend: Droplet (port 3001) │
│                                 │
│   apps/api/src/routes/          │
│   ratio-fixer-bridge.ts         │
└────────────┬───────────────────┘
             │ HTTP API Calls
             ▼
┌────────────────────────────────┐
│   Ratio Fixer (Flask)          │
│   Port: 5000                    │
│   Database: SQLite              │
│                                 │
│   ratio_app copy/               │
│   main.py, campaign.py          │
└────────────┬───────────────────┘
             │
             ├─▶ YouTube Data API v3
             ├─▶ Google Sheets API
             └─▶ JingleSMM API
```

---

## Prerequisites

### 1. Flask Application Requirements

```bash
# Python 3.8+
python3 --version

# Install dependencies
cd ratio_app\ copy
pip install -r requirements.txt
```

**Required Environment Variables:**
- `YOUTUBE_API_KEY` - YouTube Data API v3 key
- `JINGLE_SMM_KEY` - JingleSMM API key
- `GCP_SA_KEY_BASE64` - Google Cloud service account (base64 encoded)

### 2. YouTube Manager Requirements

**Backend (`apps/api/production.env`):**
- `RATIO_FIXER_URL` - Flask app URL (e.g., `http://localhost:5000`)
- `RATIO_FIXER_API_KEY` - Shared secret for auth (optional)
- `JINGLE_SMM_API_KEY` - For reference/documentation

**Database:**
- Run migration `050_add_ratio_fixer_tracking.sql`

---

## Deployment Options

### Option 1: Same Droplet (Recommended)

Deploy Flask app on the same droplet as the YouTube Manager backend.

**Pros:**
- No cross-server network latency
- Easier to manage (single server)
- Internal communication (faster/secure)

**Cons:**
- Shares resources with main app
- Python + Node.js on same server

---

### Option 2: Separate Server (GCP)

Deploy Flask app to Google Cloud Platform as originally designed.

**Pros:**
- Isolated resources
- Can scale independently
- Uses original deployment config

**Cons:**
- Cross-server latency
- More complex networking
- Additional cost

---

## Deployment Steps

### Step 1: Prepare Flask Application

#### 1.1 Add API Endpoints

The Flask app needs REST API endpoints for the bridge to work. Add these routes to `main.py`:

```python
# Add after existing routes

@app.route("/api/create_campaign", methods=["POST"])
def api_create_campaign():
    """
    API endpoint for creating campaigns via bridge
    Expects JSON body with campaign data
    """
    try:
        data = request.json
        
        # Validate API key if configured
        api_key = request.headers.get('X-API-Key')
        if os.getenv('RATIO_FIXER_API_KEY') and api_key != os.getenv('RATIO_FIXER_API_KEY'):
            return jsonify({"error": "Unauthorized"}), 401
        
        video_id = data['video_id']
        genre = data['genre']
        comments_sheet = data['comments_sheet']
        wait_time = data.get('wait_time', 36)
        minimum_engagement = data.get('minimum_engagement', 500)
        comment_server = data.get('comment_server', 439)
        like_server = data.get('like_server', 2324)
        sheet_tier = data.get('sheet_tier', '1847390823')
        
        # Create campaign
        rc = YoutubeRatioCalc(API_KEY, video_id)
        likes, comments, views = rc.get_views_likes_cmnts()
        title = rc.get_video_title()
        
        campaign_data = CampaignModel(
            campaign_id=str(uuid.uuid4()),
            video_title=title,
            video_link=data['youtube_url'],
            video_id=video_id,
            genre=genre,
            comments_sheet_url=comments_sheet,
            wait_time=wait_time,
            status="Running",
            likes=likes,
            comments=comments,
            views=views,
            like_server_id=like_server,
            comment_server_id=comment_server,
            ordered_likes=None,
            ordered_comments=None,
            sheet_tier=sheet_tier,
            minimum_engagement=minimum_engagement,
        )
        
        db.session.add(campaign_data)
        save_db_changes()
        
        campaign = Campaign(
            campaign_data.to_dict(),
            rc,
            comments_sheet,
            wait_time,
            minimum_engagement
        )
        
        campaign_thread = threading.Thread(target=campaign.run, args=(views,))
        campaign_thread.start()
        campaign_threads[campaign_data.campaign_id] = (campaign, campaign_thread)
        
        return jsonify({
            "success": True,
            "campaign_id": campaign_data.campaign_id,
            "message": "Campaign started successfully"
        }), 200
        
    except Exception as e:
        logger.error(f"API create campaign error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/campaign_status/<campaign_id>", methods=["GET"])
def api_campaign_status(campaign_id):
    """
    API endpoint for getting campaign status
    """
    try:
        # Validate API key if configured
        api_key = request.headers.get('X-API-Key')
        if os.getenv('RATIO_FIXER_API_KEY') and api_key != os.getenv('RATIO_FIXER_API_KEY'):
            return jsonify({"error": "Unauthorized"}), 401
        
        campaign, _ = campaign_threads.get(campaign_id, (None, None))
        
        if campaign:
            data = {
                "views": campaign.ratio_calculator.views,
                "likes": campaign.ratio_calculator.likes,
                "comments": campaign.ratio_calculator.comments,
                "status": campaign.data["Status"],
                "desired_comments": (
                    math.floor(campaign.desired_comments)
                    if campaign.desired_comments
                    else 0
                ),
                "desired_likes": (
                    math.floor(campaign.desired_likes) if campaign.desired_likes else 0
                ),
                "ordered_likes": campaign.ordered_likes or 0,
                "ordered_comments": campaign.ordered_comments or 0,
            }
            return jsonify(data), 200
        else:
            return jsonify({"error": "Campaign not found"}), 404
            
    except Exception as e:
        logger.error(f"API status error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/stop_campaign/<campaign_id>", methods=["POST"])
def api_stop_campaign(campaign_id):
    """
    API endpoint for stopping a campaign
    """
    try:
        # Validate API key if configured
        api_key = request.headers.get('X-API-Key')
        if os.getenv('RATIO_FIXER_API_KEY') and api_key != os.getenv('RATIO_FIXER_API_KEY'):
            return jsonify({"error": "Unauthorized"}), 401
        
        success = stop_campaign(campaign_id, campaign_threads, CampaignModel)
        
        if success:
            return jsonify({
                "success": True,
                "message": "Campaign stopped successfully"
            }), 200
        else:
            return jsonify({"error": "Failed to stop campaign"}), 500
            
    except Exception as e:
        logger.error(f"API stop campaign error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/healthz", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy"}), 200
```

#### 1.2 Add CORS Support

```bash
pip install flask-cors
```

Update `main.py`:

```python
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})  # Configure for production
```

#### 1.3 Environment Variables

Create `.env` file:

```bash
YOUTUBE_API_KEY=AIzaSyCo4D0knKCLCUiUxEl5e4oTwXCAJbEwccg
JINGLE_SMM_KEY=your-jingle-smm-api-key
RATIO_FIXER_API_KEY=your-shared-secret-key  # Optional but recommended
GCP_SA_KEY_BASE64=your-base64-encoded-service-account
```

---

### Step 2: Deploy Flask App

#### Option A: Deploy to Same Droplet

```bash
# SSH to droplet
ssh root@165.227.91.129

# Navigate to deployment directory
cd /opt/ratio-fixer

# Clone repo (or copy files)
git clone https://github.com/yourusername/ratio-fixer.git .

# Install Python and dependencies
apt install python3 python3-pip python3-venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Set up environment
cp .env.template .env
nano .env  # Edit with actual keys

# Test run
python main.py

# Should see: Running on http://127.0.0.1:5000
```

#### Create Systemd Service

```bash
sudo nano /etc/systemd/system/ratio-fixer.service
```

```ini
[Unit]
Description=Ratio Fixer Flask App
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/ratio-fixer
Environment="PATH=/opt/ratio-fixer/venv/bin"
ExecStart=/opt/ratio-fixer/venv/bin/python main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable ratio-fixer
sudo systemctl start ratio-fixer

# Check status
sudo systemctl status ratio-fixer

# View logs
sudo journalctl -u ratio-fixer -f
```

---

### Step 3: Run Database Migration

```bash
# On droplet
cd ~/arti-marketing-ops

# Pull latest changes
git pull

# Run migration
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/050_add_ratio_fixer_tracking.sql

# Verify columns added
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'youtube_campaigns' 
AND column_name LIKE 'ratio_fixer%' OR column_name LIKE '%ordered_%' OR column_name LIKE 'desired_%';
"
```

---

### Step 4: Update YouTube Manager Backend

```bash
# On droplet
cd ~/arti-marketing-ops

# Add environment variables
nano apps/api/production.env
```

Add:

```bash
# Ratio Fixer Integration
RATIO_FIXER_URL=http://localhost:5000
RATIO_FIXER_API_KEY=your-shared-secret-key
JINGLE_SMM_API_KEY=your-jingle-smm-api-key
```

```bash
# Rebuild API container
docker compose build api

# Restart
docker compose up -d api

# Check logs
docker compose logs api --tail 100 -f
```

---

### Step 5: Update Frontend (Vercel)

```bash
# On your local machine
cd C:\Users\corbi\OneDrive\Documents\GitHub\ARTi-project

# Commit all changes
git add .
git commit -m "Add Ratio Fixer integration via API bridge"
git push origin main

# Vercel will auto-deploy
```

**Add Environment Variable to Vercel:**
1. Go to Vercel dashboard
2. Select project
3. Settings → Environment Variables
4. Add: `NEXT_PUBLIC_API_URL` = `https://api.artistinfluence.com`

---

## Testing

### 1. Test Flask App Health

```bash
curl http://localhost:5000/healthz

# Expected: {"status":"healthy"}
```

### 2. Test API Bridge

```bash
curl http://localhost:3001/api/ratio-fixer/health

# Expected: {"status":"healthy","available":true}
```

### 3. Test Campaign Creation

```bash
curl -X POST http://localhost:3001/api/ratio-fixer/start \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "test-123",
    "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "videoId": "dQw4w9WgXcQ",
    "genre": "Pop",
    "commentsSheetUrl": "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID",
    "waitTime": 36,
    "minimumEngagement": 500,
    "commentServerId": 439,
    "likeServerId": 2324
  }'

# Expected: {"success":true,"ratioFixerCampaignId":"..."}
```

### 4. Test from Frontend

1. Go to https://app.artistinfluence.com/youtube/campaigns
2. Click a campaign
3. Navigate to "Ratio Fixer" tab
4. Click "Start Automated Ratio Fixer"
5. Should see "Ratio Fixer Active" with live stats

---

## Monitoring

### Flask App Logs

```bash
# Systemd logs
sudo journalctl -u ratio-fixer -f

# Application logs
tail -f /opt/ratio-fixer/logs.log
```

### API Bridge Logs

```bash
docker compose logs api --tail 100 -f | grep ratio-fixer
```

### Database Status

```bash
# Check campaigns with ratio fixer active
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  campaign_name,
  ratio_fixer_status,
  ratio_fixer_started_at,
  ordered_likes,
  ordered_comments
FROM youtube_campaigns
WHERE ratio_fixer_status = 'running';
"
```

---

## Troubleshooting

### Issue: "Ratio Fixer service is currently unavailable"

**Cause:** Flask app not running or network issue

**Solutions:**
```bash
# Check if Flask is running
sudo systemctl status ratio-fixer

# Check if port 5000 is listening
netstat -tuln | grep 5000

# Restart Flask
sudo systemctl restart ratio-fixer

# Check firewall
sudo ufw status
# If needed: sudo ufw allow 5000
```

---

### Issue: "Failed to start ratio fixer"

**Cause:** Missing environment variables or invalid data

**Solutions:**
```bash
# Check Flask logs
sudo journalctl -u ratio-fixer -n 50

# Verify environment variables
cd /opt/ratio-fixer
cat .env

# Test YouTube API key
python3 -c "
from dotenv import load_dotenv
import os
from googleapiclient.discovery import build
load_dotenv()
youtube = build('youtube', 'v3', developerKey=os.getenv('YOUTUBE_API_KEY'))
print('YouTube API key is valid')
"
```

---

### Issue: Campaign starts but no orders being placed

**Cause:** JingleSMM API key invalid or insufficient balance

**Solutions:**
```bash
# Check JingleSMM balance
curl -X POST https://jinglesmm.com/api/v2 \
  -d "key=YOUR_KEY&action=balance"

# Check campaign status in Flask
curl http://localhost:5000/campaign_status/CAMPAIGN_ID
```

---

## Security Considerations

1. **API Key Authentication** - Use `RATIO_FIXER_API_KEY` in production
2. **CORS** - Restrict to specific origins in production
3. **Firewall** - Only allow internal connections to Flask (port 5000)
4. **HTTPS** - Use reverse proxy (Caddy/Nginx) for external access
5. **Rate Limiting** - Add rate limiting to prevent abuse

---

## Next Steps

1. ✅ Deploy Flask app
2. ✅ Run database migration
3. ✅ Update environment variables
4. ✅ Test integration end-to-end
5. ⏳ Monitor for 24 hours
6. ⏳ Create test campaign
7. ⏳ Verify orders are placed
8. ⏳ Document costs and results

---

## Related Documentation

- [RATIO-FIXER-DEEP-DIVE.md](./RATIO-FIXER-DEEP-DIVE.md) - Technical analysis
- [RATIO-FIXER-VS-YOUTUBE-MANAGER.md](./RATIO-FIXER-VS-YOUTUBE-MANAGER.md) - Comparison guide
- [YOUTUBE-APP-CURRENT-STATUS.md](./YOUTUBE-APP-CURRENT-STATUS.md) - Overall status

---

**Status:** 📋 Deployment Guide Complete  
**Integration Type:** API Bridge  
**Estimated Deployment Time:** 2-3 hours  
**Risk Level:** Low

