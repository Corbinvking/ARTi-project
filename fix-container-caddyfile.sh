#!/bin/bash
# Update the CORRECT Caddyfile that the container is using

set -e

echo "=========================================="
echo "Updating Container's Caddyfile"
echo "=========================================="
echo ""

# The container uses /root/arti-marketing-ops/Caddyfile
CADDYFILE="/root/arti-marketing-ops/Caddyfile"

if [ ! -f "$CADDYFILE" ]; then
    echo "❌ Caddyfile not found at $CADDYFILE"
    exit 1
fi

echo "Updating: $CADDYFILE"

# Create backup
cp "$CADDYFILE" "$CADDYFILE.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Backup created"

# Show current content
echo ""
echo "Current Caddyfile:"
echo "----------------------------------------"
cat "$CADDYFILE"
echo "----------------------------------------"

# Create new Caddyfile with OPTIONS handling
cat > "$CADDYFILE" << 'CADDYFILE_CONTENT'
api.artistinfluence.com {
    # Handle CORS preflight (OPTIONS) requests for /api/* routes
    # This MUST come BEFORE other handlers to catch OPTIONS requests
    @api_options {
        path /api/*
        method OPTIONS
    }
    handle @api_options {
        header Access-Control-Allow-Origin "https://app.artistinfluence.com"
        header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
        header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With, Cache-Control, X-User-Agent, x-supabase-api-version, x-client-info, apikey, x-supabase-auth-token"
        header Access-Control-Allow-Credentials "true"
        header Access-Control-Max-Age "86400"
        respond "" 204
    }
    
    # Custom API routes for specific paths
    @custom_api path /api/spotify-web-api/* /api/scraper/*
    handle @custom_api {
        reverse_proxy arti-api:3001
    }
    
    # All other /api/* routes go to our API
    handle /api/* {
        reverse_proxy arti-api:3001
    }
    
    # Everything else goes to Supabase Kong
    handle {
        reverse_proxy supabase_kong_arti-marketing-ops:8000
    }
}

custom-api.artistinfluence.com {
    reverse_proxy arti-api:3001
    
    header {
        Access-Control-Allow-Origin *
        Access-Control-Allow-Methods GET, POST, PUT, DELETE, OPTIONS
        Access-Control-Allow-Headers *
    }
    
    @options method OPTIONS
    respond @options 204
}

n8n.artistinfluence.com {
    reverse_proxy arti-n8n:5678
    
    header {
        Strict-Transport-Security max-age=31536000
        X-Content-Type-Options nosniff
        X-Frame-Options SAMEORIGIN
    }
}
CADDYFILE_CONTENT

echo ""
echo "✅ Caddyfile updated"

# Show new content
echo ""
echo "New Caddyfile:"
echo "----------------------------------------"
cat "$CADDYFILE"
echo "----------------------------------------"

# Restart Caddy container
echo ""
echo "Restarting Caddy container..."
CONTAINER=$(docker ps | grep caddy | awk '{print $1}')
if [ -n "$CONTAINER" ]; then
    docker restart "$CONTAINER"
    echo "✅ Caddy container restarted"
    
    # Wait for it to start
    sleep 3
    
    echo ""
    echo "Verifying container is running..."
    docker ps | grep caddy || echo "⚠️  Container not running"
else
    echo "❌ Caddy container not found"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ Fix complete!"
echo "=========================================="
echo ""
echo "Testing OPTIONS endpoint in 5 seconds..."
sleep 5

echo ""
curl -X OPTIONS https://api.artistinfluence.com/api/health \
  -H 'Origin: https://app.artistinfluence.com' \
  -H 'Access-Control-Request-Method: GET' \
  -i 2>&1 | head -20

echo ""
echo "If you see 'HTTP/2 204' and 'Access-Control-Allow-Origin' header,"
echo "the fix worked! Try the YouTube API test in the frontend now."
echo ""

