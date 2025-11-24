#!/bin/bash
# Fix Caddy upstream connection to API

set -e

echo "=========================================="
echo "Fixing Caddy Upstream Connection"
echo "=========================================="
echo ""

# Step 1: Verify API is listening on host
echo "Step 1: Checking if API is accessible on localhost:3001..."
if curl -s --max-time 2 http://localhost:3001/healthz > /dev/null 2>&1; then
    echo "✅ API is accessible on localhost:3001"
else
    echo "❌ API is NOT accessible on localhost:3001"
    echo "   This is the problem!"
fi

# Step 2: Check what's listening on port 3001
echo ""
echo "Step 2: Checking what's listening on port 3001..."
ss -tlnp | grep :3001 || netstat -tlnp | grep :3001

# Step 3: Check Docker port mapping
echo ""
echo "Step 3: Checking Docker port mapping..."
docker port arti-api 2>/dev/null || echo "Could not check Docker port mapping"

# Step 4: Test connection from Caddy's perspective
echo ""
echo "Step 4: Testing connection as Caddy would..."
# Caddy runs as root, so test as root
sudo curl -s --max-time 2 http://localhost:3001/healthz > /dev/null 2>&1 && echo "✅ Root can access API" || echo "❌ Root cannot access API"

# Step 5: Check if we need to use 127.0.0.1 instead of localhost
echo ""
echo "Step 5: Testing 127.0.0.1:3001..."
if curl -s --max-time 2 http://127.0.0.1:3001/healthz > /dev/null 2>&1; then
    echo "✅ API accessible on 127.0.0.1:3001"
    USE_IP="127.0.0.1"
else
    echo "❌ API not accessible on 127.0.0.1:3001"
    USE_IP="localhost"
fi

# Step 6: Check Caddyfile current configuration
echo ""
echo "Step 6: Checking current Caddyfile configuration..."
CADDYFILE="/etc/caddy/Caddyfile"
grep "reverse_proxy.*3001" "$CADDYFILE" || echo "No reverse_proxy to 3001 found"

# Step 7: Update Caddyfile if needed
echo ""
echo "Step 7: Updating Caddyfile to use explicit IP..."
if grep -q "reverse_proxy localhost:3001" "$CADDYFILE"; then
    echo "Updating localhost:3001 to ${USE_IP}:3001..."
    sudo sed -i "s|reverse_proxy localhost:3001|reverse_proxy ${USE_IP}:3001|g" "$CADDYFILE"
    
    # Also update the source file
    SOURCE_CADDYFILE="/root/arti-marketing-ops/Caddyfile"
    if [ -f "$SOURCE_CADDYFILE" ]; then
        sudo sed -i "s|reverse_proxy localhost:3001|reverse_proxy ${USE_IP}:3001|g" "$SOURCE_CADDYFILE"
    fi
    
    echo "✅ Updated Caddyfile"
    
    # Verify
    echo ""
    echo "Updated configuration:"
    grep "reverse_proxy.*3001" "$CADDYFILE"
else
    echo "⚠️  No localhost:3001 found to update"
fi

# Step 8: Reload Caddy
echo ""
echo "Step 8: Reloading Caddy..."
CADDY_PID=$(pgrep -f "caddy run" | head -1)
if [ -n "$CADDY_PID" ]; then
    sudo kill -USR1 $CADDY_PID
    sleep 3
    echo "✅ Caddy reloaded"
else
    echo "⚠️  Could not find Caddy process"
fi

# Step 9: Test external API
echo ""
echo "Step 9: Testing external API..."
sleep 2
EXTERNAL_RESPONSE=$(curl -s -H "Origin: https://app.artistinfluence.com" \
  --max-time 10 \
  https://api.artistinfluence.com/api/ratio-fixer/health 2>&1)

if echo "$EXTERNAL_RESPONSE" | grep -q '"available":true'; then
    echo "✅✅✅ SUCCESS! External API is working! ✅✅✅"
    echo "$EXTERNAL_RESPONSE" | jq . 2>/dev/null || echo "$EXTERNAL_RESPONSE"
else
    echo "⚠️  External API still having issues:"
    echo "$EXTERNAL_RESPONSE" | head -20
    
    # Check Caddy logs for latest error
    echo ""
    echo "Latest Caddy error:"
    sudo tail -1 /var/log/caddy/error.log 2>/dev/null | jq -r '.msg' || echo "No error log found"
fi

echo ""
echo "=========================================="
echo "Fix Complete"
echo "=========================================="

