# Spotify Scraper - Quick Start Guide

**Get up and running in 15 minutes** ⚡

---

## 🎯 Goal

Automatically scrape Spotify for Artists data and sync it to your production database.

---

## ⚡ Quick Start (Option B - Recommended)

### Step 1: Install (2 minutes)

```bash
cd spotify_scraper

# Install Python dependencies
pip install -r requirements.txt

# Install Playwright browser
playwright install chromium

# Create data folders
mkdir -p data/{browser_data,downloads,artifacts}
```

### Step 2: Test Scraper (5 minutes)

```bash
# Run scraper (browser will open)
python run_scraper.py
```

**What happens:**
1. Browser opens → Log in to Spotify for Artists
2. Script navigates to a test song
3. Data extracted and saved to `data/` folder
4. Check console for errors

**If you see errors like "Failed to find...", "Could not extract...":**
→ Spotify's website changed → See "Fixing Selectors" section below

### Step 3: Deploy API Endpoints (3 minutes)

```bash
# On production droplet
ssh root@164.90.156.78
cd ~/arti-marketing-ops

# Add new files if not already committed
git status
# If you see new files, commit them:
# git add apps/api/src/routes/s4a-ingest.ts
# git add apps/api/src/routes/index.ts
# git commit -m "Add S4A scraper ingest API"
# git push

# Pull latest code
git pull origin main

# Rebuild API
docker compose -p arti-marketing-ops -f docker-compose.supabase-project.yml build api

# Restart
docker restart supabase_api_arti-marketing-ops

# Test
curl http://localhost:3002/api/campaigns/song-mapping | jq | head -20
```

### Step 4: Configure Sync (1 minute)

```bash
# On local machine
cd spotify_scraper

# Create .env file (if not exists)
echo "PRODUCTION_API_URL=https://api.artistinfluence.com" > .env
```

### Step 5: Test Full Flow (5 minutes)

```bash
# Scrape + Sync
bash run_s4a_with_sync.sh
```

**What happens:**
1. Scraper runs → Opens browser → You log in
2. Scrapes all active campaigns
3. Saves JSON files to `data/`
4. Syncs data to production API
5. Data appears in database

**Verify in database:**
```bash
ssh root@164.90.156.78
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT campaign, plays_last_7d, updated_at 
FROM spotify_campaigns 
WHERE updated_at > NOW() - INTERVAL '1 hour'
LIMIT 5;
"
```

---

## 🔄 Daily Automation (Optional)

### Windows Task Scheduler

```powershell
# Open Task Scheduler as Administrator
# Create Basic Task:
#   Name: Spotify S4A Scraper
#   Trigger: Daily at 3:00 AM
#   Action: Start a program
#     Program: C:\Windows\System32\cmd.exe
#     Arguments: /c cd C:\Users\corbi\OneDrive\Documents\GitHub\ARTi-project\spotify_scraper && bash run_s4a_with_sync.sh

# Test manually by right-clicking task → Run
```

---

## 🔧 Fixing Selectors (If Spotify UI Changed)

If scraper fails with "Failed to find..." errors:

### 1. Identify Broken Selector

Check console output:
```
❌ Failed to click Playlists tab with text="Playlists"
```

### 2. Inspect S4A Website

Open https://artists.spotify.com in Chrome:
- F12 → Elements tab
- Look for the Playlists tab
- Check if text changed (e.g., "Playlist Data" instead of "Playlists")

### 3. Update Selector

Edit `runner/app/pages/spotify_artists.py`:

```python
# Find the navigate_to_playlists_tab function
async def navigate_to_playlists_tab(self) -> None:
    playlist_tab_selectors = [
        'text="Playlists"',  # Old (might be broken)
        'text="Playlist Data"',  # NEW: Add updated text
        '[role="tab"]:has-text("Playlist")',  # Fallback
    ]
```

### 4. Test Again

```bash
python run_scraper.py
```

Repeat for each broken selector until scraping works end-to-end.

---

## 📊 Monitoring

### Check if scraper ran today

```bash
ssh root@164.90.156.78
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT COUNT(*) as updated_today
FROM spotify_campaigns 
WHERE updated_at::date = CURRENT_DATE;
"
```

### View latest playlist data

```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  playlist_name,
  streams_28d,
  last_scraped
FROM campaign_playlists 
WHERE last_scraped::date = CURRENT_DATE
ORDER BY streams_28d DESC
LIMIT 10;
"
```

---

## 🆘 Common Issues

### "Not logged in"

**Solution:** Just run scraper again, it will open browser for login

```bash
python run_scraper.py
```

### "Campaign not found" during sync

**Cause:** Song ID not in database

**Solution:** Check campaign has `sfa` URL populated:
```bash
# Check missing SFA URLs
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT id, campaign, sfa 
FROM spotify_campaigns 
WHERE sfa IS NULL AND status = 'Active'
LIMIT 10;
"
```

### Sync script fails

**Test API endpoints:**
```bash
# Test connectivity
curl https://api.artistinfluence.com/health

# Test mapping endpoint
curl https://api.artistinfluence.com/api/campaigns/song-mapping | jq | head -10
```

If 404 or 500 → API not deployed correctly → Redo Step 3

---

## 📚 Need More Details?

- **Full deployment options**: See `DEPLOYMENT-OPTIONS.md`
- **Step-by-step testing**: See `SETUP-AND-TESTING.md`
- **Architecture overview**: See `IMPLEMENTATION-SUMMARY.md`

---

## ✅ Success Criteria

You're done when:
- [ ] `python run_scraper.py` completes without errors
- [ ] Data files appear in `data/` folder
- [ ] `bash run_s4a_with_sync.sh` syncs to production
- [ ] Database queries show updated data
- [ ] Scheduled task runs automatically (if configured)

---

**Total time:** 15-30 minutes (if selectors work)  
**Total time:** 1-2 hours (if selectors need updates)

🎉 **You're ready!**

