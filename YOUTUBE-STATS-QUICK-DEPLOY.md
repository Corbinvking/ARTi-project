# YouTube Stats - Quick Deploy (5 Minutes)

## On Local Machine

```bash
# 1. Commit and push
git add -A
git commit -m "Add YouTube stats fetcher for production"
git push origin main
```

## On Production Droplet

```bash
# 2. SSH into droplet
ssh root@artistinfluence.com

# 3. Pull changes
cd /root/arti-marketing-ops
git pull origin main

# 4. Verify YouTube API key exists
grep YOUTUBE_API_KEY apps/api/production.env
# If missing, add it:
# echo "YOUTUBE_API_KEY=AIzaSyCo4D0knKCLCUiUxEl5e4oTwXCAJbEwccg" >> apps/api/production.env

# 5. Restart API to load new env var
docker-compose restart api

# 6. Make scripts executable
chmod +x scripts/fetch-youtube-stats-production.js
chmod +x scripts/youtube-stats-cron.sh

# 7. Test fetch (takes ~45 seconds for 420 campaigns)
node scripts/fetch-youtube-stats-production.js

# 8. Set up cron job (runs at 8am, 2pm, 8pm daily)
crontab -e
# Add this line:
# 0 8,14,20 * * * /root/arti-marketing-ops/scripts/youtube-stats-cron.sh
# Save and exit

# 9. Verify cron
crontab -l
```

## Verify It Worked

```bash
# Check database
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT COUNT(*) as total, 
       COUNT(current_views) as with_views,
       MAX(last_youtube_api_fetch) as last_fetch
FROM youtube_campaigns;
"

# Should show:
#  total | with_views |       last_fetch        
# -------+------------+-------------------------
#    420 |        420 | 2025-11-17 12:34:56
```

## Check Frontend

1. Go to: https://app.artistinfluence.com/youtube/campaigns
2. Hard refresh: Ctrl+Shift+R
3. You should now see:
   - ✅ View count progress bars filled
   - ✅ Likes and comments columns populated
   - ✅ Client campaigns showing view counts
   - ✅ "Last updated: X minutes ago"

## Monitor Logs

```bash
# View latest cron run
tail -100 logs/youtube-stats/fetch-*.log

# Watch live (during next cron run)
tail -f logs/youtube-stats/fetch-*.log
```

## Manual Refresh Anytime

```bash
cd /root/arti-marketing-ops
node scripts/fetch-youtube-stats-production.js
```

---

**That's it!** Stats will auto-update 3x daily at 8am, 2pm, and 8pm.

See **YOUTUBE-STATS-DEPLOYMENT.md** for detailed docs.

