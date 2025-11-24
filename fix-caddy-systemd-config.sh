#!/bin/bash
# Fix Caddy systemd service configuration

set -e

echo "=========================================="
echo "Fixing Caddy Systemd Configuration"
echo "=========================================="
echo ""

# Step 1: Check Caddy service status
echo "Step 1: Checking Caddy service..."
sudo systemctl status caddy --no-pager | head -10

# Step 2: Find Caddyfile location
echo ""
echo "Step 2: Finding Caddyfile location..."
CADDYFILE_PATH="/etc/caddy/Caddyfile"
if [ -f "$CADDYFILE_PATH" ]; then
    echo "✅ Found Caddyfile at: $CADDYFILE_PATH"
else
    echo "⚠️  Caddyfile not at /etc/caddy/Caddyfile"
    # Check Caddy process for config path
    CADDYFILE_PATH=$(ps aux | grep caddy | grep -oP '--config \K[^\s]+' | head -1 || echo "/etc/caddy/Caddyfile")
    echo "   Trying: $CADDYFILE_PATH"
fi

# Step 3: Backup and check current Caddyfile
echo ""
echo "Step 3: Checking current Caddyfile..."
if [ -f "$CADDYFILE_PATH" ]; then
    sudo cp "$CADDYFILE_PATH" "${CADDYFILE_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
    echo "✅ Backup created"
    
    # Show relevant section
    echo ""
    echo "Current API proxy configuration:"
    sudo grep -A 5 "api.artistinfluence.com" "$CADDYFILE_PATH" || echo "No api.artistinfluence.com block found"
    sudo grep -A 5 "reverse_proxy.*300" "$CADDYFILE_PATH" || echo "No reverse_proxy found"
else
    echo "❌ Caddyfile not found at $CADDYFILE_PATH"
    exit 1
fi

# Step 4: Check what port API is actually on
echo ""
echo "Step 4: Verifying API port..."
API_PORT=$(docker port arti-api 2>/dev/null | grep 3001 | cut -d ':' -f2 || echo "3001")
echo "API container is on port: $API_PORT"

# Step 5: Update Caddyfile if needed
echo ""
echo "Step 5: Checking if Caddyfile needs update..."
if sudo grep -q "reverse_proxy.*3002" "$CADDYFILE_PATH"; then
    echo "⚠️  Caddyfile is proxying to port 3002 (wrong!)"
    echo "   Updating to port 3001..."
    
    # Update the Caddyfile
    sudo sed -i 's|reverse_proxy localhost:3002|reverse_proxy localhost:3001|g' "$CADDYFILE_PATH"
    sudo sed -i 's|reverse_proxy.*:3002|reverse_proxy localhost:3001|g' "$CADDYFILE_PATH"
    
    echo "✅ Updated Caddyfile"
    
    # Verify the change
    echo ""
    echo "Updated configuration:"
    sudo grep -A 3 "reverse_proxy.*300" "$CADDYFILE_PATH"
    
    # Step 6: Reload Caddy
    echo ""
    echo "Step 6: Reloading Caddy..."
    sudo systemctl reload caddy
    sleep 3
    
    echo "✅ Caddy reloaded"
else
    echo "✅ Caddyfile already configured correctly (or using different format)"
fi

# Step 7: Test external API
echo ""
echo "Step 7: Testing external API after fix..."
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
    
    echo ""
    echo "Checking Caddy logs..."
    sudo journalctl -u caddy -n 20 --no-pager | tail -10
fi

echo ""
echo "=========================================="
echo "Fix Complete"
echo "=========================================="

