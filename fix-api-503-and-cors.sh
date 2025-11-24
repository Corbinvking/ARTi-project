#!/bin/bash
# Fix API 503 error and CORS issues

set -e

echo "=========================================="
echo "Fixing API 503 and CORS Issues"
echo "=========================================="
echo ""

cd ~/arti-marketing-ops

# Step 1: Verify API is working locally
echo "Step 1: Testing API locally..."
LOCAL_RESPONSE=$(curl -s http://localhost:3001/api/ratio-fixer/health)
echo "$LOCAL_RESPONSE" | jq . 2>/dev/null || echo "$LOCAL_RESPONSE"

if ! echo "$LOCAL_RESPONSE" | grep -q '"available":true'; then
    echo "❌ API not working locally - fix this first!"
    exit 1
fi

# Step 2: Check Flask response time
echo ""
echo "Step 2: Checking Flask response time..."
HOST_IP=$(hostname -I | awk '{print $1}')
FLASK_TIME=$(time curl -s -o /dev/null -w "%{time_total}" http://${HOST_IP}:5000/healthz 2>&1 | tail -1)
echo "Flask response time: ${FLASK_TIME}s"

if (( $(echo "$FLASK_TIME > 2.0" | bc -l) )); then
    echo "⚠️  Flask is slow (>2s) - this may cause API timeouts"
else
    echo "✅ Flask response time is acceptable"
fi

# Step 3: Check Caddy configuration
echo ""
echo "Step 3: Checking Caddy configuration..."
if docker ps | grep -q arti-caddy; then
    echo "✅ Caddy container is running"
    
    # Check what Caddyfile is mounted
    CADDYFILE_PATH=$(docker inspect arti-caddy --format '{{range .Mounts}}{{if eq .Destination "/etc/caddy/Caddyfile"}}{{.Source}}{{end}}{{end}}')
    echo "Caddyfile path: $CADDYFILE_PATH"
    
    # Check if it's proxying to correct port
    if [ -f "$CADDYFILE_PATH" ]; then
        if grep -q "reverse_proxy.*3002" "$CADDYFILE_PATH"; then
            echo "⚠️  Caddyfile is proxying to port 3002 (wrong!)"
            echo "   Should be 3001"
        elif grep -q "reverse_proxy.*3001" "$CADDYFILE_PATH"; then
            echo "✅ Caddyfile is proxying to port 3001 (correct)"
        else
            echo "⚠️  Could not determine proxy port from Caddyfile"
        fi
    fi
else
    echo "⚠️  Caddy container not found"
    echo "   API might be accessed directly or through different proxy"
fi

# Step 4: Test external API access
echo ""
echo "Step 4: Testing external API access..."
EXTERNAL_RESPONSE=$(curl -s -H "Origin: https://app.artistinfluence.com" \
  --max-time 10 \
  https://api.artistinfluence.com/api/ratio-fixer/health 2>&1)

if echo "$EXTERNAL_RESPONSE" | grep -q '"available":true'; then
    echo "✅ External API is working!"
    echo "$EXTERNAL_RESPONSE" | jq . 2>/dev/null || echo "$EXTERNAL_RESPONSE"
elif echo "$EXTERNAL_RESPONSE" | grep -q "503\|Service Unavailable"; then
    echo "❌ External API returning 503"
    echo "Response: $EXTERNAL_RESPONSE"
    echo ""
    echo "Possible causes:"
    echo "1. Caddy proxying to wrong port"
    echo "2. API timing out when reaching Flask"
    echo "3. Caddy health check failing"
else
    echo "⚠️  External API issue:"
    echo "$EXTERNAL_RESPONSE"
fi

# Step 5: Check Caddy logs
echo ""
echo "Step 5: Checking Caddy logs (last 20 lines)..."
if docker ps | grep -q arti-caddy; then
    docker logs arti-caddy --tail 20 2>&1 | grep -i "api\|ratio\|error\|503" || echo "No relevant errors in Caddy logs"
fi

# Step 6: Recommendations
echo ""
echo "=========================================="
echo "Recommendations"
echo "=========================================="
echo ""
echo "If external API is returning 503:"
echo "1. Check Caddyfile is proxying to port 3001 (not 3002)"
echo "2. Increase API timeout in Caddyfile if Flask is slow"
echo "3. Restart Caddy: docker compose restart caddy"
echo ""
echo "If CORS headers are missing:"
echo "1. Caddy should NOT add CORS headers (API handles it)"
echo "2. Verify API CORS config allows app.artistinfluence.com"
echo "3. Check API logs for CORS errors"
echo ""

