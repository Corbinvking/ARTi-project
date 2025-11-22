#!/bin/bash
# Quick commands to resolve the git conflict and test

echo "Resolving git conflict and testing..."
echo ""

# Stash local changes
echo "[1/3] Stashing local changes..."
cd /root/arti-marketing-ops
git stash

# Pull latest code
echo "[2/3] Pulling latest code..."
git pull origin main

# Run test
echo "[3/3] Running test with real campaign..."
cd spotify_scraper
bash test_real_campaign.sh

