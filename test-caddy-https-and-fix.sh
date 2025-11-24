#!/bin/bash
# Test Caddy HTTPS and fix health check issues

set -e

echo "=========================================="
echo "Testing Caddy HTTPS and Fixing Issues"
echo "=========================================="
echo ""

# Step 1: Test API health endpoint
echo "Step 1: Testing API health endpoint..."
curl -s http://127.0.0.1:3001/healthz && echo " ✅" || echo " ❌"

# Step 2: Test through Caddy HTTP (should redirect)
echo ""
echo "Step 2: Testing through Caddy HTTP (localhost)..."
curl -v -H "Host: api.artistinfluence.com" \
  http://localhost/api/ratio-fixer/health 2>&1 | grep -E "< HTTP|Location|^\{|error" | head -10

# Step 3: Test through Caddy HTTPS (localhost)
echo ""
echo "Step 3: Testing through Caddy HTTPS (localhost)..."
curl -v -k -H "Host: api.artistinfluence.com" \
  https://localhost/api/ratio-fixer/health 2>&1 | grep -E "< HTTP|^\{|error|upstream" | head -15

# Step 4: Check if health check is the issue - disable it temporarily
echo ""
echo "Step 4: Checking Caddyfile and potentially disabling health check..."
CADDYFILE="/etc/caddy/Caddyfile"

# Check if health_uri is causing issues
if grep -q "health_uri" "$CADDYFILE"; then
    echo "Health check is configured. Testing without it..."
    
    # Create a version without health check
    sudo cp "$CADDYFILE" "${CADDYFILE}.with-health"
    
    # Remove health check temporarily
    sudo sed -i '/health_uri/d; /health_interval/d; /health_timeout/d' "$CADDYFILE"
    
    echo "✅ Removed health check temporarily"
    
    # Reload Caddy
    CADDY_PID=$(pgrep -f "caddy run" | head -1)
    if [ -n "$CADDY_PID" ]; then
        sudo kill -USR1 $CADDY_PID
        sleep 3
        echo "✅ Caddy reloaded"
    fi
    
    # Test again
    echo ""
    echo "Testing after removing health check..."
    sleep 2
    curl -s -k -H "Host: api.artistinfluence.com" \
      https://localhost/api/ratio-fixer/health | jq . 2>/dev/null || echo "Still failing"
    
    # Test external
    echo ""
    echo "Testing external API..."
    EXTERNAL_RESPONSE=$(curl -s -H "Origin: https://app.artistinfluence.com" \
      --max-time 10 \
      https://api.artistinfluence.com/api/ratio-fixer/health 2>&1)
    
    if echo "$EXTERNAL_RESPONSE" | grep -q '"available":true'; then
        echo "✅✅✅ SUCCESS! External API is working! ✅✅✅"
        echo "$EXTERNAL_RESPONSE" | jq . 2>/dev/null || echo "$EXTERNAL_RESPONSE"
        
        # Keep the version without health check
        echo ""
        echo "✅ Keeping configuration without health check"
    else
        echo "⚠️  Still failing, restoring health check..."
        sudo cp "${CADDYFILE}.with-health" "$CADDYFILE"
        sudo kill -USR1 $CADDY_PID
        sleep 2
    fi
else
    echo "No health check configured"
fi

# Step 5: Check Caddy logs for latest errors
echo ""
echo "Step 5: Latest Caddy errors..."
sudo tail -5 /var/log/caddy/error.log 2>/dev/null | jq -r '.msg' 2>/dev/null || sudo tail -5 /var/log/caddy/error.log 2>/dev/null || echo "No error log"

# Step 6: Test with explicit transport settings
echo ""
echo "Step 6: Testing with explicit transport in Caddyfile..."
# Update reverse_proxy to include transport
sudo sed -i 's|reverse_proxy 127.0.0.1:3001 {|reverse_proxy 127.0.0.1:3001 {\n        transport http {\n            dial_timeout 5s\n            response_header_timeout 10s\n        }|' "$CADDYFILE"

# Reload and test
CADDY_PID=$(pgrep -f "caddy run" | head -1)
if [ -n "$CADDY_PID" ]; then
    sudo kill -USR1 $CADDY_PID
    sleep 3
fi

echo ""
echo "Testing after adding transport settings..."
sleep 2
EXTERNAL_RESPONSE=$(curl -s -H "Origin: https://app.artistinfluence.com" \
  --max-time 10 \
  https://api.artistinfluence.com/api/ratio-fixer/health 2>&1)

if echo "$EXTERNAL_RESPONSE" | grep -q '"available":true'; then
    echo "✅✅✅ SUCCESS! External API is working! ✅✅✅"
    echo "$EXTERNAL_RESPONSE" | jq . 2>/dev/null || echo "$EXTERNAL_RESPONSE"
else
    echo "⚠️  Still having issues:"
    echo "$EXTERNAL_RESPONSE" | head -20
fi

echo ""
echo "=========================================="
echo "Test Complete"
echo "=========================================="

