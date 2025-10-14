# Spotify Scraper Integration - Complete Guide

## Overview
The Spotify scraper is the **data heartbeat** of the system. It fetches real streaming analytics from Spotify for Artists and populates campaign metrics, vendor performance, and client analytics.

## What It Does

### 1. Data Collection
- **Scrapes Spotify for Artists** for each campaign track
- **Collects playlist data**: Which playlists, stream counts, date added
- **Time-range metrics**: 7-day, 28-day, 12-month performance
- **Vendor attribution**: Maps playlists to vendors who placed them

### 2. Database Updates
Populates these fields in `spotify_campaigns`:
- `plays_last_7d` - Streams in last 7 days
- `plays_last_3m` - Streams in last 3 months (using 28d as proxy)
- `plays_last_12m` - Streams in last 12 months
- `playlist_adds` - Total playlists song is on
- `saves` - User saves (if available)

### 3. Analytics Enabled
- **Vendor Performance**: Which vendors deliver the most streams
- **Playlist Effectiveness**: Which playlists perform best
- **Client ROI**: Real vs. promised stream counts
- **Campaign Progress**: Actual performance vs. goals

## Architecture

```
Spotify for Artists
        ↓
[Python Scraper] (spotify_scraper/)
        ↓
[JSON Output] (scraped_data_*.json)
        ↓
[Process Script] (process-scraped-data.js)
        ↓
[Supabase Database] (spotify_campaigns table)
        ↓
[Frontend Dashboard] (Real-time analytics)
```

## Setup Instructions

### Step 1: Prepare Scraping Jobs

```bash
# Generate scraping job list from campaigns
node scripts/prepare-scraping-jobs.js
```

**Output:**
- `spotify_scraper/scraping_jobs.json` - All Spotify URLs
- `spotify_scraper/priority_jobs.json` - Active campaigns only

### Step 2: Configure Spotify Scraper

```bash
cd spotify_scraper

# Install dependencies
pip install -r requirements.txt

# Configure session (manual login once)
# Follow scraper README for authentication
```

### Step 3: Run Scraper

```bash
# Run for all active campaigns
python run_multi_scraper_config.py
```

**What happens:**
1. Logs into Spotify for Artists
2. Navigates to each track's playlist page
3. Scrapes stream data for 7d, 28d, 12m
4. Saves JSON files to `data/` directory
5. Creates summary report

### Step 4: Process Scraped Data

```bash
# Back to main project directory
cd ..

# Process all scraped JSON files
node scripts/process-scraped-data.js
```

**What happens:**
1. Reads all `song_*.json` files
2. Extracts metrics (streams, playlists, performance)
3. Matches track IDs to database campaigns
4. Updates `spotify_campaigns` with real data
5. Calculates vendor performance metrics

### Step 5: View Analytics

Navigate to:
- `/spotify/campaigns` - See real stream progress
- `/spotify/vendors` - Vendor performance rankings
- `/spotify/clients` - Client campaign ROI
- `/spotify/ml-dashboard` → "AI Analytics" - Ask questions about the data

## Scraper Output Format

### Example: `song_0LfS8z5VUqkD9WlMLOZskY_20250926_133839.json`

```json
{
  "url": "https://artists.spotify.com/c/artist/0NgWGGk9p04zLTeFbIdsVO/song/0LfS8z5VUqkD9WlMLOZskY/playlists",
  "scraped_at": "2025-09-26T13:38:08",
  "time_ranges": {
    "28day": {
      "stats": {
        "playlists": [
          {
            "rank": "1",
            "name": "GYM - TEMAZOS MOTIVACION 2025",
            "made_by": "—",
            "streams": "10,674",
            "date_added": "Aug 25, 2025"
          }
        ],
        "playlist_stats": {
          "showing": "8",
          "total": "56"
        }
      }
    },
    "7day": { ... },
    "12months": { ... }
  }
}
```

## Database Schema Updates

### spotify_campaigns table

```sql
-- Stream analytics columns (added in migration 028)
plays_last_7d INTEGER DEFAULT 0,
plays_last_3m INTEGER DEFAULT 0,
plays_last_12m INTEGER DEFAULT 0,
playlist_adds INTEGER DEFAULT 0,
saves INTEGER DEFAULT 0
```

## Automation & Scheduling

### Option 1: Cron Job (Linux/Mac)

```bash
# Edit crontab
crontab -e

# Add job to run daily at 2 AM
0 2 * * * cd /path/to/ARTi-project && ./scripts/run-daily-scrape.sh
```

### Option 2: n8n Workflow

```
Trigger: Schedule (Daily at 2 AM)
   ↓
Node: Execute Command
   Command: cd spotify_scraper && python run_multi_scraper_config.py
   ↓
Node: Execute Command
   Command: node scripts/process-scraped-data.js
   ↓
Node: Send Notification
   Email: admin@artistinfluence.com
   Subject: "Daily Scrape Complete: {campaigns_updated} campaigns updated"
```

### Option 3: GitHub Actions (Future)

```yaml
name: Daily Spotify Scrape
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run scraper
        run: cd spotify_scraper && python run_multi_scraper_config.py
      - name: Process data
        run: node scripts/process-scraped-data.js
```

## Analytics Use Cases

### 1. Vendor Performance Rankings

