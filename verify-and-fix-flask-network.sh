#!/bin/bash
# Verify Flask is accessible and fix network issues

set -e

echo "=========================================="
echo "Verifying Flask Network Configuration"
echo "=========================================="
echo ""

# Step 1: Check if Flask is running
echo "Step 1: Checking Flask service status..."
if sudo systemctl is-active --quiet ratio-fixer; then
    echo "✅ Flask service is running"
else
    echo "❌ Flask service is not running!"
    echo "   Start it with: sudo systemctl start ratio-fixer"
    exit 1
fi

# Step 2: Check what Flask is listening on
echo ""
echo "Step 2: Checking Flask listening address..."
FLASK_LISTEN=$(sudo netstat -tlnp 2>/dev/null | grep :5000 || ss -tlnp | grep :5000)
echo "Flask listening info: $FLASK_LISTEN"

if echo "$FLASK_LISTEN" | grep -q "0.0.0.0:5000\|:::5000"; then
    echo "✅ Flask is listening on all interfaces (0.0.0.0)"
else
    echo "⚠️  Flask may only be listening on localhost (127.0.0.1)"
    echo "   This will prevent Docker containers from connecting"
fi

# Step 3: Test Flask from host
echo ""
echo "Step 3: Testing Flask from host..."
HOST_TEST=$(curl -s http://localhost:5000/healthz || echo "FAILED")
if [ "$HOST_TEST" = '{"status":"healthy"}' ]; then
    echo "✅ Flask is accessible from host"
else
    echo "❌ Flask not accessible from host: $HOST_TEST"
    exit 1
fi

# Step 4: Get Docker gateway IP
echo ""
echo "Step 4: Detecting Docker network configuration..."
DOCKER_GATEWAY=$(docker network inspect bridge --format '{{range .IPAM.Config}}{{.Gateway}}{{end}}' 2>/dev/null || echo "172.17.0.1")
echo "Docker gateway IP: $DOCKER_GATEWAY"

# Step 5: Test Flask from Docker container using gateway IP
echo ""
echo "Step 5: Testing Flask from API container using gateway IP..."
docker exec arti-api curl -s --connect-timeout 3 http://${DOCKER_GATEWAY}:5000/healthz && echo "✅ Flask reachable from container!" || echo "❌ Flask not reachable from container"

# Step 6: Check firewall
echo ""
echo "Step 6: Checking firewall..."
if command -v ufw >/dev/null 2>&1; then
    UFW_STATUS=$(sudo ufw status | head -1)
    echo "UFW status: $UFW_STATUS"
    if echo "$UFW_STATUS" | grep -q "Status: active"; then
        echo "⚠️  Firewall is active - may need to allow port 5000"
        echo "   Run: sudo ufw allow 5000/tcp"
    fi
fi

# Step 7: Update production.env with gateway IP
echo ""
echo "Step 7: Updating RATIO_FIXER_URL with gateway IP..."
cd ~/arti-marketing-ops
sed -i "s|RATIO_FIXER_URL=.*|RATIO_FIXER_URL=http://${DOCKER_GATEWAY}:5000|" apps/api/production.env
echo "✅ Updated to: http://${DOCKER_GATEWAY}:5000"

# Step 8: Restart API
echo ""
echo "Step 8: Restarting API container..."
docker compose restart api
sleep 5

# Step 9: Final test
echo ""
echo "Step 9: Final connection test..."
sleep 3
RESPONSE=$(curl -s http://localhost:3001/api/ratio-fixer/health)
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

if echo "$RESPONSE" | grep -q '"available":true'; then
    echo ""
    echo "✅ SUCCESS! Flask connection is working!"
else
    echo ""
    echo "⚠️  Still having issues. Checking Flask main.py configuration..."
    echo "   Flask needs to listen on 0.0.0.0, not 127.0.0.1"
    echo "   Check: grep 'app.run' /opt/ratio-fixer/main.py"
fi

echo ""
echo "=========================================="
echo "Verification Complete"
echo "=========================================="

