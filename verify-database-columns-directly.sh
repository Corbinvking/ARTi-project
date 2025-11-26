#!/bin/bash
# Directly verify database columns are present

FLASK_DB="/opt/ratio-fixer/campaigns.db"

echo "=========================================="
echo "Direct Database Column Verification"
echo "=========================================="
echo ""

echo "Checking campaign_model table schema..."
echo ""

# Get all column names
sqlite3 "$FLASK_DB" "PRAGMA table_info(campaign_model);" | while IFS='|' read -r cid name type notnull dflt_value pk; do
    echo "Column: $name (Type: $type)"
done

echo ""
echo "Checking for specific required columns..."
echo ""

# Check each column explicitly
for col in "ordered_likes" "ordered_comments" "comment_server_id" "like_server_id" "sheet_tier" "minimum_engagement"; do
    RESULT=$(sqlite3 "$FLASK_DB" "PRAGMA table_info(campaign_model);" | grep -i "|${col}|")
    if [ -n "$RESULT" ]; then
        echo "✅ Column '$col' exists: $RESULT"
    else
        echo "❌ Column '$col' missing"
    fi
done

echo ""
echo "Testing a query with all columns..."
sqlite3 "$FLASK_DB" "SELECT campaign_id, ordered_likes, ordered_comments, comment_server_id, like_server_id, sheet_tier FROM campaign_model LIMIT 1;" 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All columns are queryable!"
else
    echo ""
    echo "❌ Query failed - some columns may be missing"
fi

