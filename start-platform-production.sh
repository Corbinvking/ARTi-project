#!/bin/bash

# ARTi Marketing Platform - Production Start Script
# For DigitalOcean droplet deployment (Updated for upgraded droplet)

echo "🚀 Starting ARTi Marketing Platform (Production)..."
echo "💪 Optimized for upgraded droplet specs"
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.supabase-project.yml" ]; then
    echo "❌ Error: docker-compose.supabase-project.yml not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Show system resources
echo "💻 System Resources:"
echo "   CPU Cores: $(nproc)"
echo "   Memory: $(free -h | awk '/^Mem:/ {print $2}') total"
echo "   Available: $(free -h | awk '/^Mem:/ {print $7}')"
echo ""

# Check Docker daemon
if ! docker info >/dev/null 2>&1; then
    echo "🔧 Starting Docker daemon..."
    sudo systemctl start docker
    sleep 3
fi

# Stop any existing services cleanly
echo "🧹 Cleaning up any existing services..."
docker compose -p arti-marketing-ops -f docker-compose.supabase-project.yml down >/dev/null 2>&1 || true
supabase stop >/dev/null 2>&1 || true
sleep 2

# Step 1: Start Supabase services first
echo "📦 Starting Supabase services..."
supabase start

if [ $? -ne 0 ]; then
    echo "❌ Failed to start Supabase services"
    exit 1
fi

echo "✅ Supabase services started"

# Step 2: Wait for Supabase to be fully ready
echo "⏳ Waiting for Supabase to be fully ready..."
sleep 10

# Step 3: Start custom services (API, Worker, n8n, Caddy)
echo "🔧 Starting custom services..."
docker compose -p arti-marketing-ops -f docker-compose.supabase-project.yml up -d

if [ $? -ne 0 ]; then
    echo "❌ Failed to start custom services"
    echo "🛑 Stopping Supabase services..."
    supabase stop
    exit 1
fi

echo "✅ Custom services started"

# Step 4: Wait for services to come online
echo "⏳ Waiting for services to initialize..."
sleep 15

# Step 5: Show status
echo ""
echo "🎉 ARTi Marketing Platform is now running!"
echo ""
echo "📊 Production Service Endpoints:"
echo "   • API Health:         https://api.artistinfluence.com/healthz"
echo "   • Supabase Studio:    https://db.artistinfluence.com"
echo "   • n8n Automation:     https://link.artistinfluence.com"
echo "   • Frontend:           https://app.artistinfluence.com"
echo ""
echo "🔧 Local Development Endpoints:"
echo "   • Unified Platform:   http://localhost:8080"
echo "   • Supabase Studio:    http://127.0.0.1:54323"
echo "   • Direct API:         http://127.0.0.1:3002"
echo "   • Direct n8n:         http://127.0.0.1:5678"
echo ""
echo "🔐 Authentication:"
echo "   • Supabase URL:       http://127.0.0.1:54321"
echo "   • Test Login:         admin@arti-demo.com / Password123!"
echo ""
echo "📋 Management Commands:"
echo "   • View logs:          docker compose -p arti-marketing-ops logs -f"
echo "   • Stop platform:      ./stop-platform-production.sh"
echo "   • Check status:       docker compose -p arti-marketing-ops ps"
echo "   • Supabase status:    supabase status"
echo ""
echo "🌐 DNS Requirements:"
echo "   • api.artistinfluence.com  → $(curl -s ifconfig.me)"
echo "   • db.artistinfluence.com   → $(curl -s ifconfig.me)"
echo "   • link.artistinfluence.com → $(curl -s ifconfig.me)"
echo "   • app.artistinfluence.com  → Vercel CNAME"
echo ""
