#!/bin/bash
# Check how external API is configured

echo "=========================================="
echo "Checking External API Configuration"
echo "=========================================="
echo ""

# Step 1: Check what's listening on ports 80/443
echo "Step 1: Checking what's listening on ports 80/443..."
sudo netstat -tlnp | grep -E ":(80|443)" || ss -tlnp | grep -E ":(80|443)"

# Step 2: Check for Caddy running outside docker
echo ""
echo "Step 2: Checking for Caddy process..."
ps aux | grep -i caddy | grep -v grep || echo "No Caddy process found"

# Step 3: Check for nginx
echo ""
echo "Step 3: Checking for nginx..."
ps aux | grep -i nginx | grep -v grep || echo "No nginx process found"

# Step 4: Check DNS for api.artistinfluence.com
echo ""
echo "Step 4: Checking DNS for api.artistinfluence.com..."
nslookup api.artistinfluence.com || dig api.artistinfluence.com +short

# Step 5: Test direct connection to external API
echo ""
echo "Step 5: Testing external API with verbose output..."
curl -v -H "Origin: https://app.artistinfluence.com" \
  --max-time 10 \
  https://api.artistinfluence.com/api/ratio-fixer/health 2>&1 | head -40

# Step 6: Check if API is accessible on port 3001 externally
echo ""
echo "Step 6: Checking if port 3001 is exposed externally..."
HOST_IP=$(hostname -I | awk '{print $1}')
echo "Host IP: $HOST_IP"
echo "Testing: curl http://${HOST_IP}:3001/api/ratio-fixer/health"
curl -s --max-time 5 http://${HOST_IP}:3001/api/ratio-fixer/health | jq . 2>/dev/null || echo "Not accessible externally"

# Step 7: Check Cloudflare or other proxy
echo ""
echo "Step 7: Checking for Cloudflare or proxy headers..."
curl -I https://api.artistinfluence.com/api/ratio-fixer/health 2>&1 | grep -i "cloudflare\|server\|via" || echo "No proxy headers found"

echo ""
echo "=========================================="
echo "Diagnosis Complete"
echo "=========================================="

