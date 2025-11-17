#!/bin/bash
# Run scraper and auto-sync to production
# Usage: bash run_s4a_with_sync.sh

set -e  # Exit on error

echo "=" 
echo "🎵 Spotify for Artists - Scrape & Sync"
echo "="
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "   Copy .env.example to .env and configure it"
    exit 1
fi

# Check Python and dependencies
if ! command -v python &> /dev/null; then
    echo "❌ Python not found!"
    exit 1
fi

# Run the scraper
echo "📊 Step 1: Running scraper..."
echo ""

python run_s4a_list.py

scraper_exit=$?

if [ $scraper_exit -ne 0 ]; then
    echo ""
    echo "❌ Scraping failed (exit code: $scraper_exit)"
    exit 1
fi

echo ""
echo "✅ Scraping completed"
echo ""

# Sync to production
echo "📤 Step 2: Syncing data to production..."
echo ""

python sync_to_production.py --today

sync_exit=$?

if [ $sync_exit -ne 0 ]; then
    echo ""
    echo "❌ Sync failed (exit code: $sync_exit)"
    echo "   Data is saved locally in data/ directory"
    exit 1
fi

echo ""
echo "=" 
echo "✅ Complete! Data scraped and synced to production"
echo "="

