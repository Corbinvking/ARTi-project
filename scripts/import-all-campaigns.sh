#!/bin/bash

# Master CSV Import Script
# Imports all campaign data from CSVs into the unified database
# 
# Usage: bash scripts/import-all-campaigns.sh

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         ARTi Platform - CSV Data Import Master Script         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check environment variables
if [ -z "$SUPABASE_URL" ]; then
  echo "❌ Error: SUPABASE_URL environment variable is not set"
  echo "   Set it with: export SUPABASE_URL='https://api.artistinfluence.com'"
  exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set"
  echo "   Set it with: export SUPABASE_SERVICE_ROLE_KEY='your-key-here'"
  exit 1
fi

echo "✅ Environment variables configured"
echo ""

# Check if CSV files exist
echo "📄 Checking CSV files..."
if [ ! -f "YouTube-All Campaigns.csv" ]; then
  echo "❌ Error: YouTube-All Campaigns.csv not found"
  exit 1
fi
echo "  ✅ YouTube-All Campaigns.csv found"

if [ ! -f "IG Seeding-All Campaigns.csv" ]; then
  echo "❌ Error: IG Seeding-All Campaigns.csv not found"
  exit 1
fi
echo "  ✅ IG Seeding-All Campaigns.csv found"

if [ ! -f "SoundCloud-All Campaigns.csv" ]; then
  echo "❌ Error: SoundCloud-All Campaigns.csv not found"
  exit 1
fi
echo "  ✅ SoundCloud-All Campaigns.csv found"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
  echo ""
fi

# Compile TypeScript (using tsconfig.json)
echo "🔨 Compiling TypeScript..."
npx tsc
echo "✅ Compilation complete"
echo ""

# Run imports
echo "════════════════════════════════════════════════════════════════"
echo "  Step 1/3: Importing YouTube Campaigns"
echo "════════════════════════════════════════════════════════════════"
node dist/scripts/import-youtube-campaigns.js
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "  Step 2/3: Importing Instagram Campaigns"
echo "════════════════════════════════════════════════════════════════"
node dist/scripts/import-instagram-campaigns.js
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "  Step 3/3: Importing SoundCloud Submissions"
echo "════════════════════════════════════════════════════════════════"
node dist/scripts/import-soundcloud-submissions.js
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    ✨ All Imports Complete! ✨                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "🎉 Campaign data has been imported into the database!"
echo ""
echo "Next steps:"
echo "  1. Verify data in Supabase Studio: https://db.artistinfluence.com"
echo "  2. Check for any error messages above"
echo "  3. Run validation queries to ensure data integrity"
echo ""

