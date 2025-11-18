# YouTube Stats Daily Update - Cron Job Setup

## Overview
This cron job updates YouTube stats for **active and pending campaigns only**, 3 times per day.
Complete campaigns remain in the database with their final stats.

---

## Files
- `scripts/youtube-stats-daily-update.sh` - Update script (active/pending only)
- API endpoint: `POST /api/youtube-data-api/fetch-all-campaigns`
  - With `{"includeComplete": false}` (default)

---

## Production Deployment

### 1. Commit and Push Changes
```bash
cd C:\Users\corbi\OneDrive\Documents\GitHub\ARTi-project
git add apps/api/src/routes/youtube-data-api.ts docker-compose.yml scripts/youtube-stats-daily-update.sh
git commit -m "Add YouTube stats cron job for active campaigns only

- Modified fetch-all-campaigns to filter by includeComplete flag
- By default only updates active/pending (complete campaigns are static)
- Added Supabase network to docker-compose.yml for persistent connection
- Created youtube-stats-daily-update.sh for cron job"
git push origin main
```

### 2. Pull on Production Droplet
```bash
ssh root@165.227.91.129
cd ~/arti-marketing-ops
git pull
docker compose build api
docker compose up -d api
```

### 3. Test the Script
```bash
# Make executable
chmod +x scripts/youtube-stats-daily-update.sh

# Test run
./scripts/youtube-stats-daily-update.sh
```

Expected output:
```
[2025-11-17 12:00:00] Starting YouTube stats update (active/pending only)...
[2025-11-17 12:00:05] ✅ Update complete - Total: 31, Updated: 31, Errors: 0
```

### 4. Install Cron Job
```bash
# Edit crontab
crontab -e

# Add these lines (runs at 6am, 2pm, 10pm daily)
0 6 * * * /root/arti-marketing-ops/scripts/youtube-stats-daily-update.sh
0 14 * * * /root/arti-marketing-ops/scripts/youtube-stats-daily-update.sh
0 22 * * * /root/arti-marketing-ops/scripts/youtube-stats-daily-update.sh

# Verify cron jobs
crontab -l
```

### 5. Verify Logs
```bash
# Watch logs
tail -f /var/log/youtube-stats-update.log

# Check recent updates
tail -20 /var/log/youtube-stats-update.log
```

---

## Database Stats Check

### Current Campaign Counts
```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres << 'EOF'
SELECT 
  status,
  COUNT(*) as total,
  COUNT(current_views) as with_views,
  MAX(last_youtube_api_fetch) as last_updated
FROM youtube_campaigns
GROUP BY status
ORDER BY total DESC;
EOF
```

Expected output:
- **389 complete** campaigns (static, not updated)
- **23 active** campaigns (updated 3x daily)
- **8 pending** campaigns (updated 3x daily)

---

## API Usage

### Update Active/Pending Only (Default - Used by Cron)
```bash
curl -X POST http://localhost:3001/api/youtube-data-api/fetch-all-campaigns \
  -H "Content-Type: application/json" \
  -d '{"orgId":"00000000-0000-0000-0000-000000000001"}'
```

### Update ALL Campaigns (Including Complete - Manual Only)
```bash
curl -X POST http://localhost:3001/api/youtube-data-api/fetch-all-campaigns \
  -H "Content-Type: application/json" \
  -d '{"orgId":"00000000-0000-0000-0000-000000000001","includeComplete":true}'
```

---

## Troubleshooting

### Script Fails to Connect
```bash
# Check API is running
docker ps | grep arti-api
curl http://localhost:3001/healthz

# Check logs
docker compose logs api --tail 50
```

### No Campaigns Updated
```bash
# Verify active/pending campaigns exist
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT COUNT(*) FROM youtube_campaigns WHERE status IN ('active', 'pending');
"
```

### High Error Count
```bash
# Check which campaigns are failing
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT campaign_name, status, youtube_url, youtube_api_error 
FROM youtube_campaigns 
WHERE youtube_api_error IS NOT NULL AND status IN ('active', 'pending');
"
```

---

## Summary

✅ **420 total campaigns** in database
✅ **31 active/pending** campaigns updated 3x daily via cron
✅ **389 complete** campaigns remain static with final stats
✅ Network connection now persistent in docker-compose.yml
✅ Cron job logs to `/var/log/youtube-stats-update.log`

**Next Steps:**
1. Deploy to production
2. Test script manually
3. Install cron job
4. Verify updates are running

