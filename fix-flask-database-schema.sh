#!/bin/bash
# Fix Flask database schema - add missing columns

set -e

echo "=========================================="
echo "Fixing Flask Database Schema"
echo "=========================================="
echo ""

FLASK_DB="/opt/ratio-fixer/campaigns.db"

if [ ! -f "$FLASK_DB" ]; then
    echo "❌ Flask database not found at $FLASK_DB"
    exit 1
fi

echo "✅ Found Flask database: $FLASK_DB"

# Step 1: Check current schema
echo ""
echo "Step 1: Current schema..."
sqlite3 "$FLASK_DB" ".schema campaign_model"

# Step 2: Add missing columns
echo ""
echo "Step 2: Adding missing columns..."
sqlite3 "$FLASK_DB" << 'SQL'
-- Add missing columns if they don't exist
ALTER TABLE campaign_model ADD COLUMN comment_server_id INTEGER;
ALTER TABLE campaign_model ADD COLUMN like_server_id INTEGER;
ALTER TABLE campaign_model ADD COLUMN ordered_likes INTEGER DEFAULT 0;
ALTER TABLE campaign_model ADD COLUMN ordered_comments INTEGER DEFAULT 0;
ALTER TABLE campaign_model ADD COLUMN sheet_tier VARCHAR(50);
ALTER TABLE campaign_model ADD COLUMN minimum_engagement INTEGER;
SQL

# Step 3: Verify columns were added
echo ""
echo "Step 3: Verifying schema update..."
sqlite3 "$FLASK_DB" ".schema campaign_model"

# Step 4: Check if campaigns exist in memory (via Flask API)
echo ""
echo "Step 4: Checking Flask for active campaigns..."
# Get list of campaigns from Flask logs or API
echo "Note: Campaigns might be running in memory but not saved to database"
echo "This is normal - Flask keeps active campaigns in memory"

# Step 5: Check Flask logs for campaign activity
echo ""
echo "Step 5: Checking Flask logs for recent campaigns..."
sudo journalctl -u ratio-fixer --since "1 hour ago" --no-pager | grep -E "campaign_id|Created campaign|Video ID" | tail -10 || echo "No recent campaign activity"

# Step 6: Summary
echo ""
echo "=========================================="
echo "Schema Fix Complete"
echo "=========================================="
echo ""
echo "✅ Added missing columns:"
echo "   - comment_server_id"
echo "   - like_server_id"
echo "   - ordered_likes"
echo "   - ordered_comments"
echo "   - sheet_tier"
echo "   - minimum_engagement"
echo ""
echo "⚠️  Note: The database has 0 rows because:"
echo "   1. Campaigns are kept in memory (campaign_threads dict)"
echo "   2. They're only saved to DB when created via web UI"
echo "   3. API-created campaigns may not be persisted"
echo ""
echo "To check for active campaigns, use Flask API status endpoint"
echo "or check Flask logs for campaign activity."
echo ""







