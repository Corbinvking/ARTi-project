# Spotify Scraper Production Deployment Guide

## 🎯 Overview

This guide walks you through deploying your existing `spotify_scraper/` to the production droplet and integrating it with the backend API.

## 🔄 Deployment Steps

### Step 1: Copy Scraper to Droplet

**From your local machine, run:**

```bash
# Copy your entire spotify_scraper directory to the droplet
scp -r ./spotify_scraper/ root@<droplet-ip>:/root/arti-marketing-ops/

# Or use rsync for better handling
rsync -avz ./spotify_scraper/ root@<droplet-ip>:/root/arti-marketing-ops/spotify_scraper/
```

### Step 2: SSH to Droplet and Run Setup

```bash
# SSH to your droplet
ssh root@<droplet-ip>

# Navigate to project directory
cd /root/arti-marketing-ops

# Pull latest changes
git pull origin main

# Run the setup script
bash scripts/setup-spotify-scraper.sh
```

### Step 3: Verify Integration

**Test the scraper setup:**

```bash
# Check scraper status
./scripts/manage-scraper.sh status

# Test scraper functionality
./scripts/manage-scraper.sh test

# Test API integration
curl http://localhost:3002/api/providers/spotify/health
```

## 🎵 How It Works

### Architecture Integration

```
Frontend Dashboard
    ↓ (HTTPS)
Vercel → API (DigitalOcean)
    ↓ (Python exec)
Spotify Scraper (Playwright)
    ↓ (JSON output)
Data Processing → Database
    ↓ (Webhook)
n8n Notifications
```

### Data Flow

1. **User Input**: Admin enters Spotify song URLs in frontend
2. **Job Creation**: Backend creates scraping job with unique ID
3. **Scraper Execution**: Python Playwright scraper runs in background
4. **Result Processing**: JSON results parsed and stored
5. **Notification**: Webhook sent to n8n on completion
6. **Status Updates**: Real-time job status in frontend

### File Structure

```
/root/arti-marketing-ops/
├── spotify_scraper/              # Your existing scraper
│   ├── venv/                     # Python virtual environment
│   ├── data/                     # Scraping results
│   │   ├── jobs/                 # Job configurations
│   │   ├── results/              # JSON outputs
│   │   └── configs/              # Temporary configs
│   ├── runner/                   # Scraper logic
│   └── requirements.txt          # Python dependencies
├── apps/api/src/providers/       # Backend integration
│   └── spotify/
│       └── scraper.ts            # Job orchestration
└── scripts/
    ├── setup-spotify-scraper.sh  # Deployment script
    └── manage-scraper.sh         # Management commands
```

## 🔧 Management Commands

### Scraper Management

```bash
# Start scraper environment
./scripts/manage-scraper.sh start

# Check scraper status
./scripts/manage-scraper.sh status

# Test scraper setup
./scripts/manage-scraper.sh test

# Stop running jobs
./scripts/manage-scraper.sh stop

# Clean old data (7+ days)
./scripts/manage-scraper.sh clean
```

### API Testing

```bash
# Check scraper health
curl http://localhost:3002/api/providers/spotify/health

# Start a scraping job
curl -X POST http://localhost:3002/api/providers/spotify/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "songUrls": [
      "https://artists.spotify.com/c/artist/xxx/song/xxx/playlists"
    ]
  }'

# Check job status
curl http://localhost:3002/api/providers/spotify/scrape/{jobId}

# List all jobs
curl http://localhost:3002/api/providers/spotify/scrape
```

## 🌐 Frontend Access

### Admin Dashboard

1. **Visit**: `https://app.artistinfluence.com/admin/integrations`
2. **Login**: Use your admin credentials
3. **Navigate**: Spotify Scraper section
4. **Use**: Paste song URLs and start scraping

### Real-time Features

- ✅ **Live Job Status**: See jobs progress from pending → running → completed
- 📊 **Health Metrics**: Monitor scraper performance and success rates  
- 📋 **Job History**: View past scraping jobs with detailed results
- ⚡ **Instant Feedback**: Get immediate confirmation when jobs start
- 🔄 **Auto-refresh**: Status updates every 5 seconds

## 📊 Monitoring & Troubleshooting

### Health Checks

**Scraper Health Indicators:**
- **Status**: healthy/unhealthy (Playwright availability)
- **Active Jobs**: Currently running scraping jobs
- **Success Rate**: Percentage of successful completions
- **Average Time**: How long jobs typically take
- **Last Success**: When the scraper last worked correctly

### Common Issues

**1. Scraper Not Starting**
```bash
# Check Python environment
cd /root/arti-marketing-ops/spotify_scraper
source venv/bin/activate
python --version

# Reinstall Playwright
playwright install
```

**2. Jobs Failing**
```bash
# Check scraper logs
./scripts/manage-scraper.sh status

# Test scraper manually
cd spotify_scraper
source venv/bin/activate
python run_scraper.py
```

**3. Backend Integration Issues**
```bash
# Restart API container
docker restart arti-marketing-ops-api-1

# Check API logs
docker logs arti-marketing-ops-api-1

# Test health endpoint
curl localhost:3002/api/providers/spotify/health
```

### Log Locations

- **Scraper Output**: `/root/arti-marketing-ops/spotify_scraper/data/`
- **API Logs**: `docker logs arti-marketing-ops-api-1`
- **Frontend Network**: Browser DevTools → Network tab

## 🚀 Next Steps: Phase 2B

Once the scraper is working, we'll add:

1. **Webhook Infrastructure** - Notifications to n8n on job completion
2. **Data Processing** - Transform scraped data into metrics database
3. **Analytics Dashboard** - Visualize playlist performance trends
4. **Automated Scheduling** - Regular scraping jobs via cron
5. **Multi-Provider Support** - Add Instagram, YouTube, SoundCloud

## 🔐 Security Notes

- **Scraper runs in isolated Python environment**
- **API validates song URLs before processing**
- **Job isolation prevents interference**
- **Data cleanup removes old files automatically**
- **Admin-only access to scraper controls**

---

**🎉 Your Spotify scraper is now integrated with your production platform!**

The powerful Playwright scraper you built locally now runs seamlessly in production, controlled via your admin dashboard, with real-time monitoring and webhook notifications ready for Phase 2B.
