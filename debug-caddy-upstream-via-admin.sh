#!/bin/bash
# Debug Caddy upstream via admin API

set -e

echo "=========================================="
echo "Debugging Caddy Upstream via Admin API"
echo "=========================================="
echo ""

# Step 1: Check Caddy admin API
echo "Step 1: Checking Caddy admin API..."
if curl -s http://localhost:2019/config/ > /dev/null 2>&1; then
    echo "✅ Caddy admin API is accessible"
else
    echo "❌ Caddy admin API not accessible"
    exit 1
fi

# Step 2: Get current Caddy configuration
echo ""
echo "Step 2: Current Caddy configuration..."
curl -s http://localhost:2019/config/ | jq '.apps.http.servers.srv0.routes[0].handle[0].upstreams' 2>/dev/null || echo "Could not parse upstreams"

# Step 3: Try to manually add upstream via admin API
echo ""
echo "Step 3: Testing if we can manually configure upstream..."
# Get the current config
CURRENT_CONFIG=$(curl -s http://localhost:2019/config/)

# Step 4: Check if there are any upstreams configured
echo ""
echo "Step 4: Checking configured upstreams..."
curl -s http://localhost:2019/config/ | jq '.apps.http.servers.srv0.routes[] | select(.match[0].host[] == "api.artistinfluence.com") | .handle[0]' 2>/dev/null || echo "Could not find route"

# Step 5: Test direct connection from Caddy's network namespace
echo ""
echo "Step 5: Testing connection from Caddy's perspective..."
# Caddy runs as root, let's test as root
sudo curl -v --max-time 5 http://127.0.0.1:3001/healthz 2>&1 | grep -E "Connected|Failed|timeout" | head -5

# Step 6: Check if there's a firewall blocking
echo ""
echo "Step 6: Checking firewall rules..."
sudo iptables -L -n | grep 3001 || echo "No specific iptables rules for port 3001"

# Step 7: Try using the Docker bridge IP instead
echo ""
echo "Step 7: Finding Docker bridge IP..."
DOCKER_BRIDGE_IP=$(docker network inspect bridge --format '{{range .IPAM.Config}}{{.Gateway}}{{end}}' 2>/dev/null || echo "")
if [ -n "$DOCKER_BRIDGE_IP" ]; then
    echo "Docker bridge IP: $DOCKER_BRIDGE_IP"
    echo "Testing connection to API container via bridge IP..."
    API_IP=$(docker inspect arti-api --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null || echo "")
    if [ -n "$API_IP" ]; then
        echo "API container IP: $API_IP"
        curl -s --max-time 2 http://${API_IP}:3001/healthz > /dev/null && echo "✅ Can reach API via container IP" || echo "❌ Cannot reach API via container IP"
        
        # Update Caddyfile to use container IP
        echo ""
        echo "Updating Caddyfile to use container IP..."
        sudo sed -i "s|reverse_proxy 127.0.0.1:3001|reverse_proxy ${API_IP}:3001|g" /etc/caddy/Caddyfile
        sudo cp /etc/caddy/Caddyfile /root/arti-marketing-ops/Caddyfile
        
        # Reload Caddy
        CADDY_PID=$(pgrep -f "caddy run" | head -1)
        if [ -n "$CADDY_PID" ]; then
            sudo kill -USR1 $CADDY_PID
            sleep 3
            echo "✅ Caddy reloaded with container IP"
        fi
        
        # Test
        echo ""
        echo "Testing external API with container IP..."
        sleep 2
        EXTERNAL_RESPONSE=$(curl -s -H "Origin: https://app.artistinfluence.com" \
          --max-time 10 \
          https://api.artistinfluence.com/api/ratio-fixer/health 2>&1)
        
        if echo "$EXTERNAL_RESPONSE" | grep -q '"available":true'; then
            echo "✅✅✅ SUCCESS! Using container IP worked! ✅✅✅"
            echo "$EXTERNAL_RESPONSE" | jq . 2>/dev/null || echo "$EXTERNAL_RESPONSE"
        else
            echo "⚠️  Still failing with container IP"
            echo "$EXTERNAL_RESPONSE" | head -20
            # Revert to 127.0.0.1
            sudo sed -i "s|reverse_proxy ${API_IP}:3001|reverse_proxy 127.0.0.1:3001|g" /etc/caddy/Caddyfile
            sudo cp /etc/caddy/Caddyfile /root/arti-marketing-ops/Caddyfile
            sudo kill -USR1 $CADDY_PID
        fi
    fi
else
    echo "Could not find Docker bridge IP"
fi

# Step 8: Alternative - check if we need to use host.docker.internal
echo ""
echo "Step 8: Checking if we need to use host network..."
# The API is accessible on 127.0.0.1:3001 from the host
# But Caddy might be running in a different network context

# Let's try using the host's actual IP
HOST_IP=$(hostname -I | awk '{print $1}')
echo "Host IP: $HOST_IP"
echo "Testing connection to API via host IP..."
curl -s --max-time 2 http://${HOST_IP}:3001/healthz > /dev/null && echo "✅ Can reach API via host IP" || echo "❌ Cannot reach API via host IP"

echo ""
echo "=========================================="
echo "Debug Complete"
echo "=========================================="

