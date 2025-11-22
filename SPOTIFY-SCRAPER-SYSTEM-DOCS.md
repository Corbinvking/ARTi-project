# Spotify Campaign Scraper - System Documentation

## 📖 Overview

Automated data collection system that scrapes Spotify for Artists (SFA) campaign performance data and stores it in our database. Runs daily via cron job to keep all campaign metrics up-to-date.

---

## 🎯 System Purpose

**What it does:**
- Automatically logs into Spotify for Artists
- Finds all campaigns with valid SFA URLs in our database
- Scrapes performance metrics (streams, playlists) for 24h, 7d, and 28d time ranges
- Updates our database with fresh data
- Tracks last scrape timestamp for each campaign

**Why we built it:**
- Manual data entry is time-consuming and error-prone
- Need real-time campaign performance tracking
- Vendors and clients need accurate reporting
- Enable data-driven decision making for campaign management

---

## 🗄️ Database Schema

### Spotify Campaigns Table

**Key Columns:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `campaign` | TEXT | Campaign name |
| `sfa` | TEXT | Spotify for Artists URL |
| `track_name` | TEXT | Song title |
| `artist_name` | TEXT | Artist name |
| `streams_24h` | INTEGER | Streams in last 24 hours |
| `streams_7d` | INTEGER | Streams in last 7 days |
| `streams_28d` | INTEGER | Streams in last 28 days |
| `playlists_24h_count` | INTEGER | Playlists with activity (24h) |
| `playlists_7d_count` | INTEGER | Playlists with activity (7d) |
| `playlists_28d_count` | INTEGER | Playlists with activity (28d) |
| `last_scraped_at` | TIMESTAMP | When data was last updated |
| `scrape_data` | JSONB | Full raw data (playlists, etc.) |

**Valid SFA URL Format:**
```
https://artists.spotify.com/c/artist/{ARTIST_ID}/song/{SONG_ID}/playlists
https://artists.spotify.com/c/artist/{ARTIST_ID}/song/{SONG_ID}/stats
```

**Database Indexes:**
- `idx_spotify_campaigns_last_scraped` - For cron job queries
- `idx_spotify_campaigns_sfa` - For filtering valid URLs

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────┐
│  1. CRON JOB (Daily at 2 AM)                           │
│     /root/ARTi-project/scripts/spotify-scraper-daily.sh│
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  2. PRODUCTION SCRAPER                                  │
│     /root/ARTi-project/spotify_scraper/                │
│     run_production_scraper.py                          │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  3. QUERY DATABASE                                      │
│     SELECT campaigns WHERE sfa IS NOT NULL              │
│     Filter: Valid SFA URLs only                        │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  4. LOGIN TO SPOTIFY (Fresh Incognito)                 │
│     - Navigate to artists.spotify.com                  │
│     - Click "Log in" button                            │
│     - Enter email + password                           │
│     - Verify sp_dc cookie                              │
│     - Dismiss welcome modal                            │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  5. FOR EACH CAMPAIGN                                   │
│     - Navigate to SFA URL                              │
│     - Switch time ranges: 24h, 7d, 28d                │
│     - Extract streams + playlists                      │
│     - Store in memory                                  │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  6. UPDATE DATABASE                                     │
│     PATCH /rest/v1/spotify_campaigns                   │
│     SET streams_24h, streams_7d, streams_28d,          │
│         playlists_*_count, last_scraped_at,            │
│         scrape_data                                     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  7. FRONTEND DISPLAYS DATA                              │
│     - Campaigns page: Latest metrics                   │
│     - Performance analytics: Charts & trends           │
│     - Vendor payouts: Based on accurate data           │
└─────────────────────────────────────────────────────────┘
```

---

## 🤖 Scraper Architecture

### Fresh Incognito Login (Critical!)

**Why Fresh Login Every Time:**
- ✅ No cached session dependencies
- ✅ Consistent behavior across runs
- ✅ Avoids session expiration issues
- ✅ Clean state = reliable results

**Implementation:**
```python
# Create fresh browser context (incognito)
browser = await playwright.chromium.launch(headless=False)
context = await browser.new_context()  # No persistent data
page = await context.new_page()

