#!/bin/bash
# Verify YouTube campaigns in production database

echo "🔍 Checking YouTube campaigns in production database..."
echo ""

# Count campaigns
echo "📊 Campaign counts:"
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  COUNT(*) as total_campaigns,
  COUNT(DISTINCT client_id) as total_clients,
  COUNT(*) FILTER (WHERE status = 'active') as active_campaigns,
  COUNT(*) FILTER (WHERE status = 'complete') as complete_campaigns
FROM youtube_campaigns;
"

echo ""
echo "👥 Top 10 clients by campaign count:"
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  c.name as client_name,
  COUNT(yc.id) as campaign_count
FROM youtube_campaigns yc
JOIN youtube_clients c ON yc.client_id = c.id
GROUP BY c.name
ORDER BY campaign_count DESC
LIMIT 10;
"

echo ""
echo "📈 Sample campaigns:"
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  campaign_name,
  status,
  goal_views,
  current_views
FROM youtube_campaigns
ORDER BY created_at DESC
LIMIT 5;
"

