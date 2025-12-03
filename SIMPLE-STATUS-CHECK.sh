#!/bin/bash
# Simple status check for scraper

echo "=== SCRAPER STATUS CHECK ==="
echo ""

echo "1. Most Recent Scrape:"
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT MAX(last_scraped_at) as most_recent_scrape, COUNT(*) FILTER (WHERE last_scraped_at > NOW() - INTERVAL '24 hours') as scraped_last_24h FROM spotify_campaigns WHERE sfa LIKE 'https://artists.spotify.com%';"

echo ""
echo "2. Cron Job:"
crontab -l | grep spotify || echo "No cron job found"

echo ""
echo "3. Last 20 Lines of Production Log:"
tail -20 /root/arti-marketing-ops/spotify_scraper/logs/production.log 2>/dev/null || echo "No log file found"

echo ""
echo "4. Historical Data Count:"
docker exec supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT COUNT(*) as total_records, MAX(scraped_at) as last_save FROM scraped_data;"

echo ""
echo "=== END STATUS CHECK ==="

