#!/bin/bash
# Instagram Scraper Status Check Script
# Displays current status of the Instagram scraper system

echo "=== Instagram Scraper Status ==="
echo ""

API_URL="${API_URL:-http://localhost:3001}"
DB_CONTAINER="${DB_CONTAINER:-supabase_db_arti-marketing-ops}"

# 1. API Health Check
echo "📡 API Health Check:"
if curl -s "${API_URL}/health" > /dev/null 2>&1; then
    echo "   ✅ API is running at ${API_URL}"
else
    echo "   ❌ API is NOT running at ${API_URL}"
fi
echo ""

# 2. Campaign Statistics
echo "📊 Campaign Statistics:"
CAMPAIGNS=$(curl -s "${API_URL}/api/instagram-scraper/campaigns" 2>/dev/null)
if [ -n "$CAMPAIGNS" ]; then
    echo "$CAMPAIGNS" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        stats = data['data']['stats']
        campaigns = data['data']['campaigns']
        print(f\"   Total campaigns: {stats['total']}\")
        print(f\"   Scraper enabled: {stats['scraperEnabled']}\")
        print(f\"   With Instagram URL: {stats['withInstagramUrl']}\")
        
        # Show recently scraped
        scraped = [c for c in campaigns if c.get('last_scraped_at')]
        if scraped:
            print(f'')
            print(f'   Recently scraped campaigns:')
            for c in scraped[:5]:
                name = c.get('campaign', f\"Campaign {c['id']}\")
                print(f\"   - [{c['id']}] {name}: {c['last_scraped_at']}\")
    else:
        print(f\"   Error: {data.get('error', 'Unknown error')}\")
except Exception as e:
    print(f'   Failed to parse response: {e}')
" 2>/dev/null
else
    echo "   ⚠️  Could not fetch campaign statistics"
fi
echo ""

# 3. Database Post Count
echo "📦 Database Statistics:"
if docker exec -i $DB_CONTAINER psql -U postgres -d postgres -t -c "
SELECT 
    'Total posts: ' || COUNT(*)::text || E'\n' ||
    'Unique campaigns with posts: ' || COUNT(DISTINCT campaign_id)::text || E'\n' ||
    'Most recent post: ' || COALESCE(MAX(created_at)::text, 'N/A')
FROM instagram_posts;
" 2>/dev/null; then
    :
else
    echo "   ⚠️  Could not query database (check container name: $DB_CONTAINER)"
fi
echo ""

# 4. Cron Job Status
echo "⏰ Cron Job Status:"
if crontab -l 2>/dev/null | grep -q "instagram_scraper"; then
    echo "   ✅ Cron job is configured:"
    crontab -l 2>/dev/null | grep "instagram_scraper" | while read line; do
        echo "      $line"
    done
else
    echo "   ⚠️  No cron job configured for instagram_scraper"
    echo ""
    echo "   To set up cron job:"
    echo "   crontab -e"
    echo "   # Add: 0 3 * * * /root/arti-marketing-ops/instagram_scraper/run_instagram_scraper.sh >> /var/log/instagram_scraper.log 2>&1"
fi
echo ""

# 5. Recent Logs
LOG_FILE="/var/log/instagram_scraper.log"
echo "📜 Recent Logs (last 10 lines):"
if [ -f "$LOG_FILE" ]; then
    tail -10 "$LOG_FILE" | while read line; do
        echo "   $line"
    done
else
    echo "   ⚠️  Log file not found: $LOG_FILE"
fi
echo ""

echo "=== Status Check Complete ==="