```sql
-- Which vendor delivers the most streams?
SELECT 
  v.name,
  COUNT(sc.id) as campaigns,
  AVG(sc.plays_last_7d) as avg_weekly_streams,
  SUM(sc.plays_last_7d) as total_weekly_streams,
  AVG(CAST(sc.plays_last_7d AS FLOAT) / NULLIF(CAST(sc.goal AS INT), 0)) as efficiency
FROM vendors v
LEFT JOIN spotify_campaigns sc ON sc.vendor_id = v.id
WHERE sc.plays_last_7d > 0
GROUP BY v.id, v.name
ORDER BY total_weekly_streams DESC;
```

### 2. Playlist Effectiveness

Once we add a `playlists` table with scraper data:

```sql
-- Which playlists generate the most streams?
SELECT 
  playlist_name,
  SUM(streams_contributed) as total_streams,
  COUNT(DISTINCT campaign_id) as campaigns_placed,
  AVG(streams_contributed) as avg_streams_per_campaign
FROM campaign_playlists
GROUP BY playlist_name
ORDER BY total_streams DESC
LIMIT 20;
```

### 3. Client ROI

```sql
-- How are clients' campaigns performing?
SELECT 
  c.name as client,
  COUNT(cg.id) as total_campaigns,
  SUM(cg.total_goal) as total_goal,
  SUM(COALESCE(
    (SELECT SUM(plays_last_7d * 4) FROM spotify_campaigns WHERE campaign_group_id = cg.id),
    0
  )) as estimated_monthly_streams,
  ROUND(100.0 * SUM(...) / SUM(cg.total_goal), 2) as progress_pct
FROM clients c
LEFT JOIN campaign_groups cg ON cg.client_id = c.id
GROUP BY c.id, c.name
ORDER BY progress_pct DESC;
```

## Expected Results

After running the scraper and processor:

### Campaign View
```
Campaign: Traveler - Ocean Born
Status: Active
Goal: 85,000 streams
Budget: $1,050

📊 Real Performance:
   Last 7 days: 2,392 streams
   Last 28 days: 10,674 streams  
   Last 12 months: 14,797 streams
   
📝 Playlists: 56 total
   1. GYM - TEMAZOS MOTIVACION 2025: 10,674 streams
   2. Your DJ (Spotify): 474 streams
   3. Radio (Spotify): 59 streams
   
✅ On Track: 17% complete after 28 days
```

### Vendor Performance
```
Club Restricted
   193 active campaigns
   Avg: 554 streams/week per campaign
   Top Playlists:
     - Heavy Bass Beats: 45,000 total streams
     - EDM BANGERS: 38,000 total streams
   Efficiency: 94% (delivering on promises)
```

### Client Dashboard
```
Client: Reece Rosé
Campaigns: 4 active, 2 complete

Total Investment: $3,450
Total Goal: 230,000 streams
Actual Delivered: 187,500 streams (81%)

ROI: $0.018 per stream
Performance: ✅ Exceeding expectations
```

## Scraper Configuration

### songs_config.json format

```json
{
  "songs": [
    {
      "name": "Traveler - Ocean Born",
      "url": "https://artists.spotify.com/c/artist/0NgWGGk9p04zLTeFbIdsVO/song/0LfS8z5VUqkD9WlMLOZskY/playlists",
      "campaign_id": "uuid-here",
      "vendor": "Club Restricted",
      "client": "Traveler"
    }
  ]
}
```

## Future Enhancements

### 1. Playlist Performance Table

Create a `campaign_playlists` table:

```sql
CREATE TABLE campaign_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id INTEGER REFERENCES spotify_campaigns(id),
  playlist_name TEXT,
  playlist_curator TEXT,
  streams_7d INTEGER,
  streams_28d INTEGER,
  streams_12m INTEGER,
  date_added DATE,
  last_scraped TIMESTAMP DEFAULT NOW()
);
```

### 2. Automated Anomaly Detection

```javascript
// Detect underperforming campaigns
SELECT * FROM spotify_campaigns
WHERE plays_last_7d < (daily * 7 * 0.5)  // Less than 50% of promised
AND status = 'Active';
```

### 3. Vendor SLA Monitoring

```javascript
// Track vendor delivery vs. promises
SELECT 
  v.name,
  AVG(CAST(sc.daily AS INT)) as promised_daily,
  AVG(sc.plays_last_7d / 7.0) as actual_daily,
  COUNT(CASE WHEN sc.plays_last_7d < CAST(sc.daily AS INT) * 7 THEN 1 END) as underperforming
FROM vendors v
JOIN spotify_campaigns sc ON sc.vendor_id = v.id
GROUP BY v.id, v.name;
```

## Troubleshooting

### Issue: Scraper login fails
**Solution:**
```bash
cd spotify_scraper
python setup_test.py  # Re-authenticate
```

### Issue: No data scraped
**Check:**
1. Session cookies are valid
2. Spotify for Artists account has access to the tracks
3. URLs in database are correct Spotify URLs

### Issue: Track IDs don't match
**Solution:**
- The track ID in the URL must match the scraped filename
- Update URLs in database to use correct Spotify track links

## Security & Rate Limiting

- **Rate Limit**: Max 1 request per 2-3 seconds
- **Session Management**: Re-authenticate every 24 hours
- **Error Handling**: Save failed URLs for manual review
- **Data Privacy**: Don't commit session cookies to Git

## Success Metrics

After integration, you should see:
- ✅ Real stream counts populate campaigns
- ✅ Vendor rankings based on actual performance
- ✅ Client dashboards show ROI
- ✅ Playlist effectiveness rankings
- ✅ AI analytics answers: "Which vendor is best?" with real data

---

**The scraper transforms your platform from tracking promises to measuring real results!** 🎯📈

