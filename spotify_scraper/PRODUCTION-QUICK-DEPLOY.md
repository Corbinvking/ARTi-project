# ⚡ Spotify Scraper - Production Quick Deploy

**Target**: Production droplet (165.227.91.129)  
**Time**: ~15 minutes  
**Pattern**: Same as YouTube cron job

---

## 📋 Quick Command Reference

### 1. Apply Migration (From Local)

```bash
# From your Windows machine:
cd C:\Users\corbi\OneDrive\Documents\GitHub\ARTi-project

# Option A: Using Supabase CLI
npx supabase db push --db-url "postgresql://postgres:MySecurePass123!@165.227.91.129:5432/postgres"

# Option B: Direct psql
docker exec -i arti-postgres-prod psql -U postgres -d postgres < supabase/migrations/042_add_scraper_data_columns.sql
```

### 2. Deploy to Droplet

```bash
# SSH to production
ssh root@165.227.91.129

# Pull latest code
cd /root/arti-marketing-ops
git pull

# Install dependencies
cd spotify_scraper
pip3 install -r requirements.txt
python3 -m playwright install chromium
python3 -m playwright install-deps chromium
```

### 3. Configure Environment

```bash
# Create .env file
cd /root/arti-marketing-ops/spotify_scraper
cat > .env << 'EOF'
SPOTIFY_EMAIL=tribe@artistinfluence.com
SPOTIFY_PASSWORD=UE_n7C*8wgxe9!P4abtK
SUPABASE_URL=http://localhost:8000
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
HEADLESS=true
LOG_LEVEL=INFO
EOF
```

### 4. Transfer Browser Session

```bash
# On LOCAL (Windows):
cd C:\Users\corbi\OneDrive\Documents\GitHub\ARTi-project\spotify_scraper
tar -czf browser_session.tar.gz data/browser_data/
scp browser_session.tar.gz root@165.227.91.129:/root/arti-marketing-ops/spotify_scraper/

# On DROPLET:
cd /root/arti-marketing-ops/spotify_scraper
tar -xzf browser_session.tar.gz
rm browser_session.tar.gz
```

### 5. Test Scraper

```bash
# On droplet:
cd /root/arti-marketing-ops/spotify_scraper
python3 run_production_scraper.py
```

**Look for:**
```
✓ Login verified!
Found XX active campaigns with SFA links
✓ Successfully scraped campaign XXX
✓ Database updated
Results: ✓ XX successful
```

### 6. Set Up Cron Job

```bash
# Make script executable
chmod +x /root/arti-marketing-ops/scripts/spotify-scraper-daily.sh

# Add to crontab
crontab -e

# Add this line (runs daily at 2am):
0 2 * * * /root/arti-marketing-ops/scripts/spotify-scraper-daily.sh

# Verify
crontab -l
```

### 7. Test Cron Script

```bash
# Run manually to test
/root/arti-marketing-ops/scripts/spotify-scraper-daily.sh

# Check log
tail -f /root/arti-marketing-ops/logs/spotify-scraper/run-*.log | tail -100
```

---

## ✅ Verification

### Check Database

```bash
docker exec -i arti-postgres-prod psql -U postgres -d postgres -c "
SELECT 
    COUNT(*) FILTER (WHERE sfa IS NOT NULL) as campaigns_with_sfa,
    COUNT(*) FILTER (WHERE last_scraped_at IS NOT NULL) as campaigns_scraped,
    MAX(last_scraped_at) as last_scrape_time
FROM spotify_campaigns;
"
```

**Expected:**
- `campaigns_with_sfa`: Number of campaigns with SFA links
- `campaigns_scraped`: Should match (after first run)
- `last_scrape_time`: Recent timestamp

### Check Sample Data

```bash
docker exec -i arti-postgres-prod psql -U postgres -d postgres -c "
SELECT 
    campaign,
    track_name,
    streams_24h,
    streams_7d,
    playlists_24h_count,
    playlists_7d_count,
    last_scraped_at
FROM spotify_campaigns
WHERE last_scraped_at IS NOT NULL
LIMIT 5;
"
```

---

## 🚨 Troubleshooting

### Database Connection Failed

```bash
# Test Kong is accessible
curl http://localhost:8000/rest/v1/ -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

# Check Kong is running
docker ps | grep kong
```

### Login Failed

```bash
# Check browser session exists
ls -la /root/arti-marketing-ops/spotify_scraper/data/browser_data/

# If missing, re-transfer from local machine
```

### Playwright Not Found

```bash
# Reinstall Playwright
pip3 install --upgrade playwright
python3 -m playwright install chromium
python3 -m playwright install-deps chromium
```

### No Campaigns Found

```bash
# Check database for campaigns with SFA links
docker exec -i arti-postgres-prod psql -U postgres -d postgres -c "
SELECT id, campaign, sfa 
FROM spotify_campaigns 
WHERE sfa IS NOT NULL 
LIMIT 5;
"
```

---

## 📊 Monitoring Commands

```bash
# View latest log
tail -f /root/arti-marketing-ops/logs/spotify-scraper/run-$(date +%Y%m%d)*.log

# Check cron runs
grep spotify-scraper /var/log/syslog | tail -20

# List all logs
ls -lh /root/arti-marketing-ops/logs/spotify-scraper/

# Check database stats
docker exec -i arti-postgres-prod psql -U postgres -d postgres -c "
SELECT 
    SUM(streams_24h) as total_24h_streams,
    SUM(streams_7d) as total_7d_streams,
    COUNT(*) FILTER (WHERE last_scraped_at IS NOT NULL) as scraped_count
FROM spotify_campaigns;
"
```

---

## 🎯 Success Criteria

✅ **Deployment successful if:**
1. Test scraper run completes without errors
2. Database shows `streams_24h` and `streams_7d` populated
3. Cron job is listed in `crontab -l`
4. Manual cron script run succeeds
5. Logs show "SCRAPING COMPLETE" with success count

---

## 📞 Next Steps

After successful deployment:
1. Monitor first automated run (next day at 2am)
2. Check logs after first cron run
3. Verify data freshness in database
4. Set up monitoring alerts (optional)
5. Document any campaign-specific issues

---

**Total Time**: ~15 minutes  
**Maintenance**: Zero (fully automated)  
**Updates**: Daily at 2am automatically

