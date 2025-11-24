#!/bin/bash
# Simple fix: Update Caddyfile with working reverse_proxy config

set -e

echo "=========================================="
echo "Simple Caddy Reverse Proxy Fix"
echo "=========================================="
echo ""

CADDYFILE="/etc/caddy/Caddyfile"
SOURCE_CADDYFILE="/root/arti-marketing-ops/Caddyfile"

# Step 1: Show current configuration
echo "Step 1: Current configuration..."
grep -A 5 "api.artistinfluence.com" "$CADDYFILE" | head -10

# Step 2: Create a simple working configuration
echo ""
echo "Step 2: Creating simple working configuration..."
sudo tee "$CADDYFILE" > /dev/null << 'CADDYFILE_CONTENT'
# API Backend
api.artistinfluence.com {
    reverse_proxy 127.0.0.1:3001 {
        health_uri /healthz
        health_interval 30s
        health_timeout 10s
    }
    
    header {
        # Security headers
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
        
        # CORS headers - let API handle CORS, don't override
        # Access-Control-Allow-Origin "https://app.artistinfluence.com https://*.vercel.app http://localhost:3000"
        # Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
        # Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With"
        # Access-Control-Allow-Credentials "true"
    }
    
    # Handle preflight requests
    @options {
        method OPTIONS
    }
    respond @options 204
}

# n8n Automation Platform  
n8n.artistinfluence.com {
    reverse_proxy 127.0.0.1:5678
    
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
    }
}

# Health check endpoint (no auth required)
health.artistinfluence.com {
    respond /healthz 200
    respond * "Not Found" 404
}
CADDYFILE_CONTENT

echo "✅ Created new Caddyfile"

# Step 3: Copy to source
if [ -f "$SOURCE_CADDYFILE" ]; then
    sudo cp "$CADDYFILE" "$SOURCE_CADDYFILE"
    echo "✅ Copied to source Caddyfile"
fi

# Step 4: Validate (if possible)
echo ""
echo "Step 4: Validating Caddyfile..."
if command -v caddy >/dev/null 2>&1; then
    caddy validate --config "$CADDYFILE" --adapter caddyfile 2>&1 && echo "✅ Valid" || echo "⚠️  Validation failed"
else
    echo "⚠️  Caddy command not found, skipping validation"
fi

# Step 5: Test API is accessible
echo ""
echo "Step 5: Testing API accessibility..."
curl -s http://127.0.0.1:3001/healthz > /dev/null && echo "✅ API is accessible" || echo "❌ API not accessible"

# Step 6: Reload Caddy
echo ""
echo "Step 6: Reloading Caddy..."
CADDY_PID=$(pgrep -f "caddy run" | head -1)
if [ -n "$CADDY_PID" ]; then
    sudo kill -USR1 $CADDY_PID
    sleep 5
    echo "✅ Caddy reloaded"
    
    # Check if Caddy is still running
    if ps -p $CADDY_PID > /dev/null; then
        echo "✅ Caddy is still running"
    else
        echo "⚠️  Caddy process died, checking logs..."
        sudo tail -20 /var/log/caddy/error.log 2>/dev/null || echo "No error log"
    fi
else
    echo "⚠️  Could not find Caddy process"
fi

# Step 7: Test external API
echo ""
echo "Step 7: Testing external API..."
sleep 3
EXTERNAL_RESPONSE=$(curl -s -H "Origin: https://app.artistinfluence.com" \
  --max-time 15 \
  https://api.artistinfluence.com/api/ratio-fixer/health 2>&1)

if echo "$EXTERNAL_RESPONSE" | grep -q '"available":true'; then
    echo "✅✅✅ SUCCESS! External API is working! ✅✅✅"
    echo "$EXTERNAL_RESPONSE" | jq . 2>/dev/null || echo "$EXTERNAL_RESPONSE"
else
    echo "⚠️  External API response:"
    echo "$EXTERNAL_RESPONSE" | head -30
    
    # Test through localhost
    echo ""
    echo "Testing through localhost (HTTP)..."
    curl -v -H "Host: api.artistinfluence.com" \
      http://localhost/api/ratio-fixer/health 2>&1 | grep -E "< HTTP|^\{|error" | head -10
fi

echo ""
echo "=========================================="
echo "Fix Complete"
echo "=========================================="

