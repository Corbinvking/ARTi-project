#!/bin/bash
# Fix Caddy to use localhost instead of Docker container name

set -e

echo "=========================================="
echo "Fixing Caddy Docker Container Name Issue"
echo "=========================================="
echo ""

CADDYFILE="/root/arti-marketing-ops/Caddyfile"

# Step 1: Check current configuration
echo "Step 1: Checking current reverse_proxy configuration..."
grep "reverse_proxy" "$CADDYFILE" | head -5

# Step 2: Update Docker container names to localhost
echo ""
echo "Step 2: Updating Docker container names to localhost..."
sudo sed -i 's|reverse_proxy api:3001|reverse_proxy localhost:3001|g' "$CADDYFILE"
sudo sed -i 's|reverse_proxy api:3002|reverse_proxy localhost:3001|g' "$CADDYFILE"
sudo sed -i 's|reverse_proxy n8n:5678|reverse_proxy localhost:5678|g' "$CADDYFILE"

# Step 3: Verify changes
echo ""
echo "Step 3: Verifying changes..."
grep "reverse_proxy" "$CADDYFILE" | head -5

# Step 4: Copy to expected location
echo ""
echo "Step 4: Copying to /etc/caddy/Caddyfile..."
sudo cp "$CADDYFILE" /etc/caddy/Caddyfile
echo "✅ Copied"

# Step 5: Reload Caddy
echo ""
echo "Step 5: Reloading Caddy..."
CADDY_PID=$(pgrep -f "caddy run" | head -1)
if [ -n "$CADDY_PID" ]; then
    sudo kill -USR1 $CADDY_PID
    sleep 3
    echo "✅ Caddy reloaded"
else
    echo "⚠️  Could not find Caddy process"
fi

# Step 6: Test external API
echo ""
echo "Step 6: Testing external API..."
sleep 2
EXTERNAL_RESPONSE=$(curl -s -H "Origin: https://app.artistinfluence.com" \
  --max-time 10 \
  https://api.artistinfluence.com/api/ratio-fixer/health 2>&1)

if echo "$EXTERNAL_RESPONSE" | grep -q '"available":true'; then
    echo "✅✅✅ SUCCESS! External API is working! ✅✅✅"
    echo "$EXTERNAL_RESPONSE" | jq . 2>/dev/null || echo "$EXTERNAL_RESPONSE"
else
    echo "⚠️  External API response:"
    echo "$EXTERNAL_RESPONSE" | head -30
    
    # Check Caddy logs
    echo ""
    echo "Checking Caddy access logs (if available)..."
    sudo tail -20 /var/log/caddy/access.log 2>/dev/null || echo "No access log found"
fi

echo ""
echo "=========================================="
echo "Fix Complete"
echo "=========================================="

