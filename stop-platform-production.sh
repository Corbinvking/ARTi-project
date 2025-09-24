#!/bin/bash

# ARTi Marketing Platform - Production Stop Script
# For DigitalOcean droplet deployment

echo "🛑 Stopping ARTi Marketing Platform (Production)..."

# Step 1: Stop custom services first
echo "🔧 Stopping custom services..."
docker compose -p arti-marketing-ops -f docker-compose.supabase-project.yml down

if [ $? -ne 0 ]; then
    echo "⚠️  Warning: Failed to stop some custom services"
fi

echo "✅ Custom services stopped"

# Step 2: Stop Supabase services
echo "📦 Stopping Supabase services..."
supabase stop

if [ $? -ne 0 ]; then
    echo "⚠️  Warning: Failed to stop some Supabase services"
fi

echo "✅ Supabase services stopped"

# Step 3: Show final status
echo ""
echo "🎯 ARTi Marketing Platform stopped successfully!"
echo ""
echo "📋 Quick Actions:"
echo "   • Restart platform:     ./start-platform-production.sh"
echo "   • View containers:       docker ps -a"
echo "   • Clean up volumes:      docker volume prune"
echo "   • Check disk usage:      df -h"
echo "   • View system logs:      journalctl -u docker -f"
echo ""
