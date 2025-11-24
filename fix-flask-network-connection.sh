#!/bin/bash
# Fix Flask network connection for API container

echo "=========================================="
echo "Fixing Flask Network Connection"
echo "=========================================="
echo ""

# Get the host's IP address on the Docker bridge network
# This is typically 172.17.0.1, but we'll detect it
HOST_IP=$(ip route show default | awk '/default/ {print $3}' | head -1)

# Alternative: Get Docker bridge gateway
DOCKER_GATEWAY=$(docker network inspect bridge --format '{{range .IPAM.Config}}{{.Gateway}}{{end}}' 2>/dev/null || echo "172.17.0.1")

echo "Detected Docker gateway: $DOCKER_GATEWAY"
echo "Detected host IP: $HOST_IP"

# Use Docker gateway (most reliable)
FLASK_URL="http://${DOCKER_GATEWAY}:5000"

echo ""
echo "Updating RATIO_FIXER_URL in apps/api/production.env..."
cd ~/arti-marketing-ops

# Update the URL
if grep -q "RATIO_FIXER_URL" apps/api/production.env; then
    sed -i "s|RATIO_FIXER_URL=.*|RATIO_FIXER_URL=$FLASK_URL|" apps/api/production.env
    echo "✅ Updated RATIO_FIXER_URL to: $FLASK_URL"
else
    echo "RATIO_FIXER_URL=$FLASK_URL" >> apps/api/production.env
    echo "✅ Added RATIO_FIXER_URL: $FLASK_URL"
fi

echo ""
echo "Restarting API container to pick up new URL..."
docker compose restart api

echo ""
echo "Waiting for API to be ready..."
sleep 5

echo ""
echo "Testing Flask connection from API container..."
docker exec arti-api curl -s http://${DOCKER_GATEWAY}:5000/healthz || echo "⚠️  Direct connection test failed"

echo ""
echo "Testing API bridge health endpoint..."
sleep 2
curl -s http://localhost:3001/api/ratio-fixer/health | jq . || curl -s http://localhost:3001/api/ratio-fixer/health

echo ""
echo "=========================================="
echo "✅ Network configuration updated!"
echo "=========================================="
echo ""
echo "If connection still fails, try:"
echo "1. Verify Flask is running: curl http://localhost:5000/healthz"
echo "2. Check firewall: sudo ufw status"
echo "3. Try using host IP instead: $HOST_IP"
echo ""

