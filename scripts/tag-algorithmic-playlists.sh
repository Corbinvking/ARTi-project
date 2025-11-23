#!/bin/bash

# Tag Algorithmic Playlists - Production Script
# Run this on the droplet to tag all algorithmic playlists in the database

set -e

echo "🚀 Starting algorithmic playlist tagging..."
echo ""

# Load environment variables
if [ -f "/root/arti-marketing-ops/apps/api/production.env" ]; then
  export $(grep -v '^#' /root/arti-marketing-ops/apps/api/production.env | xargs)
  echo "✅ Loaded production environment variables"
else
  echo "❌ Error: production.env not found"
  exit 1
fi

# Set Supabase URL for external access
export SUPABASE_URL="https://api.artistinfluence.com"

# Navigate to project directory
cd /root/arti-marketing-ops

# Run the tagging script
echo ""
echo "📊 Running tag-algorithmic-playlists.js..."
echo ""

node scripts/tag-algorithmic-playlists.js

echo ""
echo "✅ Algorithmic playlist tagging complete!"
echo ""
echo "Next steps:"
echo "  1. Verify on frontend that algorithmic playlists show green badges"
echo "  2. Check that vendor playlists don't have algorithmic tags"
echo ""

