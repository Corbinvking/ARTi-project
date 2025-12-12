#!/bin/bash
cd /root/arti-marketing-ops/spotify_scraper

# Load environment variables
if [ -f ../.env ]; then
    source ../.env
fi

# Run health check
python3 health_check.py

