#!/bin/bash
# Pull latest changes and run Ratio Fixer fix

echo "=========================================="
echo "Pulling Latest Changes & Fixing Ratio Fixer"
echo "=========================================="
echo ""

cd ~/arti-marketing-ops

echo "Step 1: Discarding local changes to production.env..."
git checkout apps/api/production.env

echo ""
echo "Step 2: Pulling latest changes..."
git pull origin main

if [ $? -eq 0 ]; then
    echo "✅ Successfully pulled latest changes"
else
    echo "❌ Failed to pull changes"
    exit 1
fi

echo ""
echo "Step 3: Running Ratio Fixer fix script..."
echo ""

bash fix-ratio-fixer-remaining-issues.sh

