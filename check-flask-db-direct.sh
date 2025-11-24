#!/bin/bash
# Check Flask database directly, handling apt issues

set -e

echo "=========================================="
echo "Checking Flask Database for Orders"
echo "=========================================="
echo ""

# Step 1: Try to install sqlite3 (ignore PPA errors)
echo "Step 1: Installing sqlite3..."
sudo apt-get update 2>&1 | grep -v "ppa.launchpadcontent.net" || true
sudo apt-get install -y sqlite3 2>/dev/null || {
    echo "⚠️  Could not install via apt, trying alternative..."
    # Try to use Python to read SQLite
    if command -v python3 >/dev/null 2>&1; then
        echo "✅ Will use Python to read database"
    else
        echo "❌ Need sqlite3 or Python3 to read database"
        exit 1
    fi
}

# Step 2: Check Flask database
echo ""
echo "Step 2: Checking Flask database..."
FLASK_DB="/opt/ratio-fixer/campaigns.db"

if [ ! -f "$FLASK_DB" ]; then
    echo "❌ Flask database not found at $FLASK_DB"
    exit 1
fi

echo "✅ Found Flask database: $FLASK_DB"
ls -lh "$FLASK_DB"

# Step 3: Query database
echo ""
echo "Step 3: Querying campaigns from Flask database..."

if command -v sqlite3 >/dev/null 2>&1; then
    echo ""
    echo "All campaigns:"
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

    echo ""
    echo "Campaigns with orders:"
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

    echo ""
    echo "Total orders summary:"
    sqlite3 "$FLASK_DB" << 'SQL'
SELECT 
    COUNT(*) as total_campaigns,
    SUM(COALESCE(ordered_likes, 0)) as total_ordered_likes,
    SUM(COALESCE(ordered_comments, 0)) as total_ordered_comments
FROM campaigns;
SQL

else
    # Use Python to read SQLite
    echo ""
    echo "Using Python to read database..."
    python3 << PYTHON_SCRIPT
import sqlite3
import sys

db_path = "/opt/ratio-fixer/campaigns.db"
try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get all campaigns
    print("\nAll campaigns:")
    cursor.execute("""
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
        LIMIT 10
    """)
    
    rows = cursor.fetchall()
    if rows:
        print(f"{'Campaign ID':<40} {'Video ID':<15} {'Status':<10} {'Ordered Likes':<15} {'Ordered Comments':<15}")
        print("-" * 100)
        for row in rows:
            print(f"{row[0]:<40} {row[1]:<15} {row[2]:<10} {row[8] or 0:<15} {row[9] or 0:<15}")
    else:
        print("No campaigns found")
    
    # Get campaigns with orders
    print("\nCampaigns with orders:")
    cursor.execute("""
        SELECT 
            campaign_id,
            video_id,
            ordered_likes,
            ordered_comments,
            status
        FROM campaigns
        WHERE (ordered_likes > 0 OR ordered_comments > 0)
        ORDER BY id DESC
    """)
    
    rows = cursor.fetchall()
    if rows:
        print(f"{'Campaign ID':<40} {'Video ID':<15} {'Ordered Likes':<15} {'Ordered Comments':<15} {'Status':<10}")
        print("-" * 100)
        for row in rows:
            print(f"{row[0]:<40} {row[1]:<15} {row[2] or 0:<15} {row[3] or 0:<15} {row[4]:<10}")
    else:
        print("No campaigns with orders found")
    
    # Get totals
    print("\nTotal orders summary:")
    cursor.execute("""
        SELECT 
            COUNT(*) as total_campaigns,
            SUM(COALESCE(ordered_likes, 0)) as total_ordered_likes,
            SUM(COALESCE(ordered_comments, 0)) as total_ordered_comments
        FROM campaigns
    """)
    
    totals = cursor.fetchone()
    print(f"Total campaigns: {totals[0]}")
    print(f"Total ordered likes: {totals[1] or 0}")
    print(f"Total ordered comments: {totals[2] or 0}")
    
    conn.close()
except Exception as e:
    print(f"Error reading database: {e}")
    sys.exit(1)
PYTHON_SCRIPT
fi

echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""
echo "✅ If ordered_likes or ordered_comments > 0, orders WERE placed!"
echo "⚠️  If both are 0 or NULL, no orders were placed yet"
echo ""
echo "Note: The Supabase youtube_ratio_fixer_orders table is empty because"
echo "      Flask uses its own SQLite database and doesn't sync to Supabase."
echo ""

