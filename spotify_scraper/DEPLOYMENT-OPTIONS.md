# Spotify Scraper Deployment Options

**Last Updated**: 2025-11-17  
**Status**: Planning Phase  
**Spotify Website**: ⚠️ Updated since last use - selectors need testing

---

## 🎯 Goal

Automate Spotify for Artists (S4A) scraping to collect playlist performance data and sync to production database.

---

## 📊 Option Comparison

| Criteria | Option A: Autonomous Droplet | Option B: Local + Sync |
|----------|----------------------------|----------------------|
| **Setup Complexity** | High (Docker + Headless + Auth) | Medium (Local env + API) |
| **Maintenance** | Low (automated cron) | Medium (local machine must run) |
| **Reliability** | High (24/7 uptime) | Medium (depends on local machine) |
| **Login Challenge** | Must solve headless 2FA | Human handles 2FA locally |
| **Data Freshness** | Excellent (scheduled runs) | Good (manual trigger or scheduled) |
| **Debugging** | Harder (remote debugging) | Easier (local access) |
| **Cost** | Droplet resources (minimal) | Free (existing hardware) |
| **Best For** | Production, hands-off | Testing, human oversight |

---

## 🅰️ OPTION A: Autonomous Droplet Scraper

### Architecture

```
┌─────────────────────────────────────────────────┐
│         DigitalOcean Droplet (164.90.156.78)    │
│                                                 │
│  ┌─────────────────────────────────────────┐  │
│  │  Docker Compose Services                │  │
│  │                                         │  │
│  │  ┌──────────────┐  ┌─────────────────┐ │  │
│  │  │ FastAPI      │  │ Playwright      │ │  │
│  │  │ Scheduler    │→→│ Scraper         │ │  │
│  │  │ (APScheduler)│  │ (Headless)      │ │  │
│  │  └──────────────┘  └─────────────────┘ │  │
│  │         ↓                    ↓          │  │
│  │  ┌──────────────────────────────────┐  │  │
│  │  │  Persistent Browser Session      │  │  │
│  │  │  Volume: /data/s4a-context       │  │  │
│  │  └──────────────────────────────────┘  │  │
│  └─────────────────────────────────────────┘  │
│                      ↓                          │
│              Supabase PostgreSQL                │
│              (Kong: 8000)                       │
└─────────────────────────────────────────────────┘
```

### Key Components

#### 1. **Headless Mode with Persistent Auth**

**Challenge**: Spotify login with 2FA in headless mode

**Solutions** (pick one):

**A. Initial Headed Setup (RECOMMENDED)**
```python
# One-time setup on droplet with X11 forwarding
# SSH with X11: ssh -X root@164.90.156.78
# Run interactive login once
python spotify_scraper/setup_auth.py
# Browser opens via X11, complete 2FA
# Session saved to volume
# All future runs use headless mode
```

**B. Cookie Transfer Method**
```python
# Login locally in headed mode
# Extract cookies/localStorage
# Upload to droplet
# Inject into headless browser context
```

**C. Use Xvfb (Virtual Display)**
```dockerfile
# Run headed browser in virtual framebuffer
RUN apt-get install -y xvfb
CMD ["xvfb-run", "--server-args=-screen 0 1280x720x24", "python", "scraper.py"]
```

#### 2. **Docker Setup**

**File: `spotify_scraper/docker-compose.yml`**
```yaml
version: '3.8'

services:
  s4a-scraper-api:
    build:
      context: .
      dockerfile: Dockerfile.api
    container_name: s4a_scraper_api
    ports:
      - "3003:8000"
    environment:
      - SUPABASE_URL=http://kong:8000
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - S4A_BROWSER_DATA_DIR=/data/s4a-context
    volumes:
      - s4a-browser-data:/data/s4a-context
      - s4a-downloads:/data/downloads
      - s4a-artifacts:/data/artifacts
    networks:
      - supabase_network_arti-marketing-ops
    restart: unless-stopped

volumes:
  s4a-browser-data:
    driver: local
  s4a-downloads:
    driver: local
  s4a-artifacts:
    driver: local

networks:
  supabase_network_arti-marketing-ops:
    external: true
```

