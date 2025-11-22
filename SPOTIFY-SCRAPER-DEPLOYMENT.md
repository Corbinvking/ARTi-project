# 🚀 Spotify Scraper - Quick Production Deployment

## ✅ Pre-Deployment Checklist

- [x] Database migration applied (columns added)
- [x] Local testing complete (56 streams 24h, 320 streams 7d)
- [x] Production data verified in database
- [x] Deployment script created

## 📦 Deployment Steps

### **Step 1: Commit and Push Changes**

On your local machine:

```bash
cd C:\Users\corbi\OneDrive\Documents\GitHub\ARTi-project

# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: Production-ready Spotify scraper with auto-login and stream calculation

- Fixed stream calculation to sum from playlist table
- Added auto-login with session validation
- Updated selectors for current Spotify UI
- Created automated deployment script
- Fixed datetime.UTC compatibility
- Added 24h and 7d stream tracking
- Database migration for new columns applied"

# Push to GitHub
git push origin main
```

### **Step 2: Deploy on Droplet**

SSH to the production droplet:

```bash
ssh root@165.227.91.129
```

Then run the auto-deploy script:

```bash
cd /root/arti-marketing-ops
git pull origin main
chmod +x spotify_scraper/deploy_production.sh
bash spotify_scraper/deploy_production.sh
```

The script will automatically:
1. Pull latest code
2. Install Python dependencies
3. Install Playwright browsers
4. Check environment variables
5. Create log directories
6. Test the scraper
7. Set up daily cron job (2 AM)

### **Step 3: Configure Environment (if needed)**

If `.env` doesn't exist on the droplet:

```bash
cd /root/arti-marketing-ops/spotify_scraper
cp production.env.example .env
nano .env
```

Update with:
```bash
SPOTIFY_EMAIL=tribe@artistinfluence.com
SPOTIFY_PASSWORD=UE_n7C*8wgxe9!P4abtK
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
HEADLESS=true
LOG_LEVEL=INFO
```

### **Step 4: Transfer Browser Session (Optional)**

If the scraper fails to auto-login (CAPTCHA, etc.), transfer your local browser session:

**On your Windows machine:**
```powershell
cd C:\Users\corbi\OneDrive\Documents\GitHub\ARTi-project\spotify_scraper

# Compress browser data
Compress-Archive -Path data\browser_data -DestinationPath browser_session.zip -Force

# Transfer to droplet
scp browser_session.zip root@165.227.91.129:/root/arti-marketing-ops/spotify_scraper/
```

**On the droplet:**
```bash
cd /root/arti-marketing-ops/spotify_scraper
unzip -o browser_session.zip
rm browser_session.zip
```

### **Step 5: Manual Test Run**

Test the scraper manually:

```bash
cd /root/arti-marketing-ops/spotify_scraper
python3 run_production_scraper.py
```

Watch for:
- ✅ "Already logged in! Session is valid."
- ✅ "Total streams from X playlists: Y"
- ✅ "Successfully updated campaign X"

### **Step 6: Verify Cron Job**

Check the cron schedule:

```bash
crontab -l
```

Should see:
```
0 2 * * * cd /root/arti-marketing-ops/spotify_scraper && bash scripts/spotify-scraper-daily.sh >> /var/log/spotify-scraper/cron.log 2>&1
```

## 📊 Monitoring

### **Check Logs**

Real-time monitoring:
```bash
tail -f /var/log/spotify-scraper/production_scraper_$(date +%Y%m%d).log
```

View recent runs:
```bash
ls -lht /var/log/spotify-scraper/ | head -20
```

Check specific log:
```bash
cat /var/log/spotify-scraper/run-20251122-020000.log
```

### **Verify Database Updates**

Check how many campaigns have been scraped:

```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  COUNT(*) as total_campaigns,
  COUNT(last_scraped_at) as scraped_campaigns,
  MAX(last_scraped_at) as last_scrape_time
FROM spotify_campaigns;
"
```

Check recent scrapes:

```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  campaign,
  streams_24h,
  streams_7d,
  playlists_7d_count,
  last_scraped_at
FROM spotify_campaigns 
WHERE last_scraped_at IS NOT NULL 
ORDER BY last_scraped_at DESC 
LIMIT 10;
"
```

## 🔧 Troubleshooting

### **Issue: Login Fails**

1. Check if browser session data exists:
   ```bash
   ls -la /root/arti-marketing-ops/spotify_scraper/data/browser_data/
   ```

2. Transfer session from local machine (see Step 4)

3. Or delete session and let scraper auto-login:
   ```bash
   rm -rf /root/arti-marketing-ops/spotify_scraper/data/browser_data/*
   ```

### **Issue: Dependencies Missing**

Reinstall dependencies:
```bash
cd /root/arti-marketing-ops/spotify_scraper
pip3 install --break-system-packages -r requirements.txt
python3 -m playwright install chromium
python3 -m playwright install-deps chromium
```

### **Issue: Permission Denied**

Make scripts executable:
```bash
chmod +x /root/arti-marketing-ops/spotify_scraper/deploy_production.sh
chmod +x /root/arti-marketing-ops/scripts/spotify-scraper-daily.sh
```

### **Issue: Cron Not Running**

Check cron service:
```bash
systemctl status cron
```

Check cron logs:
```bash
tail -f /var/log/spotify-scraper/cron.log
```

## 📈 Expected Performance

- **131 campaigns** with SFA links
- **~1-2 minutes per campaign** (including time range switches)
- **Total runtime**: ~2-3 hours for all campaigns
- **Cron schedule**: Daily at 2 AM
- **Database updates**: Real-time as each campaign completes

## ✅ Success Indicators

1. Cron job runs at 2 AM daily
2. Logs show successful campaign updates
3. Database `last_scraped_at` timestamps update daily
4. Stream counts populate for campaigns
5. No errors in log files

## 🎉 That's It!

Your Spotify scraper is now fully automated and will run daily to keep your campaign data fresh!

For support, check:
- Logs: `/var/log/spotify-scraper/`
- Codebase: `/root/arti-marketing-ops/spotify_scraper/`
- This guide: `SPOTIFY-SCRAPER-DEPLOYMENT.md`

