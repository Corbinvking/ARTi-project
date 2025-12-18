#!/bin/bash
# Show the full structure of the Caddyfile to debug CORS issues

set -e

echo "=========================================="
echo "Caddyfile Structure Analysis"
echo "=========================================="
echo ""

CADDYFILE="/etc/caddy/Caddyfile"

if [ ! -f "$CADDYFILE" ]; then
    echo "❌ Caddyfile not found"
    exit 1
fi

echo "Full Caddyfile content:"
echo "=========================================="
cat "$CADDYFILE"
echo "=========================================="
echo ""

echo "Checking structure:"
echo "----------------------------------------"

# Check if api.artistinfluence.com block exists
if grep -q "api.artistinfluence.com" "$CADDYFILE"; then
    echo "✅ api.artistinfluence.com block found"
    
    # Show the api block
    echo ""
    echo "api.artistinfluence.com block:"
    echo "----------------------------------------"
    awk '/api\.artistinfluence\.com/,/^[^[:space:]]/ && !/api\.artistinfluence\.com/ && !/^[[:space:]]*$/ {if (NR > prev+1 && prev > 0) exit; print; prev=NR}' "$CADDYFILE" | head -50
else
    echo "❌ api.artistinfluence.com block NOT found"
fi

echo ""
echo "OPTIONS handler location:"
echo "----------------------------------------"
OPTIONS_LINE=$(grep -n "@api_options" "$CADDYFILE" | head -1 | cut -d: -f1)
if [ -n "$OPTIONS_LINE" ]; then
    echo "Found at line $OPTIONS_LINE"
    echo ""
    echo "Context (10 lines before and after):"
    sed -n "$((OPTIONS_LINE - 10)),$((OPTIONS_LINE + 20))p" "$CADDYFILE"
else
    echo "❌ OPTIONS handler not found"
fi

echo ""
echo "Testing OPTIONS endpoint:"
echo "----------------------------------------"
curl -X OPTIONS https://api.artistinfluence.com/api/health \
  -H 'Origin: https://app.artistinfluence.com' \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: Content-Type' \
  -i 2>&1 | head -20

echo ""
echo "=========================================="

