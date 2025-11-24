#!/bin/bash
# Properly restart Caddy and verify configuration

set -e

echo "=========================================="
echo "Restarting Caddy Properly"
echo "=========================================="
echo ""

# Step 1: Find Caddy process
echo "Step 1: Finding Caddy process..."
CADDY_PID=$(pgrep -f "caddy run" | head -1)
if [ -n "$CADDY_PID" ]; then
    echo "Caddy PID: $CADDY_PID"
    CADDY_CMD=$(ps -p $CADDY_PID -o args=)
    echo "Caddy command: $CADDY_CMD"
else
    echo "⚠️  Caddy process not found"
fi

# Step 2: Check Caddyfile
echo ""
echo "Step 2: Checking Caddyfile..."
CADDYFILE="/etc/caddy/Caddyfile"
if [ -f "$CADDYFILE" ]; then
    echo "Caddyfile exists at: $CADDYFILE"
    echo "API configuration:"
    grep -A 5 "api.artistinfluence.com" "$CADDYFILE" | head -10
else
    echo "❌ Caddyfile not found!"
    exit 1
fi

# Step 3: Stop Caddy
echo ""
echo "Step 3: Stopping Caddy..."
if [ -n "$CADDY_PID" ]; then
    sudo kill $CADDY_PID
    sleep 2
    if ps -p $CADDY_PID > /dev/null 2>&1; then
        echo "Force killing..."
        sudo kill -9 $CADDY_PID
        sleep 1
    fi
    echo "✅ Caddy stopped"
else
    echo "Caddy was not running"
fi

# Step 4: Verify API is accessible
echo ""
echo "Step 4: Verifying API is accessible..."
curl -s http://127.0.0.1:3001/healthz | jq . 2>/dev/null && echo "✅ API is accessible" || echo "❌ API not accessible"

# Step 5: Start Caddy
echo ""
echo "Step 5: Starting Caddy..."
# Find caddy binary
CADDY_BIN=$(which caddy 2>/dev/null || find /usr -name caddy 2>/dev/null | head -1 || echo "/usr/local/bin/caddy")

if [ -f "$CADDY_BIN" ] || command -v caddy >/dev/null 2>&1; then
    echo "Using Caddy binary: $CADDY_BIN"
    # Start Caddy in background
    sudo nohup caddy run --config /etc/caddy/Caddyfile --adapter caddyfile > /var/log/caddy/startup.log 2>&1 &
    sleep 3
    
    # Check if it started
    NEW_PID=$(pgrep -f "caddy run" | head -1)
    if [ -n "$NEW_PID" ]; then
        echo "✅ Caddy started (PID: $NEW_PID)"
    else
        echo "❌ Caddy failed to start. Check logs:"
        sudo tail -20 /var/log/caddy/startup.log 2>/dev/null || echo "No startup log"
        exit 1
    fi
else
    echo "❌ Caddy binary not found!"
    echo "Trying to find it..."
    find / -name caddy 2>/dev/null | head -5
    exit 1
fi

# Step 6: Wait for Caddy to be ready
echo ""
echo "Step 6: Waiting for Caddy to be ready..."
sleep 5

# Check if Caddy is responding
if curl -s http://localhost:2019/config/ > /dev/null 2>&1; then
    echo "✅ Caddy admin API is responding"
else
    echo "⚠️  Caddy admin API not responding yet"
fi

# Step 7: Check Caddy logs
echo ""
echo "Step 7: Checking Caddy logs..."
sudo tail -10 /var/log/caddy/error.log 2>/dev/null | jq -r '.msg' 2>/dev/null || sudo tail -10 /var/log/caddy/error.log 2>/dev/null || echo "No recent errors"

# Step 8: Test external API
echo ""
echo "Step 8: Testing external API..."
sleep 3
EXTERNAL_RESPONSE=$(curl -s -H "Origin: https://app.artistinfluence.com" \
  --max-time 15 \
  https://api.artistinfluence.com/api/ratio-fixer/health 2>&1)

if echo "$EXTERNAL_RESPONSE" | grep -q '"available":true'; then
    echo "✅✅✅ SUCCESS! External API is working! ✅✅✅"
    echo "$EXTERNAL_RESPONSE" | jq . 2>/dev/null || echo "$EXTERNAL_RESPONSE"
    
    # Check CORS headers
    echo ""
    echo "Checking CORS headers..."
    curl -I -H "Origin: https://app.artistinfluence.com" \
      https://api.artistinfluence.com/api/ratio-fixer/health 2>&1 | grep -i "access-control" || echo "No CORS headers"
else
    echo "⚠️  External API response:"
    echo "$EXTERNAL_RESPONSE" | head -30
    
    # Test through localhost
    echo ""
    echo "Testing through localhost (HTTP)..."
    curl -v -H "Host: api.artistinfluence.com" \
      http://localhost/api/ratio-fixer/health 2>&1 | grep -E "< HTTP|^\{|error" | head -10
fi

echo ""
echo "=========================================="
echo "Restart Complete"
echo "=========================================="

