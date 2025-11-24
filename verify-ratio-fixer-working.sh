#!/bin/bash
# Quick verification script to check if Ratio Fixer is working

set -e

echo "=========================================="
echo "Ratio Fixer Activity Verification"
echo "=========================================="
echo ""

# Step 1: Check Flask service
echo "Step 1: Checking Flask service..."
if systemctl is-active --quiet ratio-fixer; then
    echo "✅ Flask service is running"
else
    echo "❌ Flask service is NOT running"
    exit 1
fi

# Step 2: Get a running campaign
echo ""
echo "Step 2: Finding active Ratio Fixer campaigns..."
ACTIVE_CAMPAIGN=$(docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -t -c "
SELECT 
    c.id::text || '|' || 
    c.campaign_name || '|' || 
    COALESCE(c.ratio_fixer_campaign_id, '') || '|' || 
    COALESCE(c.ratio_fixer_status, '') || '|' || 
    COALESCE(c.ordered_likes::text, '0') || '|' || 
    COALESCE(c.ordered_comments::text, '0')
FROM youtube_campaigns c
WHERE c.ratio_fixer_status = 'running'
ORDER BY c.ratio_fixer_started_at DESC
LIMIT 1;
" 2>/dev/null | xargs)

if [ -z "$ACTIVE_CAMPAIGN" ] || [ "$ACTIVE_CAMPAIGN" = "" ]; then
    echo "⚠️  No active Ratio Fixer campaigns found"
    echo ""
    echo "To start a campaign:"
    echo "1. Go to a campaign in the frontend"
    echo "2. Click 'Ratio Fixer' tab"
    echo "3. Configure and click 'Start Automated Ratio Fixer'"
    exit 0
fi

# Parse campaign info
IFS='|' read -r CAMPAIGN_ID CAMPAIGN_NAME FLASK_CAMPAIGN_ID STATUS ORDERED_LIKES ORDERED_COMMENTS <<< "$ACTIVE_CAMPAIGN"

echo "✅ Found active campaign:"
echo "   Campaign: $CAMPAIGN_NAME"
echo "   Flask Campaign ID: $FLASK_CAMPAIGN_ID"
echo "   Status: $STATUS"
echo "   Ordered Likes: $ORDERED_LIKES"
echo "   Ordered Comments: $ORDERED_COMMENTS"

# Step 3: Check Flask status API
echo ""
echo "Step 3: Checking Flask status API..."
if [ -n "$FLASK_CAMPAIGN_ID" ] && [ "$FLASK_CAMPAIGN_ID" != "" ]; then
    FLASK_STATUS=$(curl -s -H "X-API-Key: 5f1c6f51dd6430beac6746467593e99b75b924ae1cde6b7f0943edef30d328c7" \
      "http://164.90.129.146:5000/api/campaign_status/${FLASK_CAMPAIGN_ID}" 2>/dev/null)
    
    if echo "$FLASK_STATUS" | grep -q "views"; then
        echo "✅ Flask API responding"
        echo "$FLASK_STATUS" | jq . 2>/dev/null || echo "$FLASK_STATUS"
        
        # Check if ordered counts are in response
        if echo "$FLASK_STATUS" | grep -q "ordered_likes\|ordered_comments"; then
            echo "✅ Status includes ordered counts"
        else
            echo "⚠️  Status does not include ordered counts (may need endpoint update)"
        fi
    else
        echo "⚠️  Flask API error:"
        echo "$FLASK_STATUS" | head -5
    fi
else
    echo "⚠️  No Flask campaign ID found"
fi

# Step 4: Check Flask logs for activity
echo ""
echo "Step 4: Checking Flask logs for recent activity (last 2 minutes)..."
RECENT_LOGS=$(sudo journalctl -u ratio-fixer --since "2 minutes ago" --no-pager 2>/dev/null || sudo tail -50 /var/log/ratio-fixer/ratio-fixer.log 2>/dev/null || echo "")

if [ -n "$RECENT_LOGS" ]; then
    echo "Recent log entries:"
    echo "$RECENT_LOGS" | grep -E "Video ID|Current|Desired|Ordered|Ordering|order" | tail -10 || echo "No relevant activity in logs"
    
    # Check for order activity
    if echo "$RECENT_LOGS" | grep -qi "order"; then
        echo ""
        echo "✅ Found order activity in logs!"
    else
        echo ""
        echo "⚠️  No order activity in recent logs"
        echo "   (This is normal if ratios are already met or waiting for next cycle)"
    fi
else
    echo "⚠️  Could not access Flask logs"
fi

# Step 5: Check for recent database orders
echo ""
echo "Step 5: Checking for recent orders in database..."
RECENT_ORDERS=$(docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
    order_type,
    quantity,
    jingle_order_id,
    ordered_at
FROM youtube_ratio_fixer_orders
WHERE campaign_id = '${CAMPAIGN_ID}'
ORDER BY ordered_at DESC
LIMIT 5;
" 2>/dev/null)

if echo "$RECENT_ORDERS" | grep -q "likes\|comments"; then
    echo "✅ Found recent orders:"
    echo "$RECENT_ORDERS"
else
    echo "⚠️  No orders found in database yet"
    echo "   (Orders may not have been placed yet, or table needs to be populated)"
fi

# Step 6: Summary and recommendations
echo ""
echo "=========================================="
echo "Verification Summary"
echo "=========================================="
echo ""
echo "✅ Working indicators:"
echo "   - Flask service running"
echo "   - Campaign status = 'running'"
echo "   - Flask API responding"
echo ""
echo "📊 Monitor these values:"
echo "   - ordered_likes: Should increase when orders are placed"
echo "   - ordered_comments: Should increase when orders are placed"
echo "   - Flask logs: Should show 'Ordering' messages"
echo ""
echo "⏱️  Timing:"
echo "   - Orders are placed in cycles (default: every 36 seconds)"
echo "   - Frontend polls status every 30 seconds"
echo "   - Check again in 1-2 minutes to see if counts increase"
echo ""
echo "🔍 To monitor in real-time:"
echo "   sudo journalctl -u ratio-fixer -f"
echo ""
