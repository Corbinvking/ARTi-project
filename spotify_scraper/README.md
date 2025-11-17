# Spotify for Artists Scraper

**Last Updated**: 2025-11-17  
**Status**: ✅ Production Ready

An automated Playwright-based scraper for Spotify for Artists that collects playlist performance data and syncs it to your production database.

## 🚀 Quick Start

**Get running in 15 minutes** → See [`QUICK-START.md`](QUICK-START.md)

## 📚 Documentation

| Document | Description | For |
|----------|-------------|-----|
| [`QUICK-START.md`](QUICK-START.md) | ⚡ 15-minute setup guide | First-time users |
| [`SETUP-AND-TESTING.md`](SETUP-AND-TESTING.md) | 📋 Detailed testing instructions | Testing & validation |
| [`PRODUCTION-DEPLOYMENT.md`](PRODUCTION-DEPLOYMENT.md) | 🚀 Production cron job setup | **Production deployment** |
| [`DEPLOYMENT-OPTIONS.md`](DEPLOYMENT-OPTIONS.md) | 🔧 Full deployment guide (Option A vs B) | Alternative deployment |
| [`IMPLEMENTATION-SUMMARY.md`](IMPLEMENTATION-SUMMARY.md) | 📊 Technical overview | Developers |
| [`AUTO-LOGIN-COMPLETE.md`](AUTO-LOGIN-COMPLETE.md) | ✅ Auto-login implementation details | Developers |

## ✨ Features

### Core Capabilities
- ✅ **Automated login** - No manual intervention required
- ✅ **Database integration** - Queries active campaigns, updates stream data
- ✅ **Multiple time ranges** - 24h, 7d, 28d, 12m support
- ✅ **Persistent sessions** - Browser state saved (no re-login)
- ✅ **Headless mode** - Runs on servers without GUI
- ✅ **Production ready** - Cron job support, logging, error handling
- ✅ **Error artifacts** - Auto-saves screenshots and traces

### Production Deployment (Recommended)

**🚀 Automated Cron Job** (Fully autonomous)
- Connects to production database
- Finds all campaigns with SFA links
- Scrapes 24h + 7d stream data
- Updates database automatically
- Runs on schedule (every 6 hours recommended)
- **New campaigns auto-added** - Just add SFA link to database!

**See [`PRODUCTION-DEPLOYMENT.md`](PRODUCTION-DEPLOYMENT.md) for setup guide**

### Alternative Deployment Options

**Option A: Autonomous Droplet** (Custom scheduling)
- Runs on DigitalOcean droplet
- Scheduled scrapes (cron job)
- Best for: Custom workflows

**Option B: Local + Sync** (Semi-automated)
- Runs on local machine with GUI
- Auto-syncs to production API
- Best for: Testing, debugging

## 📦 Prerequisites

- Python 3.9+
- Playwright (`playwright install chromium`)
- Node.js 18+ (for API endpoints)
- Spotify for Artists account

## ⚙️ Quick Setup

```bash
# 1. Install dependencies
pip install -r requirements.txt
playwright install chromium

# 2. Create data directories
mkdir -p data/{browser_data,downloads,artifacts}

# 3. Test scraper
python run_scraper.py
# Browser opens → Log in to S4A → Data scraped

```

## 📖 Usage Examples

### Production: Update All Active Campaigns

```bash
# Queries database for campaigns with SFA links, scrapes all, updates database
python run_production_scraper.py
```

**Output:**
```
================================================================================
PRODUCTION SPOTIFY FOR ARTISTS SCRAPER
Started at: 2025-11-17 18:30:00
================================================================================
INFO - Found 25 active campaigns with SFA links
INFO - ✓ Login verified!
INFO - [1/25] Processing campaign 123: CHAIN SMOKER
INFO -   ✓ Successfully scraped - 24hour: 4 playlists (37 streams), 7day: 11 playlists (468 streams)
INFO -   ✓ Database updated
...
INFO - Results: ✓ 24 successful, ✗ 1 failed
```

