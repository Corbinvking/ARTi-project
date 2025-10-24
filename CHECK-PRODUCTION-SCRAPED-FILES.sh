#!/bin/bash
# Check what scraped data exists on production

echo "=== Checking Production Scraped Data ==="
echo ""

echo "📊 Count of JSON files in spotify_scraper/data:"
ls -1 /root/arti-marketing-ops/spotify_scraper/data/song_*.json 2>/dev/null | wc -l

echo ""
echo "📅 Most recent scraped files:"
ls -lt /root/arti-marketing-ops/spotify_scraper/data/song_*.json 2>/dev/null | head -10

echo ""
echo "🔍 Check if specific missing track exists:"
ls -la /root/arti-marketing-ops/spotify_scraper/data/song_2Yl9S2IamNW0hVmhClSYcp*.json 2>/dev/null || echo "❌ NOT FOUND"

