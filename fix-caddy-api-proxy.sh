#!/bin/bash
# Fix Caddy to proxy to correct API port and handle timeouts

set -e

echo "=========================================="
echo "Fixing Caddy API Proxy Configuration"
echo "=========================================="
echo ""

cd ~/arti-marketing-ops

# Step 1: Check current Caddyfile
echo "Step 1: Checking current Caddyfile..."
if [ -f "Caddyfile" ]; then
    echo "Found Caddyfile in root"
    cat Caddyfile | grep -A 5 "reverse_proxy" || echo "No reverse_proxy found"
elif [ -f "caddy/Caddyfile.production" ]; then
    echo "Found caddy/Caddyfile.production"
    # The file has encoding issues, let's check what's actually being used
fi

# Step 2: Check what Caddy container is using
echo ""
echo "Step 2: Checking Caddy container status..."
if docker ps | grep -q arti-caddy; then
    echo "✅ Caddy container is running"
    echo "Checking mounted Caddyfile..."
    docker exec arti-caddy cat /etc/caddy/Caddyfile 2>/dev/null | head -60 || echo "Could not read Caddyfile from container"
else
    echo "⚠️  Caddy container not found in docker-compose"
    echo "   Caddy might be running separately or not configured"
fi

# Step 3: Check API port
echo ""
echo "Step 3: Checking API container port..."
API_PORT=$(docker port arti-api 2>/dev/null | grep 3001 | cut -d ':' -f2 || echo "3001")
echo "API is exposed on port: $API_PORT"

# Step 4: Test API directly (bypassing Caddy)
echo ""
echo "Step 4: Testing API directly (bypassing Caddy)..."
curl -s http://localhost:3001/api/ratio-fixer/health | jq . 2>/dev/null || curl -s http://localhost:3001/api/ratio-fixer/health

# Step 5: Test through Caddy (if running)
echo ""
echo "Step 5: Testing API through Caddy..."
if docker ps | grep -q arti-caddy; then
    curl -s -H "Origin: https://app.artistinfluence.com" \
      https://api.artistinfluence.com/api/ratio-fixer/health 2>&1 | head -20 || echo "Caddy test failed"
else
    echo "⚠️  Caddy not running - API might be accessed directly"
fi

# Step 6: Check if API is timing out
echo ""
echo "Step 6: Checking API timeout when reaching Flask..."
HOST_IP=$(hostname -I | awk '{print $1}')
echo "Testing Flask from API container with timeout..."
timeout 3 docker exec arti-api curl -s http://${HOST_IP}:5000/healthz && echo " ✅ Fast response" || echo " ⚠️  Slow or failed"

echo ""
echo "=========================================="
echo "Diagnosis Complete"
echo "=========================================="
echo ""
echo "If API is timing out, the issue is Flask response time."
echo "If Caddy is proxying to wrong port, update Caddyfile."
echo ""

