#!/bin/bash
# Check what tables exist in Flask database

set -e

echo "=========================================="
echo "Checking Flask Database Tables"
echo "=========================================="
echo ""

FLASK_DB="/opt/ratio-fixer/campaigns.db"

if [ ! -f "$FLASK_DB" ]; then
    echo "❌ Flask database not found at $FLASK_DB"
    exit 1
fi

echo "✅ Found Flask database: $FLASK_DB"

# Step 1: List all tables
echo ""
echo "Step 1: Listing all tables in database..."
sqlite3 "$FLASK_DB" ".tables"

# Step 2: Check schema
echo ""
echo "Step 2: Checking database schema..."
sqlite3 "$FLASK_DB" ".schema" | head -50

# Step 3: Try to find the campaigns table (might be different name)
echo ""
echo "Step 3: Searching for campaign-related tables..."
sqlite3 "$FLASK_DB" ".tables" | grep -i campaign || echo "No 'campaign' table found"

# Step 4: Check if it's using SQLAlchemy naming
echo ""
echo "Step 4: Checking for SQLAlchemy table names..."
# SQLAlchemy might use different naming
sqlite3 "$FLASK_DB" ".tables" | grep -E "campaign|model" || echo "No matching tables"

# Step 5: List all tables and their row counts
echo ""
echo "Step 5: All tables and row counts..."
for table in $(sqlite3 "$FLASK_DB" ".tables"); do
    count=$(sqlite3 "$FLASK_DB" "SELECT COUNT(*) FROM $table;" 2>/dev/null || echo "error")
    echo "  $table: $count rows"
done

# Step 6: If we find a table, show its structure
echo ""
echo "Step 6: Checking table structures..."
for table in $(sqlite3 "$FLASK_DB" ".tables"); do
    echo ""
    echo "Table: $table"
    sqlite3 "$FLASK_DB" ".schema $table"
    echo ""
    echo "Sample data (first 3 rows):"
    sqlite3 "$FLASK_DB" "SELECT * FROM $table LIMIT 3;" 2>/dev/null || echo "Could not query"
done

# Step 7: Try Python approach to inspect database
echo ""
echo "Step 7: Using Python to inspect database structure..."
python3 << 'PYTHON'
import sqlite3
import sys

db_path = "/opt/ratio-fixer/campaigns.db"
try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get all table names
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    print(f"\nFound {len(tables)} tables:")
    for (table_name,) in tables:
        print(f"  - {table_name}")
        
        # Get row count
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cursor.fetchone()[0]
        print(f"    Rows: {count}")
        
        # Get column names
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = cursor.fetchall()
        print(f"    Columns: {', '.join([col[1] for col in columns])}")
        
        # If it looks like a campaigns table, show data
        if 'campaign' in table_name.lower() or count > 0:
            print(f"\n    Sample data from {table_name}:")
            cursor.execute(f"SELECT * FROM {table_name} LIMIT 3")
            rows = cursor.fetchall()
            for row in rows:
                print(f"      {row}")
    
    conn.close()
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
PYTHON

echo ""
echo "=========================================="
echo "Check Complete"
echo "=========================================="

