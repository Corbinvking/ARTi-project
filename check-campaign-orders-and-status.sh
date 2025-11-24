#!/bin/bash
# Check campaign orders and current status

set -e

echo "=========================================="
echo "Checking Campaign Orders & Status"
echo "=========================================="
echo ""

FLASK_DB="/opt/ratio-fixer/campaigns.db"
FLASK_CAMPAIGN_ID="e2a380af-d5da-4719-b40d-b5e738e67a47"

# Step 1: Check database for the campaign
echo "Step 1: Checking database for campaign $FLASK_CAMPAIGN_ID..."
python3 << 'PYTHON'
import sqlite3

db_path = "/opt/ratio-fixer/campaigns.db"
campaign_id = "e2a380af-d5da-4719-b40d-b5e738e67a47"

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
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
        FROM campaign_model
        WHERE campaign_id = ?
    """, (campaign_id,))
    
    row = cursor.fetchone()
    if row:
        print("✅ Campaign found in database:")
        print(f"   Campaign ID: {row[0]}")
        print(f"   Video ID: {row[1]}")
        print(f"   Status: {row[2]}")
        print(f"   Views: {row[3]}")
        print(f"   Likes: {row[4]}")
        print(f"   Comments: {row[5]}")
        print(f"   Desired Likes: {row[6]}")
        print(f"   Desired Comments: {row[7]}")
        print(f"   Ordered Likes: {row[8] or 0}")
        print(f"   Ordered Comments: {row[9] or 0}")
    else:
        print("⚠️  Campaign NOT in database")
        print("   It may have been created but not persisted, or rolled back")
    
    # Check all campaigns
    cursor.execute("SELECT COUNT(*) FROM campaign_model")
    count = cursor.fetchone()[0]
    print(f"\nTotal campaigns in database: {count}")
    
    if count > 0:
        print("\nAll campaigns:")
        cursor.execute("""
            SELECT campaign_id, video_id, status, ordered_likes, ordered_comments
            FROM campaign_model
            ORDER BY id DESC
        """)
        for row in cursor.fetchall():
            print(f"  {row[0][:8]}... | {row[1]} | {row[2]} | Ordered: {row[3] or 0}L/{row[4] or 0}C")
    
    conn.close()
except Exception as e:
    print(f"Error: {e}")
PYTHON

# Step 2: Check Flask API for campaign status
echo ""
echo "Step 2: Checking Flask API for campaign status..."
FLASK_STATUS=$(curl -s -H "X-API-Key: 5f1c6f51dd6430beac6746467593e99b75b924ae1cde6b7f0943edef30d328c7" \
  "http://164.90.129.146:5000/api/campaign_status/${FLASK_CAMPAIGN_ID}" 2>/dev/null)

if echo "$FLASK_STATUS" | grep -q "views"; then
    echo "✅ Campaign is active in Flask (in memory):"
    echo "$FLASK_STATUS" | jq . 2>/dev/null || echo "$FLASK_STATUS"
    
    # Extract ordered counts
    ORDERED_LIKES=$(echo "$FLASK_STATUS" | jq -r '.ordered_likes // 0' 2>/dev/null || echo "0")
    ORDERED_COMMENTS=$(echo "$FLASK_STATUS" | jq -r '.ordered_comments // 0' 2>/dev/null || echo "0")
    
    echo ""
    echo "Ordered counts:"
    echo "  Likes: $ORDERED_LIKES"
    echo "  Comments: $ORDERED_COMMENTS"
    
    if [ "$ORDERED_LIKES" != "0" ] || [ "$ORDERED_COMMENTS" != "0" ]; then
        echo ""
        echo "✅✅✅ ORDERS WERE PLACED! ✅✅✅"
    else
        echo ""
        echo "⚠️  No orders placed yet (or campaign stopped before ordering)"
    fi
else
    echo "⚠️  Campaign not found in Flask (may have stopped)"
    echo "Response: $FLASK_STATUS"
fi

# Step 3: Check Flask logs for order activity
echo ""
echo "Step 3: Checking Flask logs for order activity..."
sudo journalctl -u ratio-fixer --since "1 hour ago" --no-pager | grep -E "Ordering|order|Jingle|ordered_likes|ordered_comments" | tail -20 || echo "No order activity in logs"

# Step 4: Check why campaign stopped
echo ""
echo "Step 4: Checking why campaign stopped..."
sudo journalctl -u ratio-fixer --since "1 hour ago" --no-pager | grep -A 5 -B 5 "e2a380af-d5da-4719-b40d-b5e738e67a47\|vRyhpKOyquY\|No comments" | tail -30

# Step 5: Summary
echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""
echo "To verify if orders were placed:"
echo "1. Check Flask API status (Step 2 above) - shows ordered_likes/ordered_comments"
echo "2. Check Flask logs for 'Ordering' messages"
echo "3. Check database ordered_likes/ordered_comments columns"
echo ""
echo "Note: Campaign stopped because 'No comments left to add'"
echo "      This means all comments in the Google Sheet are marked as 'Used'"
echo "      The campaign may have placed LIKE orders but couldn't place COMMENT orders"
echo ""

