#!/bin/bash

# ARTi Marketing Platform - Unified Start Script
# Starts Supabase services + custom services in correct order

echo "🚀 Starting ARTi Marketing Platform..."

# Step 1: Start Supabase services first
echo "📦 Starting Supabase services..."
npx supabase start

if [ $? -ne 0 ]; then
    echo "❌ Failed to start Supabase services"
    exit 1
fi

echo "✅ Supabase services started"

# Step 2: Start custom services (API, Worker, n8n, Caddy)
echo "🔧 Starting custom services..."
docker-compose -p arti-marketing-ops -f docker-compose.supabase-project.yml up -d

if [ $? -ne 0 ]; then
    echo "❌ Failed to start custom services"
    echo "🛑 Stopping Supabase services..."
    npx supabase stop
    exit 1
fi

echo "✅ Custom services started"

# Step 3: Show status
echo ""
echo "🎉 ARTi Marketing Platform is now running!"
echo ""
echo "📊 Service Endpoints:"
echo "   • Platform Health:    http://localhost:8080/health"
echo "   • Custom API:         http://localhost:8080/api/"
echo "   • Supabase Studio:    http://127.0.0.1:54323"
echo "   • n8n Automation:     http://127.0.0.1:5678"
echo "   • Direct API:         http://127.0.0.1:3001"
echo ""
echo "🔐 Authentication:"
echo "   • Supabase URL:       http://127.0.0.1:54321"
echo "   • Test Login:         admin@arti-demo.com / Password123!"
echo ""
echo "📋 Management Commands:"
echo "   • View logs:          docker-compose -p arti-marketing-ops logs -f"
echo "   • Stop platform:      ./stop-platform.sh"
echo "   • Restart services:   ./stop-platform.sh && ./start-platform.sh"
echo ""
