# Production Server - Quick Commands

## 🚀 Deploy Spotify Scraper

```bash
cd /root/arti-marketing-ops
git pull origin main
bash scripts/deploy-spotify-scraper.sh
```

## 🧪 Test Single Campaign

```bash
cd /root/arti-marketing-ops/spotify_scraper
export DISPLAY=:99
python3 run_production_scraper.py --limit 1
```

## 🏃 Run Full Scraper

```bash
cd /root/arti-marketing-ops/spotify_scraper
export DISPLAY=:99
python3 run_production_scraper.py
```

## 📊 Check Database

```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT campaign, streams_24h, streams_7d, streams_28d, last_scraped_at 
FROM spotify_campaigns 
WHERE last_scraped_at IS NOT NULL 
ORDER BY last_scraped_at DESC 
LIMIT 5;
"
```

## 📝 Check Logs

```bash
tail -f /var/log/spotify-scraper/run-*.log
```

## 🔧 Troubleshooting

### Check Xvfb
```bash
ps aux | grep Xvfb
# If not running:
Xvfb :99 -screen 0 1280x1024x24 &
```

### Check Credentials
```bash
cd /root/arti-marketing-ops/spotify_scraper
cat .env | grep SPOTIFY
```

### Test Login
```bash
cd /root/arti-marketing-ops/spotify_scraper
export DISPLAY=:99
python3 test_truly_fresh_login.py
```

### Apply Migration
```bash
cd /root/arti-marketing-ops
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/042_add_timerange_columns.sql
```

