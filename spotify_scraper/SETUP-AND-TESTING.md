# Spotify Scraper Setup & Testing Guide

**Last Updated**: 2025-11-17  
**Status**: Ready for Testing

---

## 🚨 IMPORTANT: Website Changes

**Spotify for Artists website has been updated** since this scraper was last used. Before deploying to production, you MUST test all selectors and update any broken ones.

---

## 📋 Prerequisites

- Python 3.9+
- Spotify for Artists account with access to campaign data
- Node.js 18+ (for production API)

---

## ⚙️ Initial Setup

### 1. Install Dependencies

```bash
cd spotify_scraper

# Install Python dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium
```

### 2. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env file
# For Option B (Local + Sync):
PRODUCTION_API_URL=https://api.artistinfluence.com
# PRODUCTION_API_KEY=  # Optional, leave blank for now

# For Option A (Autonomous Droplet):
# SUPABASE_URL=http://kong:8000
# SUPABASE_SERVICE_ROLE_KEY=...
```

### 3. Create Data Directories

```bash
mkdir -p data/{browser_data,downloads,artifacts}
```

---

## 🧪 Testing Phase 1: Verify Current Scraper

### Step 1: Test Local Scraping (With GUI)

```bash
# This will open a browser window
python run_scraper.py
```

**What to check:**
- ✅ Browser opens successfully
- ✅ You can manually log in to Spotify for Artists
- ✅ Script waits for login
- ✅ After login, script navigates to playlist data
- ❌ Check console for errors like "Failed to find...", "Could not extract..."

**Expected issues (due to S4A website updates):**
- Tab selectors might have changed
- Table structure might be different
- Time range dropdown might use different selectors

### Step 2: Identify Broken Selectors

If scraping fails, check the artifacts:

```bash
# View screenshots of errors
ls data/artifacts/

# Look for files like: error_20251117_143022.png
```

**Common selector issues:**

| Selector Type | Old Selector | Might Need Update |
|--------------|-------------|-------------------|
| Playlists Tab | `text="Playlists"` | Check if tab name changed |
| Table Rows | `table tr` | Check if table uses different structure |
| Time Range Dropdown | `button:has-text("Last 28 days")` | Check dropdown labels |
| Stream Count | `[data-testid="streams-count"]` | Check if testid changed |

### Step 3: Update Selectors (If Needed)

Edit `spotify_scraper/runner/app/pages/spotify_artists.py`:

```python
# Example: If playlist tab selector changed
# OLD:
playlist_tab_selectors = [
    'text="Playlists"',
    '[role="tab"]:has-text("Playlists")'
]

# NEW (if tab now says "Playlist Data"):
playlist_tab_selectors = [
    'text="Playlist Data"',
    'text="Playlists"',  # Keep old as fallback
    '[role="tab"]:has-text("Playlist")'
]
```

**Test again after each selector update.**

---

## 🧪 Testing Phase 2: Production API Endpoints

### Step 1: Start Local API Server

```bash
cd apps/api

# Install dependencies (if not done)
npm install

# Start in dev mode
npm run dev

# API should be running on http://localhost:3001
```

### Step 2: Test Song Lookup Endpoint

```bash
# Test with a real song ID from your campaigns
curl http://localhost:3001/api/campaigns/lookup-by-song/5cBGiXFf9S9RlAwQUv0g4g

# Expected response:
# {
#   "campaign_id": 123,
#   "campaign_name": "Artist - Song Name",
#   "url": "https://open.spotify.com/track/..."
# }
```

**If you get 404:**
- Check that campaign exists in database
- Check that `url` or `sfa` column contains the song ID
- Update the `or()` query in `apps/api/src/routes/s4a-ingest.ts` if needed

### Step 3: Test Song Mapping Endpoint

```bash
curl http://localhost:3001/api/campaigns/song-mapping | jq

