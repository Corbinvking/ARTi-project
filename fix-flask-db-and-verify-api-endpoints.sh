#!/bin/bash
# Fix Flask database schema and verify API endpoints exist

set -e

echo "=========================================="
echo "Fixing Flask Database & Verifying API Endpoints"
echo "=========================================="
echo ""

FLASK_MAIN="/opt/ratio-fixer/main.py"
FLASK_DB="/opt/ratio-fixer/campaigns.db"

# Step 1: Fix database schema
echo "Step 1: Fixing database schema..."
if [ -f "$FLASK_DB" ]; then
    echo "Adding missing columns to campaign_model table..."
    sqlite3 "$FLASK_DB" << 'SQL'
-- Add missing columns if they don't exist (SQLite doesn't support IF NOT EXISTS in ALTER TABLE)
-- We'll use a Python script to safely add them
SQL

    # Use Python to safely add columns
    python3 << 'PYTHON'
import sqlite3
import sys

db_path = "/opt/ratio-fixer/campaigns.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get existing columns
cursor.execute("PRAGMA table_info(campaign_model)")
existing_columns = [row[1] for row in cursor.fetchall()]

# Columns to add
columns_to_add = [
    ("comment_server_id", "INTEGER"),
    ("like_server_id", "INTEGER"),
    ("ordered_likes", "INTEGER DEFAULT 0"),
    ("ordered_comments", "INTEGER DEFAULT 0"),
    ("sheet_tier", "VARCHAR(50)"),
    ("minimum_engagement", "INTEGER"),
]

added = []
for col_name, col_type in columns_to_add:
    if col_name not in existing_columns:
        try:
            cursor.execute(f"ALTER TABLE campaign_model ADD COLUMN {col_name} {col_type}")
            added.append(col_name)
            print(f"✅ Added column: {col_name}")
        except Exception as e:
            print(f"⚠️  Could not add {col_name}: {e}")

conn.commit()
conn.close()

if added:
    print(f"\n✅ Added {len(added)} columns")
else:
    print("\n✅ All columns already exist")
PYTHON
else
    echo "⚠️  Database not found, will be created when first campaign is created"
fi

# Step 2: Verify API endpoints exist
echo ""
echo "Step 2: Checking if API endpoints exist in Flask..."
if [ -f "$FLASK_MAIN" ]; then
    if grep -q "/api/create_campaign" "$FLASK_MAIN"; then
        echo "✅ API endpoint /api/create_campaign exists"
    else
        echo "❌ API endpoint /api/create_campaign NOT found"
        echo "   Need to add API endpoints to Flask"
    fi
    
    if grep -q "/api/campaign_status" "$FLASK_MAIN"; then
        echo "✅ API endpoint /api/campaign_status exists"
    else
        echo "❌ API endpoint /api/campaign_status NOT found"
    fi
    
    if grep -q "ordered_likes.*campaign.ordered_likes" "$FLASK_MAIN"; then
        echo "✅ Status endpoint includes ordered_likes/ordered_comments"
    else
        echo "⚠️  Status endpoint may not include ordered counts"
    fi
else
    echo "❌ Flask main.py not found at $FLASK_MAIN"
fi

# Step 3: Check current campaigns in database
echo ""
echo "Step 3: Checking campaigns in database..."
if [ -f "$FLASK_DB" ]; then
    python3 << 'PYTHON'
import sqlite3

db_path = "/opt/ratio-fixer/campaigns.db"
try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get all campaigns
    cursor.execute("SELECT COUNT(*) FROM campaign_model")
    count = cursor.fetchone()[0]
    print(f"Total campaigns in database: {count}")
    
    if count > 0:
        cursor.execute("""
            SELECT 
                campaign_id,
                video_id,
                status,
                ordered_likes,
                ordered_comments
            FROM campaign_model
            ORDER BY id DESC
            LIMIT 5
        """)
        
        rows = cursor.fetchall()
        print("\nRecent campaigns:")
        for row in rows:
            print(f"  Campaign: {row[0][:8]}... | Video: {row[1]} | Status: {row[2]} | Ordered Likes: {row[3] or 0} | Ordered Comments: {row[4] or 0}")
    else:
        print("\n⚠️  No campaigns in database")
        print("   This is normal if campaigns were created via API and not persisted")
        print("   Check Flask logs for active campaigns in memory")
    
    conn.close()
except Exception as e:
    print(f"Error: {e}")
PYTHON
fi

# Step 4: Check Flask logs for active campaigns
echo ""
echo "Step 4: Checking Flask logs for active campaigns..."
sudo journalctl -u ratio-fixer --since "1 hour ago" --no-pager | grep -E "campaign_id|Created campaign|Video ID.*Current|Ordering" | tail -15 || echo "No recent activity"

# Step 5: Summary
echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""
echo "Database Schema:"
echo "  ✅ Added missing columns (if needed)"
echo ""
echo "API Endpoints:"
echo "  - Check if /api/create_campaign exists"
echo "  - Check if /api/campaign_status includes ordered counts"
echo ""
echo "Campaign Tracking:"
echo "  - Database: Stores persisted campaigns"
echo "  - Memory (campaign_threads): Active running campaigns"
echo "  - API-created campaigns SHOULD be saved to database"
echo ""
echo "To verify orders were placed:"
echo "  1. Check Flask logs for 'Ordering' messages"
echo "  2. Check campaign.ordered_likes/ordered_comments in memory"
echo "  3. Check database ordered_likes/ordered_comments columns"
echo ""

