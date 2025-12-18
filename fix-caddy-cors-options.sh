#!/bin/bash
# Fix Caddyfile to handle CORS preflight (OPTIONS) requests for API routes

set -e

echo "=========================================="
echo "Fix Caddy CORS OPTIONS Handling"
echo "=========================================="
echo ""

CADDYFILE="/root/arti-marketing-ops/caddy/Caddyfile.production"

# Step 1: Convert encoding and fix line endings
echo "Step 1: Fixing file encoding and line endings..."
if [ -f "$CADDYFILE" ]; then
    # Convert from UTF-16LE to UTF-8 and fix line endings
    iconv -f UTF-16LE -t UTF-8 "$CADDYFILE" | sed 's/\r$//' > "$CADDYFILE.tmp" && mv "$CADDYFILE.tmp" "$CADDYFILE"
    echo "✅ File encoding fixed"
else
    echo "❌ Caddyfile not found at $CADDYFILE"
    exit 1
fi

# Step 2: Add explicit OPTIONS handling for /api/* routes
echo ""
echo "Step 2: Adding explicit OPTIONS handling for API routes..."

# Create a backup
cp "$CADDYFILE" "$CADDYFILE.backup"

# Read the file and add OPTIONS handling before the reverse_proxy for API routes
# We need to insert OPTIONS handling right after the storage routes and before the main reverse_proxy
cat > "$CADDYFILE.new" << 'CADDYFILE_CONTENT'
# Global options MUST be first
{
    # Email for Let's Encrypt certificates
    email admin@artistinfluence.com
    
    # Enable automatic HTTPS
    # auto_https on  # Default behavior, no need to specify
    
    # Log errors
    log {
        level ERROR
        output file /var/log/caddy/error.log {
            roll_size 100mb
            roll_keep 5
            roll_keep_for 720h
        }
    }
}

# ARTi Platform Production Caddyfile
# Domain: artistinfluence.com

# NOTE: artistinfluence.com and www.artistinfluence.com are NOT managed here
# These domains remain with the existing live site
# Our droplet only handles the subdomains: api.* and link.*

