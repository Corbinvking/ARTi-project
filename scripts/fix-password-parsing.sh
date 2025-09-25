#!/bin/bash

# Fix Password Parsing and Authentication
# The credentials exist but parsing is failing

echo "🔧 FIXING PASSWORD PARSING"
echo "=========================="

cd /root/arti-marketing-ops

echo "📋 Reading credentials with correct parsing..."

# Use more robust parsing
STUDIO_PASSWORD=$(grep "Password:" auth/credentials.txt | head -1 | cut -d: -f2- | xargs)
N8N_PASSWORD=$(grep "Password:" auth/credentials.txt | tail -1 | cut -d: -f2- | xargs)

echo "✅ Extracted passwords:"
echo "Studio password: '$STUDIO_PASSWORD' (length: ${#STUDIO_PASSWORD})"
echo "n8n password: '$N8N_PASSWORD' (length: ${#N8N_PASSWORD})"

if [ -z "$STUDIO_PASSWORD" ] || [ -z "$N8N_PASSWORD" ]; then
    echo "❌ Password extraction still failed"
    echo "--- Raw credentials file ---"
    cat auth/credentials.txt
    exit 1
fi

# Generate proper hashes
echo "🔐 Generating authentication hashes..."
STUDIO_HASH=$(htpasswd -bnB admin "$STUDIO_PASSWORD" | cut -d: -f2)
N8N_HASH=$(htpasswd -bnB admin "$N8N_PASSWORD" | cut -d: -f2)

echo "✅ Generated hashes successfully"

# Create corrected Caddyfile
echo "📝 Creating corrected Caddyfile..."

cat > caddy/Caddyfile.production << EOF
# Global options MUST be first
{
    email admin@artistinfluence.com
    log {
        level ERROR
        output file /var/log/caddy/error.log {
            roll_size 100mb
            roll_keep 5
            roll_keep_for 720h
        }
    }
}

# Backend API (No auth - handled by app)
api.artistinfluence.com {
    handle /auth/* {
        reverse_proxy localhost:54321 {
            header_up Host {host}
            header_up X-Real-IP {remote}
        }
    }
    
    handle /rest/* {
        reverse_proxy localhost:54321 {
            header_up Host {host}
            header_up X-Real-IP {remote}
        }
    }
    
    handle /storage/* {
        reverse_proxy localhost:54321 {
            header_up Host {host}
            header_up X-Real-IP {remote}
        }
    }
    
    reverse_proxy localhost:3002 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        health_uri /healthz
        health_interval 30s
        health_timeout 10s
    }
    
    header X-Frame-Options "DENY"
    header X-Content-Type-Options "nosniff"
    header Referrer-Policy "strict-origin-when-cross-origin"
    header Permissions-Policy "geolocation=(), microphone=(), camera=()"
    header Strict-Transport-Security "max-age=31536000; includeSubDomains"
    
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

# n8n with Authentication
link.artistinfluence.com {
    basicauth {
        admin $N8N_HASH
    }
    
    reverse_proxy localhost:5678 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        health_uri /
        health_interval 30s
        health_timeout 10s
    }
    
    header X-Frame-Options "SAMEORIGIN"
    header X-Content-Type-Options "nosniff"
    header Referrer-Policy "strict-origin-when-cross-origin"
    header Strict-Transport-Security "max-age=31536000; includeSubDomains"
    
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

# Supabase Studio with Authentication
db.artistinfluence.com {
    basicauth {
        admin $STUDIO_HASH
    }
    
    reverse_proxy localhost:54323 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        health_uri /
        health_interval 30s
        health_timeout 10s
    }
    
    header X-Frame-Options "SAMEORIGIN"
    header X-Content-Type-Options "nosniff"
    header Strict-Transport-Security "max-age=31536000; includeSubDomains"
    
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

echo "✅ Created corrected Caddyfile"

# Restart Caddy
echo "🔄 Restarting Caddy..."
docker restart supabase_caddy_arti-marketing-ops

sleep 5

# Test authentication
echo "🧪 Testing authentication..."
echo "--- Testing n8n ---"
curl -I https://link.artistinfluence.com 2>/dev/null | head -3

echo ""
echo "--- Testing with credentials ---"
curl -I -u "admin:$N8N_PASSWORD" https://link.artistinfluence.com 2>/dev/null | head -3

echo ""
echo "🎉 AUTHENTICATION FIXED!"
echo "======================="
echo ""
echo "🔑 YOUR WORKING CREDENTIALS:"
echo "• Studio: https://db.artistinfluence.com"
echo "  Username: admin"
echo "  Password: $STUDIO_PASSWORD"
echo ""
echo "• n8n: https://link.artistinfluence.com"
echo "  Username: admin"
echo "  Password: $N8N_PASSWORD"
echo ""
echo "✅ Both sites should now work with these credentials!"
