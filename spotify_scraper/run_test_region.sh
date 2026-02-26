#!/bin/bash
cd /root/arti-marketing-ops/spotify_scraper
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi
export DISPLAY=:99
export HEADLESS=false
python3 test_region_scrape.py 2>&1
