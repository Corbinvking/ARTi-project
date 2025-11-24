#!/bin/bash
# Monitor Ratio Fixer activity to verify it's working

set -e

echo "=========================================="
echo "Ratio Fixer Activity Monitor"
echo "=========================================="
echo ""

# Step 1: Check Flask service status
echo "Step 1: Checking Flask service status..."
if systemctl is-active --quiet ratio-fixer; then
    echo "✅ Flask service is running"
    systemctl status ratio-fixer --no-pager | head -5
else
    echo "⚠️  Flask service is not running"
fi

# Step 2: Check Flask logs for recent activity
echo ""
echo "Step 2: Checking Flask logs for recent activity (last 50 lines)..."
if [ -f "/var/log/ratio-fixer/ratio-fixer.log" ]; then
    sudo tail -50 /var/log/ratio-fixer/ratio-fixer.log | grep -E "campaign|order|Video ID|Current|Desired|Ordered" | tail -20 || echo "No recent activity in logs"
elif journalctl -u ratio-fixer >/dev/null 2>&1; then
    sudo journalctl -u ratio-fixer -n 50 --no-pager | grep -E "campaign|order|Video ID|Current|Desired|Ordered" | tail -20 || echo "No recent activity in logs"
else
    echo "⚠️  Could not find Flask logs"
fi

# Step 3: Check database for campaigns with Ratio Fixer running
echo ""
echo "Step 3: Checking database for active Ratio Fixer campaigns..."
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
    campaign_name,
    ratio_fixer_campaign_id,
    ratio_fixer_status,
    desired_likes,
    desired_comments,
    ordered_likes,
    ordered_comments,
    ratio_fixer_last_check
FROM youtube_campaigns
WHERE ratio_fixer_status = 'running'
ORDER BY ratio_fixer_started_at DESC
LIMIT 10;
" 2>/dev/null || echo "Could not query database"

# Step 4: Check for recent orders in database
echo ""
echo "Step 4: Checking for recent orders..."
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
    order_type,
    quantity,
    jingle_order_id,
    jingle_status,
    ordered_at
FROM youtube_ratio_fixer_orders
ORDER BY ordered_at DESC
LIMIT 10;
" 2>/dev/null || echo "Could not query orders table"

# Step 5: Test Flask API directly
echo ""
echo "Step 5: Testing Flask API health..."
FLASK_URL="http://164.90.129.146:5000"
curl -s -H "X-API-Key: ${RATIO_FIXER_API_KEY:-5f1c6f51dd6430beac6746467593e99b75b924ae1cde6b7f0943edef30d328c7}" \
  "${FLASK_URL}/healthz" | jq . 2>/dev/null || echo "Flask health check failed"

# Step 6: Get list of active campaigns from Flask
echo ""
echo "Step 6: Checking Flask for active campaigns..."
# Note: This requires an endpoint that lists campaigns - may not exist
# We'll check the database instead

# Step 7: Check if Flask is making API calls to JingleSMM
echo ""
echo "Step 7: Checking for JingleSMM API activity..."
# Check Flask logs for JingleSMM API calls
if [ -f "/var/log/ratio-fixer/ratio-fixer.log" ]; then
    echo "Recent JingleSMM API calls:"
    sudo tail -100 /var/log/ratio-fixer/ratio-fixer.log | grep -i "jingle\|order\|api" | tail -10 || echo "No JingleSMM activity found"
fi

# Step 8: Check campaign status via API
echo ""
echo "Step 8: Checking campaign status via API..."
# Get a running campaign ID from database
CAMPAIGN_ID=$(docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -t -c "
SELECT ratio_fixer_campaign_id 
FROM youtube_campaigns 
WHERE ratio_fixer_status = 'running' 
LIMIT 1;
" 2>/dev/null | xargs)

if [ -n "$CAMPAIGN_ID" ] && [ "$CAMPAIGN_ID" != "" ]; then
    echo "Found running campaign ID: $CAMPAIGN_ID"
    echo "Fetching status..."
    curl -s -H "X-API-Key: ${RATIO_FIXER_API_KEY:-5f1c6f51dd6430beac6746467593e99b75b924ae1cde6b7f0943edef30d328c7}" \
      "${FLASK_URL}/api/campaign_status/${CAMPAIGN_ID}" | jq . 2>/dev/null || echo "Could not fetch status"
else
    echo "No running campaigns found in database"
fi

# Step 9: Summary
echo ""
echo "=========================================="
echo "Monitoring Summary"
echo "=========================================="
echo ""
echo "To verify Ratio Fixer is working, check:"
echo "1. ✅ Flask service is running"
echo "2. ✅ Flask logs show activity (Video ID, Current/Desired stats, Orders)"
echo "3. ✅ Database shows campaigns with ratio_fixer_status = 'running'"
echo "4. ✅ Database shows orders in youtube_ratio_fixer_orders table"
echo "5. ✅ Status API returns current stats with ordered_likes/ordered_comments"
echo ""
echo "In the frontend, you should see:"
echo "- 'Ratio Fixer Active' badge with spinning loader"
echo "- Target Likes/Comments values"
echo "- Ordered Likes/Comments values (should increase over time)"
echo "- Status updates every 30 seconds"
echo ""