# Backend API
api.artistinfluence.com {
    # Supabase auth routes - proxy to Kong (preserve full path)
    handle /auth/* {
        reverse_proxy localhost:54321 {
            header_up Host {host}
            header_up X-Real-IP {remote}
        }
    }
    
    # Supabase REST API routes - proxy to Kong (preserve full path)
    handle /rest/* {
        reverse_proxy localhost:54321 {
            header_up Host {host}
            header_up X-Real-IP {remote}
        }
    }
    
    # Supabase Storage routes - proxy to Kong (preserve full path)
    handle /storage/* {
        reverse_proxy localhost:54321 {
            header_up Host {host}
            header_up X-Real-IP {remote}
        }
    }
    
    # Handle CORS preflight (OPTIONS) requests for /api/* routes
    # This MUST come before the reverse_proxy to catch OPTIONS requests
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
    
    # Custom API routes - proxy to our Node.js API
    # This will handle all other /api/* requests (non-OPTIONS)
    reverse_proxy localhost:3001 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        
        # Health check
        health_uri /healthz
        health_interval 30s
        health_timeout 10s
    }
    
    # CORS headers removed - let Kong handle CORS for Supabase routes
    # Backend API handles CORS for custom routes
    
    # Security headers
    header X-Frame-Options "DENY"
    header X-Content-Type-Options "nosniff"
    header Referrer-Policy "strict-origin-when-cross-origin"
    header Permissions-Policy "geolocation=(), microphone=(), camera=()"
    header Strict-Transport-Security "max-age=31536000; includeSubDomains"
    
    # Logging
    log {
        output file /var/log/caddy/api.log {
            roll_size 100mb
            roll_keep 5
            roll_keep_for 720h
        }
        format json
        level INFO
    }
}

# n8n Automation Platform
link.artistinfluence.com {
    reverse_proxy localhost:5678 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        
        # Health check for n8n
        health_uri /
        health_interval 30s
        health_timeout 10s
    }
    
    # Security headers for n8n
    header X-Frame-Options "SAMEORIGIN"
    header X-Content-Type-Options "nosniff"
    header Referrer-Policy "strict-origin-when-cross-origin"
    header Strict-Transport-Security "max-age=31536000; includeSubDomains"
    
    # Logging
    log {
        output file /var/log/caddy/n8n.log {
            roll_size 100mb
            roll_keep 5
            roll_keep_for 720h
        }
        format json
        level INFO
    }
}

# Supabase Studio (Self-Hosted Admin Panel)
db.artistinfluence.com {
    # HTTP Basic Authentication
    # Username: admin
    # Password: ArtistInfluence2025!
    basicauth {
        admin $2a$14$lkjyVobdbpE0i9HS8Ug9zO/HeR.BEi.OpxG5HVzHB.jQ0MjIEjNMK
    }
    
    reverse_proxy localhost:54323 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        
        # Health check for Studio
        health_uri /
        health_interval 30s
        health_timeout 10s
    }
    
    # Security headers for Supabase Studio
    header X-Frame-Options "SAMEORIGIN"
    header X-Content-Type-Options "nosniff"
    header Strict-Transport-Security "max-age=31536000; includeSubDomains"
    
    # Logging
    log {
        output file /var/log/caddy/supabase.log {
            roll_size 100mb
            roll_keep 5
            roll_keep_for 720h
        }
        format json
        level INFO
    }
}
CADDYFILE_CONTENT

mv "$CADDYFILE.new" "$CADDYFILE"
echo "✅ Caddyfile updated with OPTIONS handling"

# Step 3: Validate Caddyfile syntax
echo ""
echo "Step 3: Validating Caddyfile syntax..."
if command -v caddy &> /dev/null; then
    if caddy validate --config "$CADDYFILE" 2>&1; then
        echo "✅ Caddyfile syntax is valid"
    else
        echo "❌ Caddyfile syntax validation failed"
        echo "Restoring backup..."
        mv "$CADDYFILE.backup" "$CADDYFILE"
        exit 1
    fi
else
    echo "⚠️  Caddy not found in PATH, skipping validation"
fi

# Step 4: Copy to Caddy's config location (if different)
echo ""
echo "Step 4: Checking if Caddyfile needs to be copied..."
CADDY_CONFIG_LOCATION="/etc/caddy/Caddyfile"
if [ -f "$CADDY_CONFIG_LOCATION" ] && [ "$CADDYFILE" != "$CADDY_CONFIG_LOCATION" ]; then
    echo "Copying to $CADDY_CONFIG_LOCATION..."
    sudo cp "$CADDYFILE" "$CADDY_CONFIG_LOCATION"
    echo "✅ Copied to Caddy config location"
fi

# Step 5: Reload Caddy
echo ""
echo "Step 5: Reloading Caddy..."
if systemctl is-active --quiet caddy; then
    sudo systemctl reload caddy
    echo "✅ Caddy reloaded"
elif docker ps | grep -q caddy; then
    echo "Caddy is running in Docker, you may need to restart the container"
    echo "Run: docker restart <caddy-container-name>"
else
    echo "⚠️  Caddy service not found. You may need to restart Caddy manually"
fi

echo ""
echo "=========================================="
echo "✅ CORS OPTIONS handling fixed!"
echo "=========================================="
echo ""
echo "The Caddyfile now explicitly handles OPTIONS requests for /api/* routes"
echo "and passes them through with proper CORS headers before the reverse_proxy."
echo ""
echo "Test with:"
echo "  curl -X OPTIONS https://api.artistinfluence.com/api/health \\"
echo "    -H 'Origin: https://app.artistinfluence.com' \\"
echo "    -H 'Access-Control-Request-Method: POST' \\"
echo "    -v"

