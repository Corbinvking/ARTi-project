#!/bin/bash

# Check ARTi Platform Status on Droplet
echo "🔍 CHECKING ARTI PLATFORM STATUS"
echo "================================="

# Check if we're in the right directory
if [ ! -f "docker-compose.supabase-project.yml" ]; then
    echo "❌ Error: Not in project directory"
    echo "Run: cd /root/arti-marketing-ops"
    exit 1
fi

echo "📍 Current directory: $(pwd)"
echo ""

# 1. Check Docker status
echo "🐳 DOCKER STATUS:"
echo "=================="
if command -v docker >/dev/null 2>&1; then
    echo "✅ Docker installed: $(docker --version)"
    
    if docker info >/dev/null 2>&1; then
        echo "✅ Docker daemon running"
    else
        echo "❌ Docker daemon not running"
        echo "   Run: sudo systemctl start docker"
    fi
else
    echo "❌ Docker not installed"
fi
echo ""

# 2. Check Supabase CLI status
echo "📦 SUPABASE STATUS:"
echo "=================="
if command -v supabase >/dev/null 2>&1; then
    echo "✅ Supabase CLI installed: $(supabase --version)"
    
    # Check if Supabase is running
    if supabase status >/dev/null 2>&1; then
        echo "✅ Supabase services running"
        supabase status
    else
        echo "⚠️  Supabase services not running"
        echo "   Run: supabase start"
    fi
else
    echo "❌ Supabase CLI not installed"
fi
echo ""

# 3. Check Docker containers
echo "🚢 DOCKER CONTAINERS:"
echo "===================="
if docker ps >/dev/null 2>&1; then
    CONTAINERS=$(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}")
    if [ ! -z "$CONTAINERS" ]; then
        echo "$CONTAINERS"
        echo ""
        echo "Container count: $(docker ps -q | wc -l)"
    else
        echo "⚠️  No containers running"
    fi
else
    echo "❌ Cannot check containers (Docker issue)"
fi
echo ""

# 4. Check specific ARTi services
echo "🎵 ARTI SERVICES:"
echo "================"
ARTI_CONTAINERS=$(docker ps --filter "name=arti-marketing-ops" --format "{{.Names}}")
if [ ! -z "$ARTI_CONTAINERS" ]; then
    echo "✅ ARTi containers found:"
    for container in $ARTI_CONTAINERS; do
        STATUS=$(docker inspect --format='{{.State.Status}}' $container)
        echo "   • $container: $STATUS"
    done
else
    echo "⚠️  No ARTi containers running"
    echo "   Run: ./start-platform-production.sh"
fi
echo ""

# 5. Check key ports
echo "🌐 PORT STATUS:"
echo "=============="
PORTS=(3002 5678 54321 54323 80 443)
for port in "${PORTS[@]}"; do
    if netstat -tuln 2>/dev/null | grep -q ":$port "; then
        echo "✅ Port $port: Open"
    else
        echo "❌ Port $port: Closed"
    fi
done
echo ""

# 6. Check API health
echo "🏥 API HEALTH CHECK:"
echo "==================="
if curl -s http://localhost:3002/api/providers/health >/dev/null 2>&1; then
    echo "✅ API responding"
    curl -s http://localhost:3002/api/providers/health | head -n 3
else
    echo "❌ API not responding"
    echo "   Check: curl http://localhost:3002/api/providers/health"
fi
echo ""

# 7. Check system resources
echo "💻 SYSTEM RESOURCES:"
echo "==================="
echo "CPU: $(nproc) cores"
echo "Memory: $(free -h | awk '/^Mem:/ {print $2}') total, $(free -h | awk '/^Mem:/ {print $7}') available"
echo "Disk: $(df -h / | awk 'NR==2 {print $4}') free"
echo "Load: $(uptime | awk -F'load average:' '{print $2}')"
echo ""

# 8. Quick service URLs
echo "🔗 SERVICE URLS (if running):"
echo "============================="
echo "• Frontend:        https://app.artistinfluence.com"
echo "• API:             https://api.artistinfluence.com"
echo "• Supabase Studio: https://db.artistinfluence.com"
echo "• n8n:             https://link.artistinfluence.com"
echo ""
echo "• Local API:       http://localhost:3002"
echo "• Local Studio:    http://localhost:54323"
echo "• Local n8n:       http://localhost:5678"
echo ""

# 9. Summary
echo "📋 SUMMARY:"
echo "==========="
DOCKER_OK=$(docker info >/dev/null 2>&1 && echo "✅" || echo "❌")
SUPABASE_OK=$(supabase status >/dev/null 2>&1 && echo "✅" || echo "❌")
CONTAINERS=$(docker ps -q | wc -l)
API_OK=$(curl -s http://localhost:3002/api/providers/health >/dev/null 2>&1 && echo "✅" || echo "❌")

echo "Docker:     $DOCKER_OK"
echo "Supabase:   $SUPABASE_OK"
echo "Containers: $CONTAINERS running"
echo "API:        $API_OK"

if [[ "$DOCKER_OK" == "✅" && "$SUPABASE_OK" == "✅" && $CONTAINERS -gt 0 && "$API_OK" == "✅" ]]; then
    echo ""
    echo "🎉 Platform Status: HEALTHY"
    echo "   Ready for Spotify scraper setup!"
else
    echo ""
    echo "⚠️  Platform Status: NEEDS ATTENTION"
    echo "   Run: ./start-platform-production.sh"
fi
