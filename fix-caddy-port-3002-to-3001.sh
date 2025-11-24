#!/bin/bash
# Fix Caddy to use port 3001 instead of 3002

set -e

echo "=========================================="
echo "Fixing Caddy Port 3002 → 3001"
echo "=========================================="
echo ""

# Step 1: Check current Caddyfile
echo "Step 1: Checking current Caddyfile..."
CADDYFILE="/etc/caddy/Caddyfile"
grep "reverse_proxy.*300" "$CADDYFILE" || echo "No reverse_proxy found"

# Step 2: Check Caddy admin API for actual config
echo ""
echo "Step 2: Checking Caddy admin API for actual upstream..."
ACTUAL_UPSTREAM=$(curl -s http://localhost:2019/config/ | jq -r '.apps.http.servers.srv0.routes[] | select(.handle[0].upstreams) | .handle[0].upstreams[0].dial' 2>/dev/null | grep 300 | head -1)
echo "Actual upstream in Caddy: $ACTUAL_UPSTREAM"

if echo "$ACTUAL_UPSTREAM" | grep -q ":3002"; then
    echo "⚠️  Caddy is using port 3002 (wrong!)"
else
    echo "✅ Caddy is using correct port"
fi

# Step 3: Update Caddyfile to ensure port 3001
echo ""
echo "Step 3: Updating Caddyfile to use port 3001..."
# Replace any instance of 3002 with 3001
sudo sed -i 's|:3002|:3001|g' "$CADDYFILE"
sudo sed -i 's|3002|3001|g' "$CADDYFILE"

# Also update source file
SOURCE_CADDYFILE="/root/arti-marketing-ops/Caddyfile"
if [ -f "$SOURCE_CADDYFILE" ]; then
    sudo sed -i 's|:3002|:3001|g' "$SOURCE_CADDYFILE"
    sudo sed -i 's|3002|3001|g' "$SOURCE_CADDYFILE"
fi

echo "✅ Updated Caddyfile"

# Step 4: Verify the change
echo ""
echo "Step 4: Verifying Caddyfile..."
grep "reverse_proxy.*300" "$CADDYFILE" || echo "No reverse_proxy found"

# Step 5: Reload Caddy
echo ""
echo "Step 5: Reloading Caddy..."
CADDY_PID=$(pgrep -f "caddy run" | head -1)
if [ -n "$CADDY_PID" ]; then
    sudo kill -USR1 $CADDY_PID
    sleep 5
    echo "✅ Caddy reloaded"
    
    # Verify Caddy is still running
    if ps -p $CADDY_PID > /dev/null; then
        echo "✅ Caddy is running"
    else
        echo "❌ Caddy died! Check logs:"
        sudo tail -20 /var/log/caddy/error.log 2>/dev/null || echo "No error log"
        exit 1
    fi
fi

# Step 6: Check if Caddy picked up the change
echo ""
echo "Step 6: Verifying Caddy picked up the change..."
sleep 2
NEW_UPSTREAM=$(curl -s http://localhost:2019/config/ | jq -r '.apps.http.servers.srv0.routes[] | select(.handle[0].upstreams) | .handle[0].upstreams[0].dial' 2>/dev/null | grep 300 | head -1)
echo "New upstream in Caddy: $NEW_UPSTREAM"

if echo "$NEW_UPSTREAM" | grep -q ":3001"; then
    echo "✅ Caddy is now using port 3001"
else
    echo "⚠️  Caddy still not using port 3001"
    echo "   Might need to restart Caddy completely"
    
    # Try restarting Caddy
    echo ""
    echo "Restarting Caddy service..."
    if systemctl list-units | grep -q caddy; then
        sudo systemctl restart caddy
    else
        # Caddy is not a systemd service, kill and restart manually
        sudo kill $CADDY_PID
        sleep 2
        sudo caddy run --config /etc/caddy/Caddyfile --adapter caddyfile &
        sleep 3
    fi
    echo "✅ Caddy restarted"
fi

# Step 7: Test external API
echo ""
echo "Step 7: Testing external API..."
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
    echo "⚠️  External API still having issues:"
    echo "$EXTERNAL_RESPONSE" | head -30
    
    # Check latest Caddy errors
    echo ""
    echo "Latest Caddy errors:"
    sudo tail -3 /var/log/caddy/error.log 2>/dev/null | jq -r '.msg' 2>/dev/null || sudo tail -3 /var/log/caddy/error.log 2>/dev/null || echo "No error log"
fi

echo ""
echo "=========================================="
echo "Fix Complete"
echo "=========================================="

