#!/bin/bash
# Check if OPTIONS handling was added correctly to Caddyfile

set -e

echo "=========================================="
echo "Checking Caddyfile OPTIONS Configuration"
echo "=========================================="
echo ""

CADDYFILE="/etc/caddy/Caddyfile"

if [ ! -f "$CADDYFILE" ]; then
    echo "❌ Caddyfile not found at $CADDYFILE"
    exit 1
fi

echo "Checking Caddyfile: $CADDYFILE"
echo ""

# Check if OPTIONS handling exists
if grep -q "@api_options" "$CADDYFILE"; then
    echo "✅ OPTIONS handler found in Caddyfile"
    echo ""
    echo "OPTIONS handler block:"
    echo "----------------------------------------"
    grep -A 12 "@api_options" "$CADDYFILE" | head -15
    echo "----------------------------------------"
    echo ""
    
    # Check if it's before reverse_proxy
    API_OPTIONS_LINE=$(grep -n "@api_options" "$CADDYFILE" | cut -d: -f1)
    REVERSE_PROXY_LINE=$(grep -n "reverse_proxy.*3001" "$CADDYFILE" | head -1 | cut -d: -f1)
    
    if [ -n "$API_OPTIONS_LINE" ] && [ -n "$REVERSE_PROXY_LINE" ]; then
        if [ "$API_OPTIONS_LINE" -lt "$REVERSE_PROXY_LINE" ]; then
            echo "✅ OPTIONS handler is correctly placed BEFORE reverse_proxy"
        else
            echo "❌ OPTIONS handler is AFTER reverse_proxy (should be before)"
        fi
    fi
else
    echo "❌ OPTIONS handler NOT found in Caddyfile"
    echo ""
    echo "Current Caddyfile structure (first 30 lines):"
    head -30 "$CADDYFILE"
fi

echo ""
echo "Testing OPTIONS endpoint directly..."
echo "----------------------------------------"
curl -X OPTIONS https://api.artistinfluence.com/api/health \
  -H 'Origin: https://app.artistinfluence.com' \
  -H 'Access-Control-Request-Method: GET' \
  -v 2>&1 | head -30

echo ""
echo "=========================================="

