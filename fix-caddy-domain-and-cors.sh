#!/bin/bash
# Fix Caddy domain and CORS configuration

set -e

echo "=========================================="
echo "Fixing Caddy Domain and CORS"
echo "=========================================="
echo ""

CADDYFILE="/root/arti-marketing-ops/Caddyfile"

# Step 1: Check current domain configuration
echo "Step 1: Checking current domain configuration..."
grep -E "^[a-z]+\." "$CADDYFILE" | head -5

# Step 2: Update domain from yourdomain.com to artistinfluence.com
echo ""
echo "Step 2: Updating domain to artistinfluence.com..."
sudo sed -i 's|api.yourdomain.com|api.artistinfluence.com|g' "$CADDYFILE"
sudo sed -i 's|n8n.yourdomain.com|n8n.artistinfluence.com|g' "$CADDYFILE"
sudo sed -i 's|health.yourdomain.com|health.artistinfluence.com|g' "$CADDYFILE"
echo "✅ Domains updated"

# Step 3: Update CORS origin
echo ""
echo "Step 3: Updating CORS origin..."
sudo sed -i 's|app.yourdomain.com|app.artistinfluence.com|g' "$CADDYFILE"
sudo sed -i 's|https://\*\.vercel\.app|https://*.vercel.app|g' "$CADDYFILE"
echo "✅ CORS origin updated"

# Step 4: Verify reverse_proxy is localhost
echo ""
echo "Step 4: Verifying reverse_proxy configuration..."
grep "reverse_proxy" "$CADDYFILE"

# Step 5: Show updated configuration
echo ""
echo "Step 5: Updated API block..."
grep -A 20 "api.artistinfluence.com" "$CADDYFILE" || echo "Block not found"

# Step 6: Copy to expected location
echo ""
echo "Step 6: Copying to /etc/caddy/Caddyfile..."
sudo cp "$CADDYFILE" /etc/caddy/Caddyfile
echo "✅ Copied"

# Step 7: Validate Caddyfile syntax
echo ""
echo "Step 7: Validating Caddyfile syntax..."
if command -v caddy >/dev/null 2>&1; then
    caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile && echo "✅ Caddyfile is valid" || echo "⚠️  Caddyfile validation failed"
else
    echo "⚠️  Caddy command not found, skipping validation"
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
  --max-time 15 \
  https://api.artistinfluence.com/api/ratio-fixer/health 2>&1)

if echo "$EXTERNAL_RESPONSE" | grep -q '"available":true'; then
    echo "✅✅✅ SUCCESS! External API is working! ✅✅✅"
    echo "$EXTERNAL_RESPONSE" | jq . 2>/dev/null || echo "$EXTERNAL_RESPONSE"
    
    # Check CORS headers
    echo ""
    echo "Checking CORS headers..."
    curl -I -H "Origin: https://app.artistinfluence.com" \
      https://api.artistinfluence.com/api/ratio-fixer/health 2>&1 | grep -i "access-control" || echo "No CORS headers found"
else
    echo "⚠️  External API response:"
    echo "$EXTERNAL_RESPONSE" | head -30
    
    # Try without HTTPS (if Cloudflare is the issue)
    echo ""
    echo "Testing direct connection (bypassing Cloudflare)..."
    HOST_IP=$(hostname -I | awk '{print $1}')
    curl -s -H "Host: api.artistinfluence.com" \
      -H "Origin: https://app.artistinfluence.com" \
      http://${HOST_IP}/api/ratio-fixer/health | jq . 2>/dev/null || echo "Direct connection also failed"
fi

echo ""
echo "=========================================="
echo "Fix Complete"
echo "=========================================="

