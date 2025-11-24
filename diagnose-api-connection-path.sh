#!/bin/bash
# Comprehensive API connection diagnostics

echo "=========================================="
echo "API Connection Diagnostics"
echo "=========================================="
echo ""

# Step 1: Test API container directly
echo "Step 1: Testing API container directly..."
docker exec arti-api curl -s http://localhost:3001/api/ratio-fixer/health | jq . 2>/dev/null || echo "Failed"
echo ""

# Step 2: Test from host to API container
echo "Step 2: Testing from host to API container..."
curl -s http://localhost:3001/api/ratio-fixer/health | jq . 2>/dev/null || echo "Failed"
echo ""

# Step 3: Test through Caddy on localhost (HTTP)
echo "Step 3: Testing through Caddy on localhost (HTTP)..."
curl -v -H "Host: api.artistinfluence.com" \
  http://localhost/api/ratio-fixer/health 2>&1 | grep -E "< HTTP|^\{|^\[" | head -10
echo ""

# Step 4: Test through Caddy on localhost (HTTPS)
echo "Step 4: Testing through Caddy on localhost (HTTPS)..."
curl -v -k -H "Host: api.artistinfluence.com" \
  https://localhost/api/ratio-fixer/health 2>&1 | grep -E "< HTTP|^\{|^\[" | head -10
echo ""

# Step 5: Check Caddy is actually listening
echo "Step 5: Checking what Caddy is listening on..."
ss -tlnp | grep -E ":(80|443)" | grep caddy || netstat -tlnp | grep -E ":(80|443)" | grep caddy
echo ""

# Step 6: Check Caddy process and config
echo "Step 6: Checking Caddy process..."
ps aux | grep caddy | grep -v grep
echo ""

# Step 7: Test external API with full debug
echo "Step 7: Testing external API (full debug)..."
curl -v --max-time 15 \
  -H "Origin: https://app.artistinfluence.com" \
  https://api.artistinfluence.com/api/ratio-fixer/health 2>&1 | tee /tmp/api-debug.log

echo ""
echo "----------------------------------------"
echo "Response analysis:"
echo "HTTP Status:"
grep "< HTTP" /tmp/api-debug.log | tail -1
echo ""
echo "Response body:"
grep -A 5 "^\{$\|^\[$" /tmp/api-debug.log | head -10
echo ""

# Step 8: Check if Cloudflare is in the way
echo "Step 8: Checking Cloudflare headers..."
curl -I https://api.artistinfluence.com/api/ratio-fixer/health 2>&1 | grep -i "server\|cf-\|cloudflare" | head -5
echo ""

# Step 9: Test direct IP (bypass DNS/Cloudflare)
echo "Step 9: Testing direct IP (bypass Cloudflare)..."
HOST_IP=$(hostname -I | awk '{print $1}')
echo "Host IP: $HOST_IP"
curl -v -H "Host: api.artistinfluence.com" \
  --max-time 10 \
  http://${HOST_IP}/api/ratio-fixer/health 2>&1 | grep -E "< HTTP|^\{|error" | head -10
echo ""

# Step 10: Check Caddy logs if available
echo "Step 10: Checking for Caddy logs..."
if [ -f /var/log/caddy/access.log ]; then
    echo "Recent Caddy access logs:"
    sudo tail -10 /var/log/caddy/access.log
elif [ -f /var/log/caddy/error.log ]; then
    echo "Recent Caddy error logs:"
    sudo tail -10 /var/log/caddy/error.log
else
    echo "No Caddy logs found in /var/log/caddy/"
    echo "Checking journalctl..."
    sudo journalctl -u caddy -n 10 --no-pager 2>/dev/null || echo "No systemd service logs"
fi

echo ""
echo "=========================================="
echo "Diagnostics Complete"
echo "=========================================="

