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
| [`DEPLOYMENT-OPTIONS.md`](DEPLOYMENT-OPTIONS.md) | 🔧 Full deployment guide (Option A vs B) | Production deployment |
| [`IMPLEMENTATION-SUMMARY.md`](IMPLEMENTATION-SUMMARY.md) | 📊 Technical overview | Developers |

## ✨ Features

### Core Capabilities
- ✅ Automated playlist data scraping from S4A
- ✅ Multiple time range support (7d, 28d, 12m)
- ✅ Persistent browser sessions (no re-login)
- ✅ Headless and headed modes
- ✅ Production database sync
- ✅ Error artifact collection (screenshots, traces)
- ✅ Human-like delays and behaviors

### Two Deployment Options

**Option A: Autonomous Droplet** (Fully automated, headless)
- Runs on DigitalOcean droplet
- Scheduled daily scrapes (cron job)
- No manual intervention
- Best for: Production, 24/7 operation

**Option B: Local + Sync** (Semi-automated, GUI)
- Runs on local machine
- Human handles 2FA login
- Auto-syncs to production
- Best for: Testing, human oversight

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

### Single Song Scrape

```bash
python run_scraper.py
```

### Multiple Songs (From Active Campaigns)

```bash
python run_s4a_list.py
```

### Scrape + Sync to Production

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