# Expected: JSON object like:
# {
#   "5cBGiXFf9S9RlAwQUv0g4g": 123,
#   "43VXG87ajppI8mO1Mxo8vu": 456,
#   ...
# }
```

### Step 4: Test Data Ingestion Endpoint

```bash
# Create test payload
cat > test_payload.json << 'EOF'
{
  "campaign_id": 123,
  "scraped_data": {
    "url": "https://artists.spotify.com/c/artist/XXX/song/YYY/playlists",
    "scraped_at": "2025-11-17T12:00:00Z",
    "time_ranges": {
      "28day": {
        "stats": {
          "title": "Test Song",
          "streams": 1000,
          "listeners": 500,
          "playlists": [
            {
              "rank": "1",
              "name": "Test Playlist",
              "made_by": "Spotify",
              "streams": "500",
              "date_added": "Nov 1, 2025"
            }
          ]
        }
      }
    }
  }
}
EOF

# Send test data
curl -X POST http://localhost:3001/api/ingest/s4a \
  -H "Content-Type: application/json" \
  -d @test_payload.json

# Expected response:
# {
#   "success": true,
#   "campaign_id": 123,
#   "stats": {
#     "playlists_updated": 0,
#     "playlists_created": 1
#   }
# }
```

**Verify in database:**

```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT campaign_id, playlist_name, streams_28d, last_scraped 
FROM campaign_playlists 
WHERE campaign_id = 123 
ORDER BY last_scraped DESC 
LIMIT 5;
"
```

---

## 🧪 Testing Phase 3: End-to-End Local Sync

### Step 1: Scrape Real Data

```bash
cd spotify_scraper

# Scrape a single song (GUI will open for login)
python run_scraper.py

# Or scrape multiple songs
python run_s4a_list.py
```

**Check output:**
- Data files saved to `data/song_*_*.json`
- No errors in console
- Playlist data looks correct

### Step 2: Update Sync Script Configuration

Edit `sync_to_production.py` to point to local API:

```bash
# In .env file:
PRODUCTION_API_URL=http://localhost:3001
```

### Step 3: Run Sync Script

```bash
python sync_to_production.py --today

# You should see:
# - Campaign mapping loaded
# - Each file synced
# - Success/fail summary
```

### Step 4: Verify Data in Database

```bash
# Check updated campaigns
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT campaign, plays_last_7d, updated_at 
FROM spotify_campaigns 
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC 
LIMIT 5;
"

# Check playlist data
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT playlist_name, streams_28d, last_scraped
FROM campaign_playlists 
WHERE last_scraped > NOW() - INTERVAL '1 hour'
ORDER BY last_scraped DESC 
LIMIT 10;
"
```

---

## 🚀 Deployment: Option B (Local + Sync)

### Step 1: Deploy API Endpoints to Production

```bash
# On your local machine
ssh root@164.90.156.78

cd ~/arti-marketing-ops

# Pull latest code
git add apps/api/src/routes/s4a-ingest.ts
git add apps/api/src/routes/index.ts
git commit -m "Add S4A data ingestion endpoints"
git push origin main

# On droplet
git pull origin main

# Rebuild API container
docker compose -p arti-marketing-ops -f docker-compose.supabase-project.yml build api

# Restart API
docker restart supabase_api_arti-marketing-ops

# Verify API is running
curl http://localhost:3002/health
```

### Step 2: Test Production Endpoints

```bash
# Test from local machine
curl https://api.artistinfluence.com/api/campaigns/song-mapping | jq | head -20

# Should return campaign mappings
```

### Step 3: Configure Local Scraper

```bash
# On your local machine
cd spotify_scraper

# Update .env
PRODUCTION_API_URL=https://api.artistinfluence.com
```

### Step 4: Set Up Scheduled Task (Windows)

```powershell
# Open Task Scheduler as Administrator
# Create Basic Task:
# - Name: "Spotify S4A Scraper"
# - Trigger: Daily at 3:00 AM
# - Action: Start a program
#   - Program: C:\Windows\System32\cmd.exe
#   - Arguments: /c cd C:\Users\corbi\OneDrive\Documents\GitHub\ARTi-project\spotify_scraper && bash run_s4a_with_sync.sh
```

### Step 5: Test Scheduled Task

```powershell
# Run task manually in Task Scheduler
# Check output in: C:\Users\corbi\OneDrive\Documents\GitHub\ARTi-project\spotify_scraper\
```

---

## 🚀 Deployment: Option A (Autonomous Droplet)

⚠️ **Only proceed after Option B works perfectly!**

### Step 1: Initial Auth Setup

```bash
# SSH with X11 forwarding
ssh -X root@164.90.156.78

