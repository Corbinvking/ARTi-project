#!/bin/bash
# Fix Caddy proxy port configuration

set -e

echo "=========================================="
echo "Fixing Caddy Proxy Port"
echo "=========================================="
echo ""

# Step 1: Find actual Caddyfile location
echo "Step 1: Finding Caddyfile..."
ACTUAL_CADDYFILE="/root/arti-marketing-ops/Caddyfile"
EXPECTED_CADDYFILE="/etc/caddy/Caddyfile"

if [ -f "$ACTUAL_CADDYFILE" ]; then
    echo "✅ Found Caddyfile at: $ACTUAL_CADDYFILE"
    CADDYFILE="$ACTUAL_CADDYFILE"
elif [ -f "$EXPECTED_CADDYFILE" ]; then
    echo "✅ Found Caddyfile at: $EXPECTED_CADDYFILE"
    CADDYFILE="$EXPECTED_CADDYFILE"
else
    echo "❌ Caddyfile not found"
    exit 1
fi

# Step 2: Backup
echo ""
echo "Step 2: Creating backup..."
sudo cp "$CADDYFILE" "${CADDYFILE}.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Backup created"

# Step 3: Show current API configuration
echo ""
echo "Step 3: Current API proxy configuration..."
echo "----------------------------------------"
grep -A 10 "api.artistinfluence.com" "$CADDYFILE" || echo "No api.artistinfluence.com block found"
echo ""

# Step 4: Check what port it's proxying to
echo "Step 4: Checking proxy ports..."
grep "reverse_proxy.*300" "$CADDYFILE" || echo "No port 300x found in reverse_proxy"

# Step 5: Update to port 3001
echo ""
echo "Step 5: Updating proxy to port 3001..."
if grep -q "reverse_proxy.*3002" "$CADDYFILE"; then
    echo "⚠️  Found port 3002, updating to 3001..."
    sudo sed -i 's|reverse_proxy.*:3002|reverse_proxy localhost:3001|g' "$CADDYFILE"
    sudo sed -i 's|reverse_proxy localhost:3002|reverse_proxy localhost:3001|g' "$CADDYFILE"
    echo "✅ Updated"
    
    # Verify
    echo ""
    echo "Updated configuration:"
    grep "reverse_proxy.*300" "$CADDYFILE" || echo "No port 300x found"
elif grep -q "reverse_proxy.*3001" "$CADDYFILE"; then
    echo "✅ Already configured for port 3001"
else
    echo "⚠️  Could not find port 3002 or 3001 in reverse_proxy"
    echo "   Showing all reverse_proxy lines:"
    grep "reverse_proxy" "$CADDYFILE" | head -5
fi

# Step 6: Copy to expected location if needed
echo ""
echo "Step 6: Ensuring Caddyfile is in expected location..."
if [ "$CADDYFILE" != "$EXPECTED_CADDYFILE" ]; then
    echo "Copying to $EXPECTED_CADDYFILE..."
    sudo mkdir -p /etc/caddy
    sudo cp "$CADDYFILE" "$EXPECTED_CADDYFILE"
    echo "✅ Copied to expected location"
fi

# Step 7: Reload Caddy
echo ""
echo "Step 7: Reloading Caddy..."
CADDY_PID=$(pgrep -f "caddy run" | head -1)
if [ -n "$CADDY_PID" ]; then
    echo "Sending USR1 signal to Caddy (PID $CADDY_PID)..."
    sudo kill -USR1 $CADDY_PID
    sleep 2
    echo "✅ Caddy reloaded"
else
    echo "⚠️  Could not find Caddy process"
fi

# Step 8: Test external API
echo ""
echo "Step 8: Testing external API..."
sleep 3
EXTERNAL_RESPONSE=$(curl -s -H "Origin: https://app.artistinfluence.com" \
  --max-time 10 \
  https://api.artistinfluence.com/api/ratio-fixer/health 2>&1)

if echo "$EXTERNAL_RESPONSE" | grep -q '"available":true'; then
    echo "✅✅✅ SUCCESS! External API is working! ✅✅✅"
    echo "$EXTERNAL_RESPONSE" | jq . 2>/dev/null || echo "$EXTERNAL_RESPONSE"
else
    echo "⚠️  External API still having issues:"
    echo "$EXTERNAL_RESPONSE" | head -20
    
    echo ""
    echo "Checking if API is accessible on port 3001..."
    curl -s http://localhost:3001/api/ratio-fixer/health | jq . 2>/dev/null || echo "Local API test failed"
fi

echo ""
echo "=========================================="
echo "Fix Complete"
echo "=========================================="

