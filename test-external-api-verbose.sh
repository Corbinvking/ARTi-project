#!/bin/bash
# Test external API with verbose diagnostics

echo "=========================================="
echo "Testing External API - Verbose Diagnostics"
echo "=========================================="
echo ""

# Step 1: Test local API directly
echo "Step 1: Testing local API (should work)..."
LOCAL_RESPONSE=$(curl -s http://localhost:3001/api/ratio-fixer/health)
echo "$LOCAL_RESPONSE" | jq . 2>/dev/null || echo "$LOCAL_RESPONSE"
echo ""

# Step 2: Test through Caddy on localhost
echo "Step 2: Testing through Caddy on localhost (HTTP)..."
CADDY_LOCAL=$(curl -s -H "Host: api.artistinfluence.com" http://localhost/api/ratio-fixer/health 2>&1)
if [ -n "$CADDY_LOCAL" ]; then
    echo "$CADDY_LOCAL" | jq . 2>/dev/null || echo "$CADDY_LOCAL"
else
    echo "Empty response"
fi
echo ""

# Step 3: Test external API with full verbose output
echo "Step 3: Testing external API (HTTPS) with verbose output..."
curl -v -H "Origin: https://app.artistinfluence.com" \
  --max-time 15 \
  https://api.artistinfluence.com/api/ratio-fixer/health 2>&1 | tee /tmp/api-test.log

echo ""
echo "----------------------------------------"
echo "Response summary:"
grep -E "< HTTP|< access-control|^\{|^\[" /tmp/api-test.log | head -10

# Step 4: Check Caddyfile for api.artistinfluence.com block
echo ""
echo "Step 4: Checking Caddyfile configuration..."
CADDYFILE="/etc/caddy/Caddyfile"
if [ -f "$CADDYFILE" ]; then
    echo "Checking for api.artistinfluence.com block:"
    grep -A 20 "api.artistinfluence.com" "$CADDYFILE" || echo "No api.artistinfluence.com block found"
    echo ""
    echo "All reverse_proxy directives:"
    grep "reverse_proxy" "$CADDYFILE"
else
    echo "Caddyfile not found at $CADDYFILE"
fi

# Step 5: Check if there's a catch-all that might be interfering
echo ""
echo "Step 5: Checking for catch-all or default routes..."
grep -E "^[^#]*\{|handle|reverse_proxy" "$CADDYFILE" | head -20

# Step 6: Test a simple endpoint
echo ""
echo "Step 6: Testing API healthz endpoint..."
curl -s -H "Origin: https://app.artistinfluence.com" \
  --max-time 10 \
  https://api.artistinfluence.com/healthz 2>&1 | head -5

echo ""
echo "=========================================="
echo "Diagnostics Complete"
echo "=========================================="