# Full login flow every time
# 1. Navigate to artists.spotify.com
# 2. Click Login button
# 3. Enter credentials
# 4. Verify sp_dc cookie
# 5. Ready to scrape
```

### Time Range Support

**Scraped Data:**
- **24 hours** - Latest daily performance
- **7 days** - Weekly trends
- **28 days** - Monthly overview

**UI displays:**
```
┌──────────────────────────────────────────┐
│  Campaign: Song Name                     │
├──────────────────────────────────────────┤
│  7d:  320 streams (4 playlists)         │
│  28d: 1,732 streams (22 playlists)      │
│  12m: 9,893 streams (historical)        │
└──────────────────────────────────────────┘
```

**After Update:**
```
┌──────────────────────────────────────────┐
│  Campaign: Song Name                     │
├──────────────────────────────────────────┤
│  24h: 56 streams (3 playlists)          │
│  7d:  320 streams (4 playlists)         │
│  28d: 1,732 streams (22 playlists)      │
└──────────────────────────────────────────┘
```

---

## 📁 File Structure

```
ARTi-project/
├── spotify_scraper/
│   ├── runner/
│   │   └── app/
│   │       ├── scraper.py              # Main scraper class
│   │       └── pages/
│   │           └── spotify_artists.py  # Page interaction logic
│   ├── run_production_scraper.py       # Production entry point
│   ├── test_full_workflow.py           # Local testing script
│   ├── test_truly_fresh_login.py       # Login flow testing
│   ├── requirements.txt                # Python dependencies
│   └── .env                            # Credentials (not in git)
│
├── scripts/
│   └── spotify-scraper-daily.sh        # Cron job script
│
├── supabase/migrations/
│   └── 042_add_timerange_columns.sql   # Database schema
│
└── docs/
    ├── SPOTIFY-SCRAPER-READY-FOR-PRODUCTION.md
    └── SPOTIFY-SCRAPER-SYSTEM-DOCS.md  # This file
```

---

## ⚙️ Configuration

### Environment Variables

**Location:** `/root/ARTi-project/spotify_scraper/.env`

```bash
# Database Connection
SUPABASE_URL=https://api.artistinfluence.com
SUPABASE_SERVICE_ROLE_KEY=eyJ...81IU

# Spotify Credentials
SPOTIFY_EMAIL=tribe@artistinfluence.com
SPOTIFY_PASSWORD=XXXX

# Scraper Settings
HEADLESS=false  # Use GUI mode with Xvfb on server
```

### Cron Job Schedule

**Current:** Daily at 2:00 AM EST
```cron
0 2 * * * /root/ARTi-project/scripts/spotify-scraper-daily.sh >> /root/logs/spotify-scraper-cron.log 2>&1
```

**Why 2 AM:**
- Low traffic time
- Spotify data is stable
- Vendors/clients check in morning
- Allows time for troubleshooting before business hours

---

## 🚀 Deployment Process

### Initial Setup (Done)

1. ✅ Install dependencies
   ```bash
   cd /root/ARTi-project/spotify_scraper
   pip3 install -r requirements-scraper-only.txt
   python3 -m playwright install chromium
   ```

2. ✅ Set up Xvfb (GUI mode on server)
   ```bash
   sudo apt-get install xvfb
   Xvfb :99 -screen 0 1280x1024x24 &
   ```

3. ✅ Configure environment
   ```bash
   cp .env.example .env
   # Edit .env with production credentials
   ```

4. ✅ Set up cron job
   ```bash
   crontab -e
   # Add: 0 2 * * * /root/ARTi-project/scripts/spotify-scraper-daily.sh
   ```

### Updating the System

**To deploy code changes:**
```bash
# On production server
cd /root/ARTi-project
git pull origin main
cd spotify_scraper
pip3 install -r requirements-scraper-only.txt --upgrade
```

**To test before cron runs:**
```bash
export DISPLAY=:99
python3 run_production_scraper.py --limit 5
```

**To apply database migrations:**
```bash
cd /root/ARTi-project
npx supabase db push --db-url "postgresql://postgres:postgres@localhost:54321/postgres"
```

---

## 📊 Monitoring & Logs

### Log Locations

**Cron Job Logs:**
```bash
tail -f /root/logs/spotify-scraper-cron.log
```

**Manual Run Logs:**
```bash
# Logs appear in terminal when running manually
python3 run_production_scraper.py
```

### Success Indicators

**Healthy System:**
- ✅ Cron log shows "Successfully scraped X campaigns"
- ✅ `last_scraped_at` timestamps are recent
- ✅ Frontend UI shows updated data
- ✅ No error messages in logs

**Check Last Scrape:**
```sql
SELECT 
  COUNT(*) as total_scraped,
  MAX(last_scraped_at) as most_recent,
  MIN(last_scraped_at) as oldest
FROM spotify_campaigns
WHERE last_scraped_at IS NOT NULL;
```

**View Recent Updates:**
```sql
SELECT 
  campaign,
  streams_24h,
  streams_7d,
  streams_28d,
  last_scraped_at
FROM spotify_campaigns
WHERE last_scraped_at > NOW() - INTERVAL '24 hours'
ORDER BY last_scraped_at DESC
LIMIT 10;
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Login Fails

