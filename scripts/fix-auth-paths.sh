#!/bin/bash

# Fix Authentication - Allow Setup and Login Paths
# The current setup blocks ALL paths, including setup/login pages

echo "🔧 FIXING AUTHENTICATION PATHS"
echo "=============================="

cd /root/arti-marketing-ops

# Get passwords from credentials
echo "📋 Reading credentials..."
STUDIO_PASSWORD=$(grep -A 2 "SUPABASE STUDIO ACCESS" auth/credentials.txt | grep "Password:" | cut -d: -f2 | xargs)
N8N_PASSWORD=$(grep -A 2 "N8N AUTOMATION ACCESS" auth/credentials.txt | grep "Password:" | cut -d: -f2 | xargs)

# Generate hashes
STUDIO_HASH=$(htpasswd -bnB admin "$STUDIO_PASSWORD" | cut -d: -f2)
N8N_HASH=$(htpasswd -bnB admin "$N8N_PASSWORD" | cut -d: -f2)

echo "✅ Generated authentication hashes"

# Create updated Caddyfile with selective authentication
echo "📝 Creating Caddyfile with selective authentication..."

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

# ARTi Platform Production Caddyfile with Selective Authentication

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

# n8n Automation Platform (WITH SELECTIVE AUTHENTICATION)
link.artistinfluence.com {
    # Allow setup and login paths without auth
    handle /setup* {
        reverse_proxy localhost:5678 {
            header_up Host {host}
            header_up X-Real-IP {remote}
        }
    }
    
    handle /signin* {
        reverse_proxy localhost:5678 {
            header_up Host {host}
            header_up X-Real-IP {remote}
        }
    }
    
    handle /login* {
        reverse_proxy localhost:5678 {
            header_up Host {host}
            header_up X-Real-IP {remote}
        }
    }
    
    handle /static/* {
        reverse_proxy localhost:5678 {
            header_up Host {host}
            header_up X-Real-IP {remote}
        }
    }
    
    handle /assets/* {
        reverse_proxy localhost:5678 {
            header_up Host {host}
            header_up X-Real-IP {remote}
        }
    }
    
    # All other paths require authentication
    handle /* {
        basicauth {
            admin $N8N_HASH
        }
        
        reverse_proxy localhost:5678 {
            header_up Host {host}
            header_up X-Real-IP {remote}
        }
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

# Supabase Studio (WITH SELECTIVE AUTHENTICATION)
db.artistinfluence.com {
    # Allow static assets and login paths
    handle /static/* {
        reverse_proxy localhost:54323 {
            header_up Host {host}
            header_up X-Real-IP {remote}
        }
    }
    
    handle /_next/* {
        reverse_proxy localhost:54323 {
            header_up Host {host}
            header_up X-Real-IP {remote}
        }
    }
    
    handle /favicon.ico {
        reverse_proxy localhost:54323 {
            header_up Host {host}
            header_up X-Real-IP {remote}
        }
    }
    
    # Allow initial page load for login
    handle_path / {
        reverse_proxy localhost:54323 {
            header_up Host {host}
            header_up X-Real-IP {remote}
        }
    }
    
    # All other paths require authentication
    handle /* {
        basicauth {
            admin $STUDIO_HASH
        }
        
        reverse_proxy localhost:54323 {
            header_up Host {host}
            header_up X-Real-IP {remote}
        }
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

echo "✅ Created Caddyfile with selective authentication"

# Restart Caddy
echo "🔄 Restarting Caddy..."
docker restart supabase_caddy_arti-marketing-ops

# Wait for restart
sleep 5

echo ""
echo "🎉 AUTHENTICATION PATHS FIXED!"
echo "============================="
echo ""
echo "🔓 ALLOWED WITHOUT AUTH:"
echo "• n8n: /setup, /signin, /login, /static, /assets"
echo "• Studio: /, /static, /_next, /favicon.ico"
echo ""
echo "🔐 REQUIRES AUTH:"
echo "• n8n: All other paths"
echo "• Studio: All other paths"
echo ""
echo "🔑 YOUR CREDENTIALS:"
echo "• Studio: https://db.artistinfluence.com (admin / $STUDIO_PASSWORD)"
echo "• n8n: https://link.artistinfluence.com (admin / $N8N_PASSWORD)"
echo ""
echo "Try accessing both URLs now - login pages should load!"
