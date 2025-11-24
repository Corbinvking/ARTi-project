#!/bin/bash
# Fix Caddyfile.production syntax and port

set -e

echo "=========================================="
echo "Fixing Caddyfile.production"
echo "=========================================="
echo ""

CADDYFILE="/root/arti-marketing-ops/caddy/Caddyfile.production"

# Step 1: Pull latest changes
echo "Step 1: Pulling latest changes..."
cd /root/arti-marketing-ops
git pull origin main

# Step 2: Verify the file exists
echo ""
echo "Step 2: Verifying Caddyfile exists..."
if [ ! -f "$CADDYFILE" ]; then
    echo "❌ Caddyfile not found at $CADDYFILE"
    exit 1
fi
echo "✅ Caddyfile found"

# Step 3: Check current port
echo ""
echo "Step 3: Checking current port configuration..."
grep "reverse_proxy.*300" "$CADDYFILE" | head -5

# Step 4: Ensure port is 3001
echo ""
echo "Step 4: Ensuring port is 3001..."
sudo sed -i 's|reverse_proxy localhost:3002|reverse_proxy localhost:3001|g' "$CADDYFILE"
sudo sed -i 's|reverse_proxy.*:3002|reverse_proxy localhost:3001|g' "$CADDYFILE"

# Step 5: Check for syntax issues (BOM, encoding, etc.)
echo ""
echo "Step 5: Checking file encoding..."
file "$CADDYFILE"
head -5 "$CADDYFILE" | od -c | head -3

# Step 6: Validate the file starts correctly
echo ""
echo "Step 6: Validating file structure..."
if ! head -1 "$CADDYFILE" | grep -q "^#"; then
    echo "⚠️  File might have BOM or encoding issues"
    # Remove BOM if present
    sudo sed -i '1s/^\xEF\xBB\xBF//' "$CADDYFILE"
fi

# Step 7: Verify the global options block
echo ""
echo "Step 7: Verifying global options block..."
if ! head -20 "$CADDYFILE" | grep -q "^# Global options"; then
    echo "⚠️  Global options comment missing"
fi

# Step 8: Restart Caddy container
echo ""
echo "Step 8: Restarting Caddy container..."
docker restart supabase_caddy_arti-marketing-ops
sleep 5

# Check if it's running
if docker ps | grep -q supabase_caddy_arti-marketing-ops; then
    echo "✅ Caddy container is running"
    
    # Check logs for errors
    echo ""
    echo "Checking container logs..."
    docker logs --tail 10 supabase_caddy_arti-marketing-ops 2>&1 | grep -i "error\|unrecognized" || echo "No errors in recent logs"
else
    echo "❌ Caddy container failed to start"
    echo "Logs:"
    docker logs --tail 20 supabase_caddy_arti-marketing-ops 2>&1
    exit 1
fi

# Step 9: Test external API
echo ""
echo "Step 9: Testing external API..."
sleep 5
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
    
    # Check container logs
    echo ""
    echo "Recent container logs:"
    docker logs --tail 10 supabase_caddy_arti-marketing-ops 2>&1
fi

echo ""
echo "=========================================="
echo "Fix Complete"
echo "=========================================="