**Symptoms:**
- "Login failed" in logs
- No `sp_dc` cookie found

**Solutions:**
```bash
# Verify credentials
cat /root/ARTi-project/spotify_scraper/.env | grep SPOTIFY

# Check Xvfb is running
ps aux | grep Xvfb
export DISPLAY=:99

# Test login manually
python3 spotify_scraper/test_truly_fresh_login.py
```

#### 2. No Data Scraped

**Symptoms:**
- Campaigns show 0 streams
- `last_scraped_at` not updating

**Solutions:**
```bash
# Check for valid SFA URLs
SELECT COUNT(*) FROM spotify_campaigns 
WHERE sfa LIKE 'https://artists.spotify.com%';

# Run with debug output
python3 run_production_scraper.py --limit 1 --verbose
```

#### 3. Database Update Fails

**Symptoms:**
- "Database error: 401" in logs
- Data scraped but not saved

**Solutions:**
```bash
# Verify service role key
echo $SUPABASE_SERVICE_ROLE_KEY

# Test database connection
curl -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
     https://api.artistinfluence.com/rest/v1/spotify_campaigns?limit=1
```

#### 4. Cron Job Not Running

**Symptoms:**
- No recent log entries
- Old `last_scraped_at` timestamps

**Solutions:**
```bash
# Check cron is running
sudo service cron status

# Verify cron job exists
crontab -l | grep spotify

# Check for permission issues
ls -la /root/ARTi-project/scripts/spotify-scraper-daily.sh

# Test script manually
bash /root/ARTi-project/scripts/spotify-scraper-daily.sh
```

---

## 🔐 Security Considerations

### Credentials Storage

**DO:**
- ✅ Store in `.env` file (gitignored)
- ✅ Use environment variables in production
- ✅ Rotate passwords periodically
- ✅ Use service role keys (not personal tokens)

**DON'T:**
- ❌ Commit credentials to git
- ❌ Share `.env` files
- ❌ Use personal Spotify accounts
- ❌ Log passwords in output

### Access Control

**Who has access:**
- Root user on production server
- Service account for database updates
- Dedicated Spotify account (tribe@artistinfluence.com)

**Audit trail:**
- All scrapes logged with timestamps
- Database changes tracked in `last_scraped_at`
- Cron logs retained for 30 days

---

## 📈 Performance Metrics

### Current Stats

**As of 2025-11-22:**
- Total campaigns in database: ~1,400
- Campaigns with SFA URLs: ~150
- Average scrape time: ~2 seconds per campaign
- Total daily run time: ~5-10 minutes
- Success rate: 95%+

### Scaling Considerations

**Current capacity:**
- Can handle 500+ campaigns per run
- Bottleneck: Spotify rate limiting (not database)
- Run time scales linearly with campaign count

**Future optimizations:**
- Parallel scraping (multiple browsers)
- Smart scheduling (scrape active campaigns more frequently)
- Caching (skip unchanged campaigns)

---

## 🎯 Success Criteria

### System is Working When:

1. ✅ **Data Freshness**
   - All campaigns updated within 24 hours
   - `last_scraped_at` timestamps are recent

2. ✅ **Accuracy**
   - Frontend numbers match Spotify for Artists
   - All three time ranges populated

3. ✅ **Reliability**
   - Cron runs successfully every day
   - <5% failure rate

4. ✅ **Visibility**
   - Vendors can see real-time metrics
   - Clients trust the data
   - Support team can troubleshoot issues

---

## 📚 Related Documentation

- `SPOTIFY-SCRAPER-READY-FOR-PRODUCTION.md` - Deployment guide
- `SPOTIFY-SCRAPER-LOCAL-DEV.md` - Local development setup
- `SPOTIFY-SCRAPER-LOGIN-FIX.md` - Login troubleshooting
- `supabase/migrations/042_add_timerange_columns.sql` - Database schema

---

## 🔄 Maintenance Schedule

### Daily
- ✅ Automated scrape via cron (2 AM)
- ✅ Check logs for errors

### Weekly
- Review success rate
- Spot-check data accuracy
- Update any failing campaigns

### Monthly
- Rotate Spotify password
- Review and archive old logs
- Performance optimization review

### Quarterly
- Update dependencies
- Review and improve selectors
- Capacity planning

---

## 📞 Support

### For Issues:
1. Check logs: `/root/logs/spotify-scraper-cron.log`
2. Test manually: `python3 run_production_scraper.py --limit 1`
3. Review this documentation
4. Check GitHub issues

### Contact:
- System maintained by: Development Team
- Spotify account owner: Artist Influence Admin
- Database admin: DevOps Team

---

**Last Updated:** 2025-11-22  
**Version:** 1.0  
**Status:** Production Ready

