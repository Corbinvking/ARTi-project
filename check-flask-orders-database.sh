#!/bin/bash
# Check Flask's SQLite database for orders and campaigns

set -e

echo "=========================================="
echo "Checking Flask Orders Database"
echo "=========================================="
echo ""

FLASK_DB="/opt/ratio-fixer/campaigns.db"

# Step 1: Check if Flask database exists
echo "Step 1: Checking Flask database..."
if [ -f "$FLASK_DB" ]; then
    echo "✅ Flask database found at: $FLASK_DB"
    ls -lh "$FLASK_DB"
else
    echo "⚠️  Flask database not found at $FLASK_DB"
    echo "Searching for database..."
    find /opt/ratio-fixer -name "*.db" 2>/dev/null | head -5
    exit 1
fi

# Step 2: Check campaigns in Flask database
echo ""
echo "Step 2: Checking campaigns in Flask database..."
sqlite3 "$FLASK_DB" << 'SQL'
SELECT 
    campaign_id,
    video_id,
    video_title,
    status,
    views,
    likes,
    comments,
    desired_likes,
    desired_comments,
    ordered_likes,
    ordered_comments
FROM campaigns
ORDER BY id DESC
LIMIT 10;
SQL

# Step 3: Check if there's an orders table
echo ""
echo "Step 3: Checking for orders table..."
sqlite3 "$FLASK_DB" ".tables" | grep -i order || echo "No orders table found"

# Step 4: Check Flask logs for order activity
echo ""
echo "Step 4: Checking Flask logs for order activity..."
sudo journalctl -u ratio-fixer --since "1 hour ago" --no-pager | grep -i "order\|jingle" | tail -20 || echo "No order activity in logs"

# Step 5: Check current campaign status
echo ""
echo "Step 5: Checking current campaign status from Flask..."
RECENT_CAMPAIGN=$(sqlite3 "$FLASK_DB" "SELECT campaign_id FROM campaigns ORDER BY id DESC LIMIT 1;" 2>/dev/null)

if [ -n "$RECENT_CAMPAIGN" ]; then
    echo "Most recent campaign ID: $RECENT_CAMPAIGN"
    
    # Get status via API
    echo ""
    echo "Fetching status from Flask API..."
    curl -s -H "X-API-Key: 5f1c6f51dd6430beac6746467593e99b75b924ae1cde6b7f0943edef30d328c7" \
      "http://164.90.129.146:5000/api/campaign_status/${RECENT_CAMPAIGN}" | jq . 2>/dev/null || echo "Could not fetch status"
fi

# Step 6: Check Supabase for campaign tracking
echo ""
echo "Step 6: Checking Supabase for campaign tracking..."
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
    campaign_name,
    ratio_fixer_campaign_id,
    ratio_fixer_status,
    ordered_likes,
    ordered_comments,
    ratio_fixer_started_at
FROM youtube_campaigns
WHERE ratio_fixer_campaign_id IS NOT NULL
ORDER BY ratio_fixer_started_at DESC
LIMIT 5;
" 2>/dev/null || echo "Could not query Supabase"

# Step 7: Summary
echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""
echo "Flask uses SQLite database: $FLASK_DB"
echo "Supabase tracks campaign status but orders are in Flask DB"
echo ""
echo "To see orders, check:"
echo "1. Flask database: sqlite3 $FLASK_DB 'SELECT * FROM campaigns;'"
echo "2. Flask logs: sudo journalctl -u ratio-fixer -f"
echo "3. Campaign ordered_likes/ordered_comments columns in Flask DB"
echo ""

