#!/bin/bash
# Check Flask database and diagnose the "No comments left" issue

set -e

echo "=========================================="
echo "Flask Database Check & Comments Issue Fix"
echo "=========================================="
echo ""

FLASK_DB="/opt/ratio-fixer/campaigns.db"

# Step 1: Check Flask database location
echo "Step 1: Finding Flask database..."
if [ -f "$FLASK_DB" ]; then
    echo "✅ Found at: $FLASK_DB"
elif [ -f "/opt/ratio-fixer/campaigns.db" ]; then
    FLASK_DB="/opt/ratio-fixer/campaigns.db"
    echo "✅ Found at: $FLASK_DB"
else
    echo "⚠️  Database not found, searching..."
    find /opt/ratio-fixer -name "*.db" 2>/dev/null
    FLASK_DB=$(find /opt/ratio-fixer -name "*.db" 2>/dev/null | head -1)
    if [ -z "$FLASK_DB" ]; then
        echo "❌ Could not find Flask database"
        exit 1
    fi
fi

# Step 2: Check campaigns in Flask database
echo ""
echo "Step 2: Checking campaigns in Flask database..."
sqlite3 "$FLASK_DB" << 'SQL'
.mode column
.headers on
SELECT 
    campaign_id,
    video_id,
    status,
    views,
    likes,
    comments,
    desired_likes,
    desired_comments,
    ordered_likes,
    ordered_comments,
    datetime(created_at, 'localtime') as created
FROM campaigns
ORDER BY id DESC
LIMIT 5;
SQL

# Step 3: Check the "No comments left" issue
echo ""
echo "Step 3: Diagnosing 'No comments left' issue..."
echo ""
echo "From the logs, the issue is:"
echo "  - Loaded 0 comments from the Google Sheet"
echo "  - All 249 comments are marked as 'Used'"
echo ""
echo "This means the Google Sheet has no available comments."
echo ""
echo "Solution:"
echo "1. Open the Google Sheet: https://docs.google.com/spreadsheets/d/1rQVZYIpoYondBniF6oDnTE7eWJ4SslJ_YbTn0RsfXXk"
echo "2. Clear the 'Used' column (column B) for comments you want to reuse"
echo "3. Or add new comments to the sheet"
echo ""

# Step 4: Check if Flask tracks orders in its database
echo ""
echo "Step 4: Checking if Flask tracks orders..."
echo "Flask stores ordered_likes and ordered_comments in the campaigns table."
echo "These are updated as orders are placed."
echo ""

# Step 5: Check recent campaign for ordered counts
echo ""
echo "Step 5: Checking most recent campaign for orders..."
RECENT_CAMPAIGN=$(sqlite3 "$FLASK_DB" "SELECT campaign_id FROM campaigns ORDER BY id DESC LIMIT 1;" 2>/dev/null)

if [ -n "$RECENT_CAMPAIGN" ]; then
    echo "Recent campaign ID: $RECENT_CAMPAIGN"
    sqlite3 "$FLASK_DB" << SQL
SELECT 
    video_id,
    ordered_likes,
    ordered_comments,
    status
FROM campaigns
WHERE campaign_id = '${RECENT_CAMPAIGN}';
SQL
fi

# Step 6: Explain the database situation
echo ""
echo "=========================================="
echo "Database Architecture Explanation"
echo "=========================================="
echo ""
echo "⚠️  IMPORTANT: Flask uses its own SQLite database!"
echo ""
echo "Flask Database: /opt/ratio-fixer/campaigns.db"
echo "  - Stores campaigns with ordered_likes/ordered_comments"
echo "  - This is where orders are tracked"
echo ""
echo "Supabase Database: youtube_ratio_fixer_orders table"
echo "  - Currently NOT being populated by Flask"
echo "  - Would need integration code to sync Flask → Supabase"
echo ""
echo "Current Status:"
echo "  - Orders are tracked in Flask's SQLite database"
echo "  - Supabase table is empty (expected - not integrated yet)"
echo "  - Frontend gets status from Flask API, which reads Flask DB"
echo ""

# Step 7: Check if we need to sync Flask → Supabase
echo ""
echo "Step 7: Checking if we should sync Flask orders to Supabase..."
echo "To sync orders to Supabase, we would need to:"
echo "1. Modify Flask to write to Supabase when orders are placed"
echo "2. Or create a sync script that reads Flask DB and writes to Supabase"
echo ""
echo "For now, orders are visible via:"
echo "  - Flask API status endpoint (returns ordered_likes/ordered_comments)"
echo "  - Flask database directly"
echo ""

# Step 8: Fix the comments issue
echo ""
echo "=========================================="
echo "Fixing 'No Comments Left' Issue"
echo "=========================================="
echo ""
echo "The Google Sheet has all comments marked as 'Used'."
echo ""
echo "To fix this, you need to:"
echo ""
echo "Option 1: Reset the 'Used' column"
echo "  1. Open: https://docs.google.com/spreadsheets/d/1rQVZYIpoYondBniF6oDnTE7eWJ4SslJ_YbTn0RsfXXk"
echo "  2. Select column B (the 'Used' column)"
echo "  3. Clear all values or set them to empty"
echo "  4. This will make all comments available again"
echo ""
echo "Option 2: Add new comments"
echo "  1. Add new comment rows to the sheet"
echo "  2. Leave the 'Used' column empty for new comments"
echo ""
echo "After fixing the sheet, restart the campaign from the frontend."
echo ""

