#!/bin/bash
# Quick fix script for Ratio Fixer setup
# Run this on the droplet to fix the API key and complete setup

set -e

echo "=========================================="
echo "Fixing Ratio Fixer Setup"
echo "=========================================="
echo ""

# Your generated API key
API_KEY="5f1c6f51dd6430beac6746467593e99b75b924ae1cde6b7f0943edef30d328c7"

# Step 1: Fix the API key in Flask .env
echo "Step 1: Fixing API key in Flask .env..."
cd /opt/ratio-fixer

# Remove the placeholder line
sed -i '/RATIO_FIXER_API_KEY=YOUR_KEY_HERE/d' .env

# Add the correct API key
if ! grep -q "RATIO_FIXER_API_KEY=" .env; then
    echo "RATIO_FIXER_API_KEY=$API_KEY" >> .env
    echo "✅ Added correct API key to Flask .env"
else
    # Replace existing with correct one
    sed -i "s/RATIO_FIXER_API_KEY=.*/RATIO_FIXER_API_KEY=$API_KEY/" .env
    echo "✅ Updated API key in Flask .env"
fi

# Add GOOGLE_APPLICATION_CREDENTIALS if not present
if ! grep -q "GOOGLE_APPLICATION_CREDENTIALS" .env; then
    echo "GOOGLE_APPLICATION_CREDENTIALS=/opt/ratio-fixer/rich-phenomenon-428302-q5-dba5f2f381c1.json" >> .env
    echo "✅ Added GOOGLE_APPLICATION_CREDENTIALS"
fi

# Step 2: Copy deployment files
echo ""
echo "Step 2: Copying deployment files..."
cd ~/arti-marketing-ops

if [ -f "flask-api-endpoints-patch.py" ]; then
    cp flask-api-endpoints-patch.py /opt/ratio-fixer/
    echo "✅ Copied flask-api-endpoints-patch.py"
else
    echo "❌ flask-api-endpoints-patch.py not found in repo"
    exit 1
fi

if [ -f "deploy-ratio-fixer-integration.sh" ]; then
    cp deploy-ratio-fixer-integration.sh /opt/ratio-fixer/
    chmod +x /opt/ratio-fixer/deploy-ratio-fixer-integration.sh
    echo "✅ Copied deploy-ratio-fixer-integration.sh"
else
    echo "❌ deploy-ratio-fixer-integration.sh not found in repo"
    exit 1
fi

# Step 3: Update API production.env
echo ""
echo "Step 3: Updating YouTube Manager API configuration..."
cd ~/arti-marketing-ops

# Check if keys need to be added
if ! grep -q "RATIO_FIXER_URL" apps/api/production.env; then
    echo "" >> apps/api/production.env
    echo "# Ratio Fixer API Bridge" >> apps/api/production.env
    echo "RATIO_FIXER_URL=http://localhost:5000" >> apps/api/production.env
    echo "RATIO_FIXER_API_KEY=$API_KEY" >> apps/api/production.env
    echo "JINGLE_SMM_API_KEY=708ff328d63c1ce1548596a16f5f67b1" >> apps/api/production.env
    echo "✅ Added API keys to apps/api/production.env"
else
    # Update existing keys
    sed -i "s|RATIO_FIXER_API_KEY=.*|RATIO_FIXER_API_KEY=$API_KEY|" apps/api/production.env
    echo "✅ Updated API keys in apps/api/production.env"
fi

echo ""
echo "=========================================="
echo "✅ Setup Fixed!"
echo "=========================================="
echo ""
echo "Next: Run the deployment script:"
echo "  cd /opt/ratio-fixer"
echo "  bash deploy-ratio-fixer-integration.sh"
echo ""

