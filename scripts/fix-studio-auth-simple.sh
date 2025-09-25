#!/bin/bash

# Simple Fix for Supabase Studio Authentication
# Uses a different approach to avoid sed escaping issues

echo "🔧 FIXING SUPABASE STUDIO AUTHENTICATION (Simple Method)"
echo "======================================================="

cd /root/arti-marketing-ops

# Step 1: Get the Studio password
echo "📋 Reading existing credentials..."
if [ -f "auth/credentials.txt" ]; then
    STUDIO_PASSWORD=$(grep -A 2 "SUPABASE STUDIO ACCESS" auth/credentials.txt | grep "Password:" | cut -d: -f2 | xargs)
    echo "✅ Found Studio password: $STUDIO_PASSWORD"
else
    echo "❌ Credentials file not found"
    exit 1
fi

# Step 2: Generate new bcrypt hash
echo "🔐 Generating new bcrypt hash for Studio..."
STUDIO_HASH=$(htpasswd -bnB admin "$STUDIO_PASSWORD" | cut -d: -f2)
echo "✅ Generated hash"

# Step 3: Recreate the entire Caddyfile with correct hashes
echo "📝 Recreating Caddyfile with correct authentication..."

# Get n8n password and hash too
N8N_PASSWORD=$(grep -A 2 "N8N AUTOMATION ACCESS" auth/credentials.txt | grep "Password:" | cut -d: -f2 | xargs)
N8N_HASH=$(htpasswd -bnB admin "$N8N_PASSWORD" | cut -d: -f2)

# Create new Caddyfile with proper hashes
cat > caddy/Caddyfile.production << EOF
# Global options MUST be first
{
    # Email for Let's Encrypt certificates
    email admin@artistinfluence.com
    
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

# ARTi Platform Production Caddyfile with Authentication
# Domain: artistinfluence.com

# Backend API (No auth - handled by app)
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
    
    # Custom API routes - proxy to our Node.js API
    reverse_proxy localhost:3002 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        
        # Health check
        health_uri /healthz
        health_interval 30s
        health_timeout 10s
    }
    
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

# n8n Automation Platform (WITH AUTHENTICATION)
link.artistinfluence.com {
    # HTTP Basic Authentication
    basicauth {
        admin $N8N_HASH
    }
    
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

# Supabase Studio (WITH AUTHENTICATION)
db.artistinfluence.com {
    # HTTP Basic Authentication
    basicauth {
        admin $STUDIO_HASH
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
EOF

echo "✅ Created new Caddyfile with correct hashes"

# Step 4: Restart Caddy
echo "🔄 Restarting Caddy..."
docker restart supabase_caddy_arti-marketing-ops

# Wait for restart
sleep 5

# Step 5: Test both services
echo "🧪 Testing authentication..."

# Test Studio
STUDIO_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://db.artistinfluence.com)
echo "Studio without auth: $STUDIO_RESPONSE (should be 401)"

# Test n8n
N8N_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://link.artistinfluence.com)
echo "n8n without auth: $N8N_RESPONSE (should be 401)"

echo ""
echo "🎉 AUTHENTICATION FIX COMPLETE!"
echo "==============================="
echo ""
echo "🔑 YOUR CREDENTIALS:"
echo "• Supabase Studio: https://db.artistinfluence.com"
echo "  Username: admin"
echo "  Password: $STUDIO_PASSWORD"
echo ""
echo "• n8n Platform: https://link.artistinfluence.com"
echo "  Username: admin" 
echo "  Password: $N8N_PASSWORD"
echo ""
echo "Try accessing both URLs now!"
