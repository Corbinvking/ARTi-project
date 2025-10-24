#!/bin/bash

echo "=================================="
echo "🔍 Checking Environment Variables"
echo "=================================="
echo ""

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "✅ .env.local exists"
    echo ""
    echo "📋 Contents (without values):"
    grep -E "^[A-Z_]+" .env.local | cut -d'=' -f1 | while read var; do
        echo "   - $var"
    done
    echo ""
    
    # Source the file
    set -a
    source .env.local
    set +a
    
    echo "🔍 Checking key variables:"
    if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        echo "   ✅ NEXT_PUBLIC_SUPABASE_URL is set"
    else
        echo "   ❌ NEXT_PUBLIC_SUPABASE_URL is missing"
    fi
    
    if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        echo "   ✅ SUPABASE_SERVICE_ROLE_KEY is set"
    else
        echo "   ❌ SUPABASE_SERVICE_ROLE_KEY is missing"
    fi
    
    echo ""
    echo "💡 To use these variables, run:"
    echo "   source .env.local"
    
else
    echo "❌ .env.local not found!"
    echo ""
    echo "📝 Looking for other env files..."
    ls -la | grep env
    echo ""
    echo "💡 You may need to create .env.local with:"
    echo "   NEXT_PUBLIC_SUPABASE_URL=your-url"
    echo "   SUPABASE_SERVICE_ROLE_KEY=your-key"
fi

echo ""
echo "=================================="

