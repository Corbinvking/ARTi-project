#!/bin/bash
# Final fix for Flask network connection

set -e

echo "=========================================="
echo "Final Flask Network Fix"
echo "=========================================="
echo ""

cd ~/arti-marketing-ops

# Step 1: Verify Flask is listening on 0.0.0.0
echo "Step 1: Verifying Flask configuration..."
if sudo netstat -tlnp 2>/dev/null | grep :5000 | grep -q "0.0.0.0:5000"; then
    echo "✅ Flask is listening on 0.0.0.0:5000"
else
    echo "❌ Flask is not listening on 0.0.0.0:5000"
    exit 1
fi

# Step 2: Get Docker gateway IP
DOCKER_GATEWAY=$(docker network inspect bridge --format '{{range .IPAM.Config}}{{.Gateway}}{{end}}' 2>/dev/null || echo "172.17.0.1")
echo "Docker gateway IP: $DOCKER_GATEWAY"

# Step 3: Update production.env with gateway IP
echo ""
echo "Step 2: Updating RATIO_FIXER_URL to use gateway IP..."
sed -i "s|RATIO_FIXER_URL=.*|RATIO_FIXER_URL=http://${DOCKER_GATEWAY}:5000|" apps/api/production.env
echo "✅ Updated to: http://${DOCKER_GATEWAY}:5000"

# Verify the change
echo ""
echo "Verifying production.env..."
grep RATIO_FIXER_URL apps/api/production.env

# Step 4: Test direct connection from container
echo ""
echo "Step 3: Testing direct connection from API container..."
docker exec arti-api curl -v --connect-timeout 5 http://${DOCKER_GATEWAY}:5000/healthz 2>&1 | head -20

# Step 5: Check firewall
echo ""
echo "Step 4: Checking firewall..."
if command -v ufw >/dev/null 2>&1; then
    if sudo ufw status | grep -q "Status: active"; then
        echo "⚠️  Firewall is active"
        echo "   Checking if port 5000 is allowed..."
        if sudo ufw status | grep -q "5000"; then
            echo "✅ Port 5000 is allowed"
        else
            echo "⚠️  Port 5000 may be blocked"
            echo "   Run: sudo ufw allow 5000/tcp"
        fi
    else
        echo "✅ Firewall is not active"
    fi
fi

# Step 6: Restart API container to pick up new env var
echo ""
echo "Step 5: Restarting API container..."
docker compose restart api
sleep 8

# Step 7: Test API bridge endpoint
echo ""
echo "Step 6: Testing API bridge health endpoint..."
sleep 3
RESPONSE=$(curl -s http://localhost:3001/api/ratio-fixer/health)
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

# Step 8: If still failing, try alternative approaches
if ! echo "$RESPONSE" | grep -q '"available":true'; then
    echo ""
    echo "⚠️  Connection still failing. Trying alternative methods..."
    
    # Try using the host's actual IP address
    HOST_IP=$(hostname -I | awk '{print $1}')
    echo "Trying host IP: $HOST_IP"
    
    # Test from container
    docker exec arti-api curl -s --connect-timeout 3 http://${HOST_IP}:5000/healthz && echo "✅ Works with host IP!" || echo "❌ Host IP also failed"
    
    # If host IP works, update config
    if docker exec arti-api curl -s --connect-timeout 3 http://${HOST_IP}:5000/healthz > /dev/null 2>&1; then
        echo "Updating to use host IP..."
        sed -i "s|RATIO_FIXER_URL=.*|RATIO_FIXER_URL=http://${HOST_IP}:5000|" apps/api/production.env
        docker compose restart api
        sleep 5
        curl -s http://localhost:3001/api/ratio-fixer/health | jq . 2>/dev/null || curl -s http://localhost:3001/api/ratio-fixer/health
    fi
fi

echo ""
echo "=========================================="
echo "Fix Complete!"
echo "=========================================="

