#!/bin/bash
# Upload Scraped Data to Production
# Usage: bash scripts/upload_to_production.sh [SERVER_IP]

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=================================="
echo "📤 Upload Data to Production"
echo "=================================="
echo ""

# Get server IP (default or from argument)
SERVER_IP="${1:-164.90.129.146}"
SERVER_USER="root"
SERVER_PATH="~/arti-marketing-ops/spotify_scraper/data/"

# Count files to upload
FILE_COUNT=$(ls -1 spotify_scraper/data/roster_*.json 2>/dev/null | wc -l)

if [ "$FILE_COUNT" -eq 0 ]; then
    echo -e "${RED}❌ No scraped data files found in spotify_scraper/data/${NC}"
    echo "   Run the scraper first: python scripts/run_full_stream_data_pipeline.py"
    exit 1
fi

echo -e "${GREEN}📊 Found $FILE_COUNT JSON files to upload${NC}"
echo ""
echo "🎯 Target server: $SERVER_USER@$SERVER_IP"
echo "📁 Target path: $SERVER_PATH"
echo ""

# Confirm upload
read -p "Continue with upload? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Upload cancelled"
    exit 0
fi

echo ""
echo "📤 Uploading files..."
echo ""

# Upload files
scp spotify_scraper/data/roster_*.json "$SERVER_USER@$SERVER_IP:$SERVER_PATH"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Upload complete!${NC}"
    echo ""
    echo "📋 Next steps on production server:"
    echo ""
    echo "   ssh $SERVER_USER@$SERVER_IP"
    echo "   cd ~/arti-marketing-ops"
    echo "   source venv/bin/activate  # if using venv"
    echo "   node scripts/import-roster-scraped-data.js"
    echo ""
else
    echo -e "${RED}❌ Upload failed${NC}"
    exit 1
fi