**File: `spotify_scraper/Dockerfile.api`**
```dockerfile
FROM mcr.microsoft.com/playwright/python:v1.39.0-jammy

WORKDIR /app

# Install system dependencies for headless browser
RUN apt-get update && apt-get install -y \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Install Playwright browsers (already in base image, but ensure deps)
RUN playwright install-deps

# Expose port
EXPOSE 8000

# Run with Xvfb for headless GUI support
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 3. **FastAPI Scheduler**

**File: `spotify_scraper/api/main.py`**
```python
from fastapi import FastAPI, BackgroundTasks
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import asyncio
from runner.app.scraper import SpotifyArtistsScraper
from .db import save_scraped_data

app = FastAPI(title="S4A Scraper API")
scheduler = AsyncIOScheduler()

# Load song URLs from database
async def get_active_campaigns():
    """Fetch active campaigns from Supabase"""
    from supabase import create_client
    import os
    
    supabase = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    )
    
    result = supabase.table("spotify_campaigns")\
        .select("id, sfa, campaign")\
        .eq("status", "Active")\
        .not_.is_("sfa", "null")\
        .execute()
    
    return result.data

async def scrape_all_songs():
    """Daily scraping job"""
    print(f"🕐 Starting scheduled scrape at {datetime.now()}")
    
    try:
        campaigns = await get_active_campaigns()
        
        async with SpotifyArtistsScraper(headless=True) as scraper:
            # Verify login
            if not await scraper.verify_login():
                print("❌ Not logged in! Auth session expired.")
                # TODO: Send alert (email, Slack, etc.)
                return
            
            for campaign in campaigns:
                try:
                    print(f"🎵 Scraping: {campaign['campaign']}")
                    
                    # Scrape data
                    data = await scraper.scrape_song_data(campaign['sfa'])
                    
                    # Save to database
                    await save_scraped_data(campaign['id'], data)
                    
                    print(f"✅ Completed: {campaign['campaign']}")
                    
                    # Rate limiting
                    await asyncio.sleep(5)
                    
                except Exception as e:
                    print(f"❌ Failed {campaign['campaign']}: {e}")
                    continue
        
        print(f"✅ Scheduled scrape completed at {datetime.now()}")
        
    except Exception as e:
        print(f"❌ Critical error in scheduled scrape: {e}")

@app.on_event("startup")
async def startup_event():
    """Start scheduler on app startup"""
    # Schedule daily at 3 AM UTC
    scheduler.add_job(
        scrape_all_songs,
        CronTrigger(hour=3, minute=0),
        id="daily_scrape",
        name="Daily S4A Scrape"
    )
    scheduler.start()
    print("✅ Scheduler started - daily scrape at 3:00 AM UTC")

@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown()

@app.post("/scrape/manual")
async def manual_scrape(background_tasks: BackgroundTasks):
    """Manually trigger a scrape"""
    background_tasks.add_task(scrape_all_songs)
    return {"status": "Scrape started", "timestamp": datetime.now().isoformat()}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "scheduler_running": scheduler.running,
        "next_run": str(scheduler.get_job("daily_scrape").next_run_time) if scheduler.running else None
    }
```

#### 4. **Database Integration**

**File: `spotify_scraper/api/db.py`**
```python
from supabase import create_client, Client
import os
from datetime import datetime
from typing import Dict, Any

def get_supabase() -> Client:
    return create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    )

