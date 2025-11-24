#!/bin/bash
# Fix Caddy reverse_proxy configuration with proper health checks

set -e

echo "=========================================="
echo "Fixing Caddy Reverse Proxy Configuration"
echo "=========================================="
echo ""

CADDYFILE="/etc/caddy/Caddyfile"
SOURCE_CADDYFILE="/root/arti-marketing-ops/Caddyfile"

# Step 1: Show current api.artistinfluence.com block
echo "Step 1: Current api.artistinfluence.com configuration..."
grep -A 30 "api.artistinfluence.com" "$CADDYFILE" || echo "Block not found"

# Step 2: Test API directly
echo ""
echo "Step 2: Testing API directly..."
curl -s http://127.0.0.1:3001/healthz && echo " ✅" || echo " ❌"

# Step 3: Check if reverse_proxy needs health check configuration
echo ""
echo "Step 3: Updating reverse_proxy with explicit configuration..."
# Create a backup
sudo cp "$CADDYFILE" "${CADDYFILE}.backup.$(date +%Y%m%d_%H%M%S)"

# Update reverse_proxy to include health check and transport settings
sudo sed -i '/api.artistinfluence.com {/,/^}/ {
    s|reverse_proxy 127.0.0.1:3001|reverse_proxy 127.0.0.1:3001 {\n        health_uri /healthz\n        health_interval 10s\n        health_timeout 5s\n        transport http {\n            dial_timeout 5s\n        }\n    }|
}' "$CADDYFILE"

# If the above sed didn't work (multiline is tricky), use a different approach
if ! grep -q "health_uri" "$CADDYFILE"; then
    echo "Using alternative method to update reverse_proxy..."
    # Read the file, modify the reverse_proxy line
    sudo python3 << 'PYTHON_SCRIPT'
import re
import sys

caddyfile_path = "/etc/caddy/Caddyfile"
with open(caddyfile_path, 'r') as f:
    content = f.read()

# Find and replace reverse_proxy line in api.artistinfluence.com block
pattern = r'(api\.artistinfluence\.com \{[\s\S]*?)(reverse_proxy\s+127\.0\.0\.1:3001)([\s\S]*?\n\})'
replacement = r'\1reverse_proxy 127.0.0.1:3001 {\n        health_uri /healthz\n        health_interval 10s\n        health_timeout 5s\n        transport http {\n            dial_timeout 5s\n        }\n    \3'

new_content = re.sub(pattern, replacement, content)

with open(caddyfile_path, 'w') as f:
    f.write(new_content)

print("Updated Caddyfile")
PYTHON_SCRIPT
fi

# Step 4: Verify the update
echo ""
echo "Step 4: Updated configuration..."
grep -A 10 "reverse_proxy 127.0.0.1:3001" "$CADDYFILE" | head -15

# Step 5: Copy to source file
if [ -f "$SOURCE_CADDYFILE" ]; then
    sudo cp "$CADDYFILE" "$SOURCE_CADDYFILE"
    echo ""
    echo "✅ Copied to source Caddyfile"
fi

# Step 6: Validate Caddyfile (if caddy command available)
echo ""
echo "Step 6: Validating Caddyfile..."
if command -v caddy >/dev/null 2>&1; then
    caddy validate --config "$CADDYFILE" --adapter caddyfile 2>&1 && echo "✅ Valid" || echo "⚠️  Validation issues"
else
    echo "⚠️  Caddy command not found, skipping validation"
fi

# Step 7: Reload Caddy
echo ""
echo "Step 7: Reloading Caddy..."
CADDY_PID=$(pgrep -f "caddy run" | head -1)
if [ -n "$CADDY_PID" ]; then
    sudo kill -USR1 $CADDY_PID
    sleep 3
    echo "✅ Caddy reloaded"
else
    echo "⚠️  Could not find Caddy process"
fi

# Step 8: Test external API
echo ""
echo "Step 8: Testing external API..."
sleep 2
EXTERNAL_RESPONSE=$(curl -s -H "Origin: https://app.artistinfluence.com" \
  --max-time 15 \
  https://api.artistinfluence.com/api/ratio-fixer/health 2>&1)

if echo "$EXTERNAL_RESPONSE" | grep -q '"available":true'; then
    echo "✅✅✅ SUCCESS! External API is working! ✅✅✅"
    echo "$EXTERNAL_RESPONSE" | jq . 2>/dev/null || echo "$EXTERNAL_RESPONSE"
else
    echo "⚠️  External API response:"
    echo "$EXTERNAL_RESPONSE" | head -30
    
    # Check latest Caddy error
    echo ""
    echo "Latest Caddy errors:"
    sudo tail -3 /var/log/caddy/error.log 2>/dev/null | jq -r '.msg' || echo "No error log found"
    
    # Try testing through Caddy on localhost
    echo ""
    echo "Testing through Caddy on localhost (HTTP)..."
    curl -v -H "Host: api.artistinfluence.com" \
      http://localhost/api/ratio-fixer/health 2>&1 | grep -E "< HTTP|^\{|error" | head -10
fi

echo ""
echo "=========================================="
echo "Fix Complete"
echo "=========================================="

