#!/bin/bash

# Droplet Migration Setup Script
# Sets up data migration pipeline on production droplet

echo "🚀 SETTING UP DROPLET MIGRATION PIPELINE"
echo "========================================"

# Step 1: Navigate to project directory
echo "📂 Navigating to project directory..."
if [ -d "/root/ARTi-project" ]; then
    cd /root/ARTi-project
    echo "✅ Found project at /root/ARTi-project"
elif [ -d "/root/arti-project" ]; then
    cd /root/arti-project
    echo "✅ Found project at /root/arti-project"
else
    echo "❌ Project directory not found. Searching..."
    find /root -name "*.json" -path "*/package.json" | head -5
    exit 1
fi

echo ""
echo "📊 Current directory: $(pwd)"
echo "📋 Project contents:"
ls -la

# Step 2: Check if Supabase is running
echo ""
echo "🔍 Checking Supabase status..."
if command -v supabase &> /dev/null; then
    echo "✅ Supabase CLI found"
    supabase status || echo "⚠️  Supabase not running"
else
    echo "❌ Supabase CLI not found"
fi

# Step 3: Check production environment
echo ""
echo "🔍 Checking production environment..."
if [ -f "production.env" ]; then
    echo "✅ production.env found"
    echo "📋 Environment variables:"
    grep -E "^[A-Z]" production.env | head -10
else
    echo "❌ production.env not found"
fi

# Step 4: Check Docker services
echo ""
echo "🐳 Checking Docker services..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(supabase|arti)"

# Step 5: Test local Supabase connection
echo ""
echo "🔗 Testing local Supabase connection..."
if curl -s http://localhost:54323 > /dev/null; then
    echo "✅ Supabase Studio accessible on localhost:54323"
else
    echo "❌ Supabase Studio not accessible"
fi

if curl -s http://localhost:54321/health > /dev/null; then
    echo "✅ Supabase API accessible on localhost:54321"
else
    echo "❌ Supabase API not accessible"
fi

# Step 6: Installation recommendations
echo ""
echo "🔧 NEXT STEPS FOR MIGRATION:"
echo "============================="
echo "1. Start Supabase if not running:"
echo "   supabase start"
echo ""
echo "2. Create local migration script:"
echo "   node scripts/create-local-migration.js"
echo ""
echo "3. Upload data via CSV import:"
echo "   - Access https://db.artistinfluence.com"
echo "   - Use Table Editor → Import → CSV"
echo ""
echo "4. Or run direct database migration:"
echo "   cd apps/api && node ../../scripts/direct-db-migration.js"

echo ""
echo "📋 CURRENT STATUS COMPLETE!"