### Single Song Test

```bash
python run_scraper.py
```

### Multiple Songs (From Active Campaigns)

```bash
python run_s4a_list.py
```

### Scrape + Sync to Production API

```bash
bash run_s4a_with_sync.sh
```

### Programmatic Usage

```python
from runner.app.scraper import SpotifyArtistsScraper
import asyncio

async def scrape_song():
    song_url = "https://artists.spotify.com/c/artist/XXX/song/YYY/playlists"
    
    async with SpotifyArtistsScraper(headless=False) as scraper:
        # Verify login
        if not await scraper.verify_login():
            print("Not logged in!")
            return
        
        # Scrape data
        data = await scraper.scrape_song_data(song_url)
        print(f"Scraped {len(data['time_ranges'])} time ranges")
        
        # Access data
        stats_28d = data['time_ranges']['28day']['stats']
        print(f"Streams: {stats_28d['streams']}")
        print(f"Playlists: {len(stats_28d['playlists'])}")

asyncio.run(scrape_song())
```

## 📊 Data Structure

Scraped data format:

```json
{
  "url": "https://artists.spotify.com/c/artist/XXX/song/YYY/playlists",
  "scraped_at": "2025-11-17T12:00:00Z",
  "time_ranges": {
    "28day": {
      "stats": {
        "title": "Song Name",
        "streams": 10000,
        "listeners": 5000,
        "playlists": [
          {
            "rank": "1",
            "name": "Discover Weekly",
            "made_by": "Spotify",
            "streams": "5000",
            "date_added": "Nov 1, 2025"
          }
        ]
      }
    },
    "7day": { ... },
    "12months": { ... }
  }
}
```

## 🐛 Debugging

Error artifacts automatically saved to `data/artifacts/`:
- Screenshots: `error_YYYYMMDD_HHMMSS.png`
- HTML: `error_YYYYMMDD_HHMMSS.html`

View latest error:
```bash
ls -lt data/artifacts/ | head -5
```

## 🔧 Configuration

Environment variables (`.env`):
```bash
# Browser session storage
USER_DATA_DIR=./data/browser_data
DOWNLOAD_DIR=./data/downloads
ARTIFACTS_DIR=./data/artifacts

# Production sync (Option B)
PRODUCTION_API_URL=https://api.artistinfluence.com
PRODUCTION_API_KEY=  # Optional

# Direct DB (Option A)
SUPABASE_URL=http://kong:8000
SUPABASE_SERVICE_ROLE_KEY=...
```

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Not logged in" | Run scraper again, browser will open for login |
| "Failed to find Playlists tab" | Spotify UI changed → Update selectors in `spotify_artists.py` |
| "Campaign not found" during sync | Check campaign has `sfa` URL in database |
| Sync fails | Test API endpoints: `curl https://api.artistinfluence.com/health` |

See [`SETUP-AND-TESTING.md`](SETUP-AND-TESTING.md) for detailed troubleshooting.

## 📦 Project Structure

```
spotify_scraper/
├── runner/
│   └── app/
│       ├── scraper.py              # Main scraper class
│       └── pages/
│           └── spotify_artists.py  # Page object model
├── data/
│   ├── browser_data/               # Persistent login session
│   ├── downloads/                  # Downloaded CSVs
│   ├── artifacts/                  # Error screenshots
│   └── song_*.json                 # Scraped data files
├── run_scraper.py                  # Single song test
├── run_s4a_list.py                 # Bulk scraper
├── sync_to_production.py           # Production sync
└── setup_auth.py                   # One-time auth setup
```

## 🤝 Contributing

This scraper is part of the ARTi Spotify Platform. See main project README for contribution guidelines.

## 📄 License

MIT

---

**Need help?** Start with [`QUICK-START.md`](QUICK-START.md) or see [`DEPLOYMENT-OPTIONS.md`](DEPLOYMENT-OPTIONS.md) for full details.
