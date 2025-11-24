#!/bin/bash
# Final fix: Check what Caddy is actually using and fix it

set -e

echo "=========================================="
echo "Final Caddy Configuration Check and Fix"
echo "=========================================="
echo ""

# Step 1: Check what Caddyfile Caddy is actually using
echo "Step 1: Checking Caddy process and config..."
CADDY_PID=$(pgrep -f "caddy run" | head -1)
if [ -n "$CADDY_PID" ]; then
    CADDY_CMD=$(ps -p $CADDY_PID -o args=)
    echo "Caddy command: $CADDY_CMD"
    
    # Extract config path
    CONFIG_PATH=$(echo "$CADDY_CMD" | sed -n 's/.*--config \([^ ]*\).*/\1/p')
    echo "Config path from process: $CONFIG_PATH"
fi

# Step 2: Check both possible Caddyfile locations
echo ""
echo "Step 2: Checking Caddyfile locations..."
CADDYFILE1="/etc/caddy/Caddyfile"
CADDYFILE2="/root/arti-marketing-ops/Caddyfile"

for FILE in "$CADDYFILE1" "$CADDYFILE2"; do
    if [ -f "$FILE" ]; then
        echo ""
        echo "Found: $FILE"
        echo "API block:"
        grep -A 10 "api.artistinfluence.com" "$FILE" | head -15
    fi
done

# Step 3: Verify API is accessible
echo ""
echo "Step 3: Verifying API accessibility..."
curl -s http://127.0.0.1:3001/healthz | jq . 2>/dev/null && echo "✅ API accessible" || echo "❌ API not accessible"

# Step 4: Test if we can connect from Caddy's perspective
echo ""
echo "Step 4: Testing connection as Caddy would..."
# Caddy runs as root, test as root
sudo curl -s --max-time 2 http://127.0.0.1:3001/healthz > /dev/null && echo "✅ Root can connect" || echo "❌ Root cannot connect"

# Step 5: Check if there's a Caddy admin API we can query
echo ""
echo "Step 5: Checking Caddy admin API..."
if curl -s http://localhost:2019/config/ > /dev/null 2>&1; then
    echo "✅ Caddy admin API accessible"
    echo "Current reverse_proxy config:"
    curl -s http://localhost:2019/config/ | jq '.apps.http.servers' 2>/dev/null | grep -A 5 "api.artistinfluence.com" || echo "Could not parse config"
else
    echo "⚠️  Caddy admin API not accessible (might be disabled)"
fi

# Step 6: Create a minimal working Caddyfile
echo ""
echo "Step 6: Creating minimal working Caddyfile..."
sudo tee /etc/caddy/Caddyfile > /dev/null << 'CADDYFILE_CONTENT'
api.artistinfluence.com {
    reverse_proxy 127.0.0.1:3001
}
CADDYFILE_CONTENT

echo "✅ Created minimal Caddyfile"

# Step 7: Reload Caddy
echo ""
echo "Step 7: Reloading Caddy..."
if [ -n "$CADDY_PID" ]; then
    sudo kill -USR1 $CADDY_PID
    sleep 5
    echo "✅ Caddy reloaded"
    
    # Check if still running
    if ps -p $CADDY_PID > /dev/null; then
        echo "✅ Caddy is running"
    else
        echo "❌ Caddy died! Check logs:"
        sudo tail -20 /var/log/caddy/error.log 2>/dev/null || echo "No error log"
        exit 1
    fi
fi

# Step 8: Test external API
echo ""
echo "Step 8: Testing external API with minimal config..."
sleep 3
EXTERNAL_RESPONSE=$(curl -s -H "Origin: https://app.artistinfluence.com" \
  --max-time 15 \
  https://api.artistinfluence.com/api/ratio-fixer/health 2>&1)

if echo "$EXTERNAL_RESPONSE" | grep -q '"available":true'; then
    echo "✅✅✅ SUCCESS! External API is working! ✅✅✅"
    echo "$EXTERNAL_RESPONSE" | jq . 2>/dev/null || echo "$EXTERNAL_RESPONSE"
    
    # Now add back the full configuration
    echo ""
    echo "Adding back full configuration..."
    sudo tee /etc/caddy/Caddyfile > /dev/null << 'FULL_CADDYFILE'
api.artistinfluence.com {
    reverse_proxy 127.0.0.1:3001
    
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
    
    @options {
        method OPTIONS
    }
    respond @options 204
}

n8n.artistinfluence.com {
    reverse_proxy 127.0.0.1:5678
    
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
    }
}

health.artistinfluence.com {
    respond /healthz 200
    respond * "Not Found" 404
}
FULL_CADDYFILE
    
    sudo kill -USR1 $CADDY_PID
    sleep 3
    echo "✅ Full configuration restored"
    
else
    echo "⚠️  Still failing with minimal config:"
    echo "$EXTERNAL_RESPONSE" | head -30
    
    # Check Caddy logs
    echo ""
    echo "Latest Caddy errors:"
    sudo tail -3 /var/log/caddy/error.log 2>/dev/null | jq -r '.msg' 2>/dev/null || sudo tail -3 /var/log/caddy/error.log 2>/dev/null || echo "No error log"
    
    # Check if port 3001 is actually accessible
    echo ""
    echo "Checking port 3001 accessibility..."
    sudo netstat -tlnp | grep :3001 || ss -tlnp | grep :3001
fi

echo ""
echo "=========================================="
echo "Fix Complete"
echo "=========================================="

