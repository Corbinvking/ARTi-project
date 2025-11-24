#!/bin/bash
# Install sqlite3 and check Flask database

set -e

echo "=========================================="
echo "Installing sqlite3 and Checking Flask DB"
echo "=========================================="
echo ""

# Step 1: Install sqlite3
echo "Step 1: Installing sqlite3..."
if command -v sqlite3 >/dev/null 2>&1; then
    echo "✅ sqlite3 already installed"
else
    sudo apt-get update
    sudo apt-get install -y sqlite3
    echo "✅ sqlite3 installed"
fi

# Step 2: Check Flask database
echo ""
echo "Step 2: Checking Flask database..."
FLASK_DB="/opt/ratio-fixer/campaigns.db"

if [ ! -f "$FLASK_DB" ]; then
    echo "❌ Flask database not found at $FLASK_DB"
    echo "Searching for database..."
    find /opt/ratio-fixer -name "*.db" 2>/dev/null
    exit 1
fi

echo "✅ Found Flask database: $FLASK_DB"
ls -lh "$FLASK_DB"

# Step 3: Check campaigns table structure
echo ""
echo "Step 3: Checking campaigns table structure..."
sqlite3 "$FLASK_DB" ".schema campaigns" 2>/dev/null | head -20

# Step 4: Check all campaigns
echo ""
echo "Step 4: All campaigns in Flask database..."
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
    ordered_comments
FROM campaigns
ORDER BY id DESC
LIMIT 10;
SQL

# Step 5: Check for campaigns with orders
echo ""
echo "Step 5: Campaigns with orders placed..."
sqlite3 "$FLASK_DB" << 'SQL'
.mode column
.headers on
SELECT 
    campaign_id,
    video_id,
    ordered_likes,
    ordered_comments,
    status
FROM campaigns
WHERE (ordered_likes > 0 OR ordered_comments > 0)
ORDER BY id DESC;
SQL

# Step 6: Count total orders
echo ""
echo "Step 6: Total orders summary..."
sqlite3 "$FLASK_DB" << 'SQL'
SELECT 
    COUNT(*) as total_campaigns,
    SUM(COALESCE(ordered_likes, 0)) as total_ordered_likes,
    SUM(COALESCE(ordered_comments, 0)) as total_ordered_comments
FROM campaigns;
SQL

# Step 7: Check most recent campaign details
echo ""
echo "Step 7: Most recent campaign details..."
sqlite3 "$FLASK_DB" << 'SQL'
.mode column
.headers on
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
    ordered_comments,
    wait_time,
    minimum_engagement
FROM campaigns
ORDER BY id DESC
LIMIT 1;
SQL

echo ""
echo "=========================================="
echo "Check Complete"
echo "=========================================="
echo ""
echo "If ordered_likes or ordered_comments > 0, orders were placed!"
echo "If both are 0 or NULL, no orders were placed yet."
echo ""

