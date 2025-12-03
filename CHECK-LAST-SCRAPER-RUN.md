# Check Last Full Scraper Run

## Quick Commands

### Check Most Recent Scrape Times
```bash
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
    MAX(last_scraped_at) as most_recent_scrape,
    COUNT(*) FILTER (WHERE last_scraped_at > NOW() - INTERVAL '24 hours') as scraped_last_24h,
    COUNT(*) FILTER (WHERE last_scraped_at > NOW() - INTERVAL '7 days') as scraped_last_7d,
    COUNT(*) as total_with_sfa_urls
FROM spotify_campaigns
WHERE sfa LIKE 'https://artists.spotify.com%';
"
```

---

### Check Scraper Logs
```bash
# Check production log
tail -50 /root/arti-marketing-ops/spotify_scraper/logs/production.log
```

Or for specific date:
```bash
# Today's log
cat /root/arti-marketing-ops/spotify_scraper/logs/scraper_$(date +%Y%m%d).log

# Yesterday's log
cat /root/arti-marketing-ops/spotify_scraper/logs/scraper_$(date -d yesterday +%Y%m%d).log
```

---

### Check Cron Job Status
```bash
# Is cron running?
systemctl status cron

# View cron job
crontab -l | grep spotify

# Check system cron logs
grep spotify /var/log/syslog | tail -20
```

---

### View Recent Scraper Activity
```bash
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
    campaign,
    artist_name,
    last_scraped_at,
    streams_24h,
    streams_7d,
    CASE 
        WHEN last_scraped_at > NOW() - INTERVAL '2 hours' THEN '🟢 Just now'
        WHEN last_scraped_at > NOW() - INTERVAL '24 hours' THEN '🟡 Today'
        WHEN last_scraped_at > NOW() - INTERVAL '7 days' THEN '🟠 This week'
        ELSE '🔴 Older'
    END as status
FROM spotify_campaigns
WHERE sfa LIKE 'https://artists.spotify.com%'
ORDER BY last_scraped_at DESC NULLS LAST
LIMIT 20;
"
```

---

### Check if Cron is Scheduled Correctly
```bash
# View the cron job
crontab -l

# Expected output:
# 0 2 * * * cd /root/arti-marketing-ops && bash spotify_scraper/run_production_scraper.sh
```

---

### Check Historical Data Table
```bash
# How many historical records exist?
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT artist_name) as unique_artists,
    MIN(scraped_at) as first_scrape,
    MAX(scraped_at) as last_scrape,
    DATE(MAX(scraped_at)) as last_scrape_date
FROM scraped_data;
"
```

---

## Quick Copy-Paste to Check Everything

```bash
echo "=== LAST FULL SCRAPER RUN STATUS ==="
echo ""

echo "1. Most Recent Scrapes:"
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
    MAX(last_scraped_at) as most_recent_scrape,
    COUNT(*) FILTER (WHERE last_scraped_at > NOW() - INTERVAL '24 hours') as scraped_last_24h
FROM spotify_campaigns
WHERE sfa LIKE 'https://artists.spotify.com%';
"

echo ""
echo "2. Cron Job:"
crontab -l | grep spotify

echo ""
echo "3. Recent Log Entries:"
tail -20 /root/arti-marketing-ops/spotify_scraper/logs/production.log

echo ""
echo "4. Historical Records:"
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT COUNT(*) as total, MAX(scraped_at) as last FROM scraped_data;
"
```

---

## Understanding the Output

### Most Recent Scrape Time
- **< 2 hours ago** = Just ran (or currently running)
- **~2 AM UTC time** = Last cron job ran successfully
- **> 24 hours ago** = Cron may not be running

### Cron Schedule
```
0 2 * * * = Every day at 2:00 AM UTC
```

**UTC to your timezone:**
- 2 AM UTC = 9 PM EST (previous day)
- 2 AM UTC = 6 PM PST (previous day)

### What to Look For

✅ **Good:**
- Most recent scrape within last 24 hours
- Multiple campaigns scraped in last 24h
- Historical data records growing

❌ **Problem:**
- No scrapes in last 24 hours
- Most recent scrape is old (>2 days)
- No new historical records

---

**Run the quick copy-paste command to see full status!**

