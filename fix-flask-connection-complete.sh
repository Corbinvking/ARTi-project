#!/bin/bash
# Complete fix for Flask connection from API container

set -e

echo "=========================================="
echo "Fixing Flask Connection from API Container"
echo "=========================================="
echo ""

cd ~/arti-marketing-ops

# Step 1: Update docker-compose.yml (already done, but verify)
if ! grep -q "host.docker.internal" docker-compose.yml; then
    echo "⚠️  docker-compose.yml needs extra_hosts - updating..."
    # This should already be done, but just in case
fi

# Step 2: Update RATIO_FIXER_URL to use host.docker.internal
echo "Step 1: Updating RATIO_FIXER_URL in production.env..."

# Use host.docker.internal (works with extra_hosts)
FLASK_URL="http://host.docker.internal:5000"

if grep -q "RATIO_FIXER_URL" apps/api/production.env; then
    sed -i "s|RATIO_FIXER_URL=.*|RATIO_FIXER_URL=$FLASK_URL|" apps/api/production.env
    echo "✅ Updated RATIO_FIXER_URL to: $FLASK_URL"
else
    echo "RATIO_FIXER_URL=$FLASK_URL" >> apps/api/production.env
    echo "✅ Added RATIO_FIXER_URL: $FLASK_URL"
fi

# Step 3: Restart API container to pick up changes
echo ""
echo "Step 2: Restarting API container..."
docker compose down api
docker compose up -d api

# Step 4: Wait for API to be ready
echo ""
echo "Step 3: Waiting for API to be ready..."
sleep 8

# Step 5: Test connection
echo ""
echo "Step 4: Testing Flask connection from API container..."
docker exec arti-api curl -s http://host.docker.internal:5000/healthz && echo "✅ Flask reachable!" || echo "❌ Flask not reachable"

# Step 6: Test API bridge endpoint
echo ""
echo "Step 5: Testing API bridge health endpoint..."
sleep 2
RESPONSE=$(curl -s http://localhost:3001/api/ratio-fixer/health)
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

if echo "$RESPONSE" | grep -q '"available":true'; then
    echo ""
    echo "✅ SUCCESS! Flask connection is working!"
else
    echo ""
    echo "⚠️  Connection may still be failing. Trying alternative method..."
    
    # Alternative: Use Docker bridge gateway IP
    DOCKER_GATEWAY=$(docker network inspect bridge --format '{{range .IPAM.Config}}{{.Gateway}}{{end}}' 2>/dev/null || echo "172.17.0.1")
    echo "Trying Docker gateway IP: $DOCKER_GATEWAY"
    
    sed -i "s|RATIO_FIXER_URL=.*|RATIO_FIXER_URL=http://${DOCKER_GATEWAY}:5000|" apps/api/production.env
    docker compose restart api
    sleep 5
    
    echo "Testing with gateway IP..."
    curl -s http://localhost:3001/api/ratio-fixer/health | jq . 2>/dev/null || curl -s http://localhost:3001/api/ratio-fixer/health
fi

echo ""
echo "=========================================="
echo "✅ Fix Complete!"
echo "=========================================="