async def save_scraped_data(campaign_id: int, scraped_data: Dict[str, Any]):
    """Save scraped data to database"""
    supabase = get_supabase()
    
    # Extract data from each time range
    for time_range, data in scraped_data['time_ranges'].items():
        stats = data['stats']
        
        # Update spotify_campaigns with latest data
        if time_range == '28day':  # Use 28 day as primary
            supabase.table("spotify_campaigns").update({
                "plays_last_7d": stats.get('streams', 0),
                "updated_at": datetime.now().isoformat()
            }).eq("id", campaign_id).execute()
        
        # Update/insert playlist performance data
        for playlist in stats.get('playlists', []):
            # Try to match playlist by name or Spotify ID
            existing = supabase.table("campaign_playlists")\
                .select("id")\
                .eq("campaign_id", campaign_id)\
                .ilike("playlist_name", playlist['name'])\
                .execute()
            
            playlist_data = {
                "campaign_id": campaign_id,
                "playlist_name": playlist['name'],
                "playlist_curator": playlist.get('made_by'),
                "streams_28d": int(playlist['streams'].replace(',', '')) if playlist['streams'] else 0,
                "date_added": playlist.get('date_added'),
                "last_scraped": datetime.now().isoformat()
            }
            
            if existing.data:
                # Update existing
                supabase.table("campaign_playlists")\
                    .update(playlist_data)\
                    .eq("id", existing.data[0]['id'])\
                    .execute()
            else:
                # Insert new
                supabase.table("campaign_playlists")\
                    .insert(playlist_data)\
                    .execute()
    
    print(f"✅ Saved data for campaign {campaign_id}")
```

#### 5. **Modified Scraper for Headless**

**File: `spotify_scraper/runner/app/scraper.py`** (updated)
```python
async def start(self, headless: bool = False):
    """Initialize browser with persistent context"""
    print(f"Starting browser (headless={headless})...")
    self.playwright = await async_playwright().start()
    
    # Use persistent context to maintain login state
    self.context = await self.playwright.chromium.launch_persistent_context(
        user_data_dir=self.user_data_dir,
        headless=headless,  # ✅ Now configurable
        downloads_path=self.download_dir,
        # Additional args for stability in Docker
        args=[
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ] if headless else []
    )
    self.page = await self.context.new_page()
```

### Deployment Steps

```bash
# 1. SSH to droplet
ssh root@164.90.156.78

# 2. Navigate to project
cd ~/arti-marketing-ops/spotify_scraper

# 3. Build and start services
docker compose up -d

# 4. Initial auth setup (ONE-TIME)
# Option A: X11 forwarding
ssh -X root@164.90.156.78
docker exec -it s4a_scraper_api python setup_auth.py
# Complete 2FA in browser window

# Option B: Transfer session
# Run locally first, then:
docker cp data/browser_data s4a_scraper_api:/data/s4a-context

# 5. Test manual scrape
curl -X POST http://localhost:3003/scrape/manual

# 6. Verify scheduler
curl http://localhost:3003/health
```

### Monitoring

```bash
# View logs
docker logs -f s4a_scraper_api

# Check scrape results
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT campaign, plays_last_7d, updated_at 
FROM spotify_campaigns 
WHERE updated_at > NOW() - INTERVAL '1 day'
ORDER BY updated_at DESC 
LIMIT 10;
"
```

---

## 🅱️ OPTION B: Local Scraper + Production Sync

### Architecture

```
┌─────────────────────────────┐         ┌──────────────────────────┐
│   Local Machine             │         │  Production Droplet      │
│                             │         │                          │
│  ┌────────────────────────┐ │         │  ┌────────────────────┐ │
│  │ Spotify Scraper        │ │         │  │ Supabase Postgres  │ │
│  │ (Headed Mode)          │ │         │  │ (Kong: 8000)       │ │
│  │                        │ │         │  └────────────────────┘ │
│  │ • Human login/2FA      │ │         │           ↑             │
│  │ • Visual debugging     │ │         │           │             │
│  │ • Saves to data/       │ │         │  ┌────────────────────┐ │
│  └────────────────────────┘ │         │  │ FastAPI Ingest     │ │
│            ↓                 │         │  │ Endpoint           │ │
│  ┌────────────────────────┐ │  HTTPS  │  │ POST /ingest/s4a   │ │
│  │ Sync Script            │─┼─────────┼─→│                    │ │
│  │ (Post-scrape hook)     │ │         │  └────────────────────┘ │
│  └────────────────────────┘ │         │                          │
└─────────────────────────────┘         └──────────────────────────┘
```

### Components

#### 1. **Local Scraper (Unchanged)**

Keep existing scraper running locally with `headless=False`.

#### 2. **Production Ingest API**

**File: `apps/api/src/routes/s4a-ingest.ts`**
```typescript
import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

