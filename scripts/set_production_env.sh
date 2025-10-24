#!/bin/bash

echo "=================================="
echo "🔧 Setting Production Environment"
echo "=================================="
echo ""

# Get the publishable key from supabase status
PUBLISHABLE_KEY=$(supabase status | grep "Publishable key" | awk '{print $3}')
SECRET_KEY=$(supabase status | grep "Secret key" | awk '{print $3}')
API_URL=$(supabase status | grep "API URL" | awk '{print $3}')

echo "📋 Found Supabase Configuration:"
echo ""
echo "   API URL: $API_URL"
echo "   Publishable Key: $PUBLISHABLE_KEY"
echo "   Secret Key: ${SECRET_KEY:0:20}... (hidden)"
echo ""

# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$PUBLISHABLE_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SECRET_KEY"

echo "✅ Environment variables set!"
echo ""
echo "To persist these, add to your .env.local:"
echo ""
echo "NEXT_PUBLIC_SUPABASE_URL=\"$API_URL\""
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=\"$PUBLISHABLE_KEY\""
echo "SUPABASE_SERVICE_ROLE_KEY=\"$SECRET_KEY\""
echo ""
echo "Or source this script:"
echo "   source scripts/set_production_env.sh"
echo ""

