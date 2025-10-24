#!/bin/bash

echo "=================================="
echo "🚀 RUNNING SQL IMPORT ON PRODUCTION"
echo "=================================="
echo ""

# Change to project directory
cd /root/arti-marketing-ops

# Run SQL import using psql
echo "📥 Importing scraped data to database..."
psql postgresql://postgres:postgres@localhost:54322/postgres -f IMPORT-SCRAPED-DATA.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Import completed successfully!"
    echo ""
    echo "🔍 Verifying data..."
    psql postgresql://postgres:postgres@localhost:54322/postgres -c "SELECT COUNT(*) as total_playlists FROM campaign_playlists;"
    psql postgresql://postgres:postgres@localhost:54322/postgres -c "SELECT COUNT(DISTINCT campaign_id) as campaigns_with_playlists FROM campaign_playlists;"
    echo ""
    echo "🎉 Done!"
else
    echo ""
    echo "❌ Import failed!"
    exit 1
fi