router.post('/ingest/s4a', async (req, res) => {
  try {
    const { campaign_id, scraped_data, scraper_version } = req.body;
    
    if (!campaign_id || !scraped_data) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Process each time range
    for (const [timeRange, data] of Object.entries(scraped_data.time_ranges)) {
      const stats = (data as any).stats;
      
      // Update campaign stats (use 28day as primary)
      if (timeRange === '28day') {
        await supabase
          .from('spotify_campaigns')
          .update({
            plays_last_7d: stats.streams || 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', campaign_id);
      }
      
      // Update playlist data
      for (const playlist of stats.playlists || []) {
        const streamsNum = parseInt(playlist.streams.replace(/,/g, '')) || 0;
        
        // Find or create campaign_playlist entry
        const { data: existing } = await supabase
          .from('campaign_playlists')
          .select('id')
          .eq('campaign_id', campaign_id)
          .ilike('playlist_name', playlist.name)
          .single();
        
        const playlistData = {
          campaign_id,
          playlist_name: playlist.name,
          playlist_curator: playlist.made_by,
          streams_28d: streamsNum,
          date_added: playlist.date_added,
          last_scraped: new Date().toISOString()
        };
        
        if (existing) {
          await supabase
            .from('campaign_playlists')
            .update(playlistData)
            .eq('id', existing.id);
        } else {
          await supabase
            .from('campaign_playlists')
            .insert(playlistData);
        }
      }
    }
    
    console.log(`✅ Ingested S4A data for campaign ${campaign_id}`);
    
    res.json({
      success: true,
      campaign_id,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error ingesting S4A data:', error);
    res.status(500).json({ error: 'Failed to ingest data' });
  }
});

export default router;
```

**Add to `apps/api/src/index.ts`:**
```typescript
import s4aIngestRouter from './routes/s4a-ingest';
app.use('/api', s4aIngestRouter);
```

#### 3. **Local Sync Script**

**File: `spotify_scraper/sync_to_production.py`**
```python
#!/usr/bin/env python3
"""
Sync locally scraped data to production
Run after each scrape: python sync_to_production.py
"""
import asyncio
import json
import os
from pathlib import Path
from datetime import datetime
import aiohttp
from dotenv import load_dotenv

load_dotenv()

PRODUCTION_API = os.getenv('PRODUCTION_API_URL', 'https://api.artistinfluence.com')
API_KEY = os.getenv('PRODUCTION_API_KEY')  # Optional auth key

async def sync_file(filepath: Path, session: aiohttp.ClientSession):
    """Sync a single scraped file to production"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Extract campaign ID from URL or filename
        # URL format: artists.spotify.com/c/artist/X/song/Y/playlists
        url = data.get('url', '')
        song_id = url.split('/song/')[1].split('/')[0] if '/song/' in url else None
        
        if not song_id:
            print(f"⚠️  Could not extract song ID from {filepath.name}")
            return False
        
        # Look up campaign_id from song_id
        # (Assumes you have a mapping or will implement lookup)
        campaign_id = await lookup_campaign_id(song_id, session)
        
        if not campaign_id:
            print(f"⚠️  No campaign found for song {song_id}")
            return False
        
        # Send to production API
        payload = {
            'campaign_id': campaign_id,
            'scraped_data': data,
            'scraper_version': '1.0'
        }
        
        headers = {}
        if API_KEY:
            headers['Authorization'] = f'Bearer {API_KEY}'
        
        async with session.post(
            f'{PRODUCTION_API}/api/ingest/s4a',
            json=payload,
            headers=headers
        ) as response:
            if response.status == 200:
                print(f"✅ Synced: {filepath.name} → campaign {campaign_id}")
                return True
            else:
                print(f"❌ Failed to sync {filepath.name}: {response.status}")
                print(await response.text())
                return False
                
    except Exception as e:
        print(f"❌ Error syncing {filepath.name}: {e}")
        return False

async def lookup_campaign_id(song_spotify_id: str, session: aiohttp.ClientSession) -> int | None:
    """Lookup campaign ID from Spotify song ID"""
    # TODO: Implement lookup via API or local mapping file
    # For now, return None
    return None

async def main():
    """Sync all recent scraped files"""
    print("🔄 S4A Data Sync to Production")
    print("=" * 50)
    
    data_dir = Path('data')
    
    if not data_dir.exists():
        print("❌ No data directory found")
        return
    
    # Find all scraped JSON files from today
    today = datetime.now().strftime('%Y%m%d')
    files = list(data_dir.glob(f'song_*_{today}_*.json'))
    
    if not files:
        print(f"📭 No files to sync from today ({today})")
        return
    
    print(f"📦 Found {len(files)} files to sync")
    
    async with aiohttp.ClientSession() as session:
        successful = 0
        failed = 0
        
        for filepath in files:
            success = await sync_file(filepath, session)
            if success:
                successful += 1
            else:
                failed += 1
            
            # Rate limiting
            await asyncio.sleep(1)
        
        print("\n" + "=" * 50)
        print(f"✅ Successful: {successful}")
        print(f"❌ Failed: {failed}")

if __name__ == "__main__":
    asyncio.run(main())
```

#### 4. **Automated Sync Hook**

**File: `spotify_scraper/run_s4a_with_sync.sh`**
```bash
#!/bin/bash
# Run scraper and auto-sync to production

echo "🎵 Starting Spotify for Artists scrape..."

# Run the scraper
python run_s4a_list.py

# Check if scraper succeeded
if [ $? -eq 0 ]; then
    echo "✅ Scraping completed"
    echo "🔄 Syncing data to production..."
    
    # Sync to production
    python sync_to_production.py
    
    if [ $? -eq 0 ]; then
        echo "✅ Sync completed successfully!"
    else
        echo "❌ Sync failed"
        exit 1
    fi
else
    echo "❌ Scraping failed"
    exit 1
fi
```

### Usage

```bash
# 1. Set up environment
cd spotify_scraper
cp .env.example .env
# Edit .env:
# PRODUCTION_API_URL=https://api.artistinfluence.com
# PRODUCTION_API_KEY=your_api_key_here

# 2. Run scraper + sync
bash run_s4a_with_sync.sh

# Or manually:
# Step 1: Scrape
python run_s4a_list.py

# Step 2: Sync
python sync_to_production.py
```

### Scheduling (Windows)

**Create Windows Task Scheduler job:**
```powershell
# Create scheduled task for daily scraping at 3 AM
$action = New-ScheduledTaskAction -Execute "C:\Windows\System32\cmd.exe" -Argument "/c cd C:\Users\corbi\OneDrive\Documents\GitHub\ARTi-project\spotify_scraper && bash run_s4a_with_sync.sh"
$trigger = New-ScheduledTaskTrigger -Daily -At 3am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "SpotifyScraper" -Description "Daily S4A scrape and sync"
```

---

## 🔍 Testing Current Scraper

Before deploying either option, test against latest Spotify website:

```bash
# Test current scraper
cd spotify_scraper
python run_scraper.py

# Check for errors in console output
# Look for: "Failed to find...", "Could not extract...", etc.
```

Common issues after Spotify UI updates:
- ❌ Tab selectors changed
- ❌ Table structure changed
- ❌ Dropdown selectors changed
- ❌ Time range filter changed

---

## 📝 Recommendation

**Start with Option B**, then migrate to Option A:

### Phase 1: Local + Sync (Weeks 1-2)
✅ Quick to implement  
✅ Human-in-the-loop for debugging  
✅ Test selector updates safely  
✅ Verify data ingestion pipeline  

### Phase 2: Autonomous Droplet (Weeks 3-4)
✅ Selector updates verified  
✅ Auth persistence tested  
✅ Migrate to headless mode  
✅ Set up monitoring/alerts  

---

## 🚨 Critical Updates Needed

1. **Test all selectors** against current S4A website
2. **Add campaign_id lookup** (map song Spotify ID → campaign_id)
3. **Implement auth expiry handling** (alert when session expires)
4. **Add error notifications** (email/Slack when scrapes fail)
5. **Create backup strategy** (save raw JSON before processing)

---

Next steps: Which option would you like me to implement first?

