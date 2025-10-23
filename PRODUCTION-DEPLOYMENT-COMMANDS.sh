#!/bin/bash
# Production Deployment Script for Stream Data Workflow
# Run this on your production server after pulling the latest code

echo "=================================="
echo "🚀 Stream Data Workflow Deployment"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "📂 Project root: $PROJECT_ROOT"
echo ""

# Step 1: Pull latest code
echo "Step 1: Pulling latest code from repository..."
git pull origin main
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Code updated${NC}"
else
    echo -e "${RED}❌ Failed to pull code${NC}"
    exit 1
fi
echo ""

# Step 2: Install Python dependencies
echo "Step 2: Installing Python dependencies..."
cd "$PROJECT_ROOT/roster_scraper"
pip3 install -r requirements.txt
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Roster scraper dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install roster scraper dependencies${NC}"
    exit 1
fi

cd "$PROJECT_ROOT/spotify_scraper"
pip3 install -r requirements.txt
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Spotify scraper dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install spotify scraper dependencies${NC}"
    exit 1
fi
echo ""

# Step 3: Install Playwright browsers
echo "Step 3: Installing Playwright browsers..."
cd "$PROJECT_ROOT/roster_scraper"
playwright install chromium
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Playwright browsers installed${NC}"
else
    echo -e "${YELLOW}⚠️  Playwright install had issues (may already be installed)${NC}"
fi
echo ""

# Step 4: Check CSV file
echo "Step 4: Checking for CSV file..."
cd "$PROJECT_ROOT"
if [ -f "Spotify Playlisting-Active Campaigns.csv" ]; then
    echo -e "${GREEN}✅ CSV file found${NC}"
else
    echo -e "${YELLOW}⚠️  CSV file not found - please upload it to: $PROJECT_ROOT${NC}"
    echo "   Use: scp 'Spotify Playlisting-Active Campaigns.csv' user@server:$PROJECT_ROOT/"
fi
echo ""

# Step 5: Check environment variables
echo "Step 5: Checking environment variables..."
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env file found${NC}"
    
    # Check for required variables
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env && grep -q "SUPABASE_SERVICE_ROLE_KEY" .env; then
        echo -e "${GREEN}✅ Required environment variables present${NC}"
    else
        echo -e "${YELLOW}⚠️  Some environment variables may be missing${NC}"
        echo "   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
    fi
else
    echo -e "${YELLOW}⚠️  .env file not found - please create it${NC}"
fi
echo ""

# Step 6: Create logs directory
echo "Step 6: Creating logs directory..."
mkdir -p logs
echo -e "${GREEN}✅ Logs directory ready${NC}"
echo ""

# Step 7: Import existing data (if JSON files exist)
echo "Step 7: Checking for existing scraped data..."
JSON_COUNT=$(ls -1 spotify_scraper/data/roster_*.json 2>/dev/null | wc -l)
if [ $JSON_COUNT -gt 0 ]; then
    echo -e "${GREEN}Found $JSON_COUNT scraped data files${NC}"
    echo "Would you like to import them now? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "Importing data to database..."
        node scripts/import-roster-scraped-data.js
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Data imported successfully${NC}"
        else
            echo -e "${RED}❌ Data import failed${NC}"
        fi
    else
        echo "Skipped data import"
    fi
else
    echo -e "${YELLOW}⚠️  No scraped data files found${NC}"
    echo "   You'll need to run the scraper first or upload data files"
fi
echo ""

# Step 8: Schedule cron job
echo "Step 8: Setting up cron job (optional)..."
echo ""
echo "To schedule automatic updates, add this to your crontab:"
echo -e "${YELLOW}crontab -e${NC}"
echo ""
echo "Then add this line (runs every Sunday at 2 AM):"
echo -e "${GREEN}0 2 * * 0 cd $PROJECT_ROOT && /usr/bin/python3 scripts/run_full_stream_data_pipeline.py >> logs/stream_data_workflow.log 2>&1${NC}"
echo ""
echo "Would you like to add this cron job now? (y/n)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    # Add to crontab
    (crontab -l 2>/dev/null; echo "0 2 * * 0 cd $PROJECT_ROOT && /usr/bin/python3 scripts/run_full_stream_data_pipeline.py >> logs/stream_data_workflow.log 2>&1") | crontab -
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Cron job scheduled${NC}"
    else
        echo -e "${RED}❌ Failed to schedule cron job - please add manually${NC}"
    fi
else
    echo "Skipped cron job setup"
fi
echo ""

# Summary
echo "=================================="
echo "✅ DEPLOYMENT COMPLETE"
echo "=================================="
echo ""
echo "📋 Next Steps:"
echo "   1. Upload CSV file (if not done): Spotify Playlisting-Active Campaigns.csv"
echo "   2. Verify .env file has correct Supabase credentials"
echo "   3. Run manual test: python3 scripts/run_full_stream_data_pipeline.py"
echo "   4. Check data in UI: https://your-domain.com"
echo "   5. Monitor cron job logs: tail -f logs/stream_data_workflow.log"
echo ""
echo "📚 Documentation:"
echo "   - Quick Start: STREAM-DATA-QUICK-START.md"
echo "   - Full Workflow: AUTOMATED-STREAM-DATA-WORKFLOW.md"
echo "   - Deployment Guide: DEPLOY-STREAM-DATA-TO-PRODUCTION.md"
echo ""
echo "🎉 Ready to go!"
echo ""