cd ~/arti-marketing-ops/spotify_scraper

# Run one-time auth setup
python setup_auth.py

# Complete login in browser window
# Session will be saved to ./data/browser_data
```

### Step 2: Build Docker Image

```bash
# Create Dockerfile (already provided in DEPLOYMENT-OPTIONS.md)
cd ~/arti-marketing-ops/spotify_scraper

docker build -f Dockerfile.api -t s4a-scraper:latest .
```

### Step 3: Create Docker Compose Service

```bash
# Add to docker-compose.supabase-project.yml
# (Configuration in DEPLOYMENT-OPTIONS.md)

docker compose -p arti-marketing-ops up -d s4a-scraper-api
```

### Step 4: Test Headless Scraping

```bash
docker exec -it s4a_scraper_api python -c "
import asyncio
from runner.app.scraper import SpotifyArtistsScraper

async def test():
    async with SpotifyArtistsScraper(headless=True) as scraper:
        logged_in = await scraper.verify_login()
        print(f'Logged in: {logged_in}')

asyncio.run(test())
"
```

### Step 5: Test Manual Scrape API

```bash
curl -X POST http://localhost:3003/scrape/manual
```

### Step 6: Monitor Scheduled Runs

```bash
# View logs
docker logs -f s4a_scraper_api

# Check next run time
curl http://localhost:3003/health
```

---

## 📊 Monitoring & Maintenance

### Daily Checks

```bash
# Check if scraper ran today
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  COUNT(*) as campaigns_updated,
  MAX(updated_at) as last_update
FROM spotify_campaigns 
WHERE updated_at::date = CURRENT_DATE;
"

# Check for new playlist data
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  COUNT(*) as playlists_updated,
  MAX(last_scraped) as last_scrape
FROM campaign_playlists 
WHERE last_scraped::date = CURRENT_DATE;
"
```

### Weekly Maintenance

1. **Check for auth expiry**: If scraper fails with "Not logged in", re-run auth setup
2. **Review error logs**: Look for patterns in failed scrapes
3. **Update selectors**: If Spotify changes UI, update selectors
4. **Clear old artifacts**: Delete old screenshots/debug files

### Troubleshooting

**Scraper fails with "Not logged in":**
```bash
# Re-run auth setup
python setup_auth.py  # Local (Option B)
# OR
ssh -X root@164.90.156.78 "cd ~/arti-marketing-ops/spotify_scraper && python setup_auth.py"  # Droplet (Option A)
```

**Sync fails with "No campaign found":**
```bash
# Check song ID mapping
curl https://api.artistinfluence.com/api/campaigns/lookup-by-song/YOUR_SONG_ID

# If 404, update campaign URL or SFA field in database
```

**Selectors broken:**
```bash
# Update selectors in spotify_artists.py
# Test locally first
python run_scraper.py

# Deploy to production after verification
```

---

## ✅ Success Checklist

Before considering deployment complete:

- [ ] Local scraper works with current S4A website
- [ ] All selectors updated and tested
- [ ] API endpoints deployed to production
- [ ] Song ID lookup working
- [ ] Data ingestion working (test with sample data)
- [ ] End-to-end sync tested (scrape → sync → verify in DB)
- [ ] Scheduled task configured (Option B) OR Docker service running (Option A)
- [ ] Monitoring queries saved for daily checks
- [ ] Auth session persists between runs
- [ ] Error handling working (check artifacts on failure)

---

## 📞 Support

If you encounter issues:

1. Check error artifacts: `data/artifacts/error_*.png`
2. Review logs: `docker logs s4a_scraper_api` or console output
3. Verify database state with SQL queries above
4. Test API endpoints individually
5. Re-run auth setup if session expired

---

**Next steps after testing:** Choose Option B or A and follow deployment instructions above.

