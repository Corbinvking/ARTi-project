#!/bin/bash

echo "=================================="
echo "🔍 Finding Supabase ANON Key"
echo "=================================="
echo ""

# Check if supabase CLI is available
if command -v supabase &> /dev/null; then
    echo "✅ Supabase CLI found"
    echo ""
    echo "📋 Getting Supabase configuration..."
    echo ""
    
    cd /root/arti-marketing-ops/supabase 2>/dev/null || cd /root/arti-marketing-ops
    
    # Try to get status
    supabase status 2>/dev/null | grep -E "(API URL|anon key)" || {
        echo "⚠️  Supabase is not running or status unavailable"
        echo ""
        echo "💡 Alternative: Check Kong configuration"
        echo ""
        
        # Check docker containers
        if docker ps | grep -q supabase; then
            echo "✅ Supabase containers are running"
            echo ""
            echo "🔑 Checking Kong JWT secret..."
            
            # Try to find JWT secret from docker inspect
            JWT_SECRET=$(docker inspect $(docker ps -qf "name=supabase-auth") 2>/dev/null | grep -o "JWT_SECRET=[^\"]*" | cut -d'=' -f2 | head -1)
            
            if [ -n "$JWT_SECRET" ]; then
                echo "   Found JWT_SECRET: ${JWT_SECRET:0:20}..."
            fi
        else
            echo "⚠️  Supabase containers not running"
        fi
    }
else
    echo "❌ Supabase CLI not found"
    echo ""
    echo "💡 Trying alternative methods..."
    echo ""
fi

# Check for .env files
echo "📁 Checking for .env files..."
echo ""

if [ -f "/root/arti-marketing-ops/.env.local" ]; then
    echo "✅ Found .env.local"
    grep "ANON" /root/arti-marketing-ops/.env.local 2>/dev/null || echo "   No ANON key in this file"
fi

if [ -f "/root/arti-marketing-ops/apps/frontend/.env.local" ]; then
    echo "✅ Found apps/frontend/.env.local"
    grep "ANON" /root/arti-marketing-ops/apps/frontend/.env.local 2>/dev/null || echo "   No ANON key in this file"
fi

if [ -f "/root/arti-marketing-ops/.env" ]; then
    echo "✅ Found .env"
    grep "ANON" /root/arti-marketing-ops/.env 2>/dev/null || echo "   No ANON key in this file"
fi

# Check Supabase config.toml
if [ -f "/root/arti-marketing-ops/supabase/config.toml" ]; then
    echo ""
    echo "📋 Checking Supabase config..."
    grep -A5 "\[auth\]" /root/arti-marketing-ops/supabase/config.toml | grep "site_url" || true
fi

echo ""
echo "=================================="
echo "💡 RECOMMENDATIONS"
echo "=================================="
echo ""
echo "If running locally with Supabase CLI:"
echo "   1. cd to project directory"
echo "   2. Run: supabase status"
echo "   3. Copy the 'anon key' value"
echo ""
echo "If using hosted Supabase:"
echo "   1. Go to your Supabase dashboard"
echo "   2. Project Settings > API"
echo "   3. Copy 'anon' / 'public' key"
echo ""
echo "Then set it:"
echo "   export NEXT_PUBLIC_SUPABASE_ANON_KEY=\"your-key-here\""
echo ""

