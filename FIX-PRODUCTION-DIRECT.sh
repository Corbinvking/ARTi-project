#!/bin/bash

echo "=================================="
echo "🔧 Direct Fix for Production Import"
echo "=================================="
echo ""

# Get Supabase keys
echo "📋 Getting Supabase configuration..."
SUPABASE_URL=$(supabase status | grep "API URL" | awk '{print $3}')
ANON_KEY=$(supabase status | grep "Publishable key" | awk '{print $3}')
SERVICE_KEY=$(supabase status | grep "Secret key" | awk '{print $3}')

echo "   API URL: $SUPABASE_URL"
echo "   Anon Key: ${ANON_KEY:0:30}..."
echo "   Service Key: ${SERVICE_KEY:0:30}..."
echo ""

# Export them
export NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_KEY"

echo "✅ Environment variables exported!"
echo ""
echo "🚀 Running import..."
echo ""

# Run the import with the exported variables
NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY" \
SUPABASE_SERVICE_ROLE_KEY="$SERVICE_KEY" \
node scripts/import-roster-scraped-data.js

echo ""
echo "=================================="
echo "✅ Done!"
echo "=================================="

