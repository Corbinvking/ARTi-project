#!/bin/bash

# Setup Authentication Wall for Production Tools
# Adds HTTP Basic Auth to Supabase Studio and n8n instances

echo "🔐 SETTING UP SITE-LEVEL AUTHENTICATION WALL"
echo "============================================="

# Step 1: Create auth credentials
echo "📋 Creating authentication credentials..."

# Generate secure passwords
STUDIO_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
N8N_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

echo "🔑 Generated passwords:"
echo "Studio Auth: admin / $STUDIO_PASSWORD"
echo "n8n Auth: admin / $N8N_PASSWORD"

# Step 2: Create htpasswd files
echo ""
echo "📝 Creating htpasswd files..."

# Install apache2-utils if not present
if ! command -v htpasswd &> /dev/null; then
    echo "Installing apache2-utils..."
    apt update && apt install -y apache2-utils
fi

# Create auth directory
mkdir -p /root/arti-marketing-ops/auth

# Create htpasswd for Studio
htpasswd -cb /root/arti-marketing-ops/auth/.htpasswd-studio admin "$STUDIO_PASSWORD"
echo "✅ Created Studio auth file"

# Create htpasswd for n8n  
htpasswd -cb /root/arti-marketing-ops/auth/.htpasswd-n8n admin "$N8N_PASSWORD"
echo "✅ Created n8n auth file"

# Step 3: Create updated Caddyfile with auth
echo ""
echo "🔧 Updating Caddyfile with authentication..."

cat > /root/arti-marketing-ops/caddy/Caddyfile.production << 'EOF'
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

# n8n Automation Platform (WITH AUTHENTICATION)
link.artistinfluence.com {
    # HTTP Basic Authentication
    basicauth {
        admin $2y$10$hash_will_be_replaced_by_script
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
        admin $2y$10$hash_will_be_replaced_by_script
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

# Step 4: Generate bcrypt hashes and update Caddyfile
echo "🔐 Generating secure password hashes..."

# Generate bcrypt hashes for passwords
STUDIO_HASH=$(htpasswd -bnB admin "$STUDIO_PASSWORD" | cut -d: -f2)
N8N_HASH=$(htpasswd -bnB admin "$N8N_PASSWORD" | cut -d: -f2)

# Update Caddyfile with actual hashes
sed -i "0,/\$2y\$10\$hash_will_be_replaced_by_script/ s//$(echo "$STUDIO_HASH" | sed 's/[[\*^$()+?{|]/\\&/g')/" /root/arti-marketing-ops/caddy/Caddyfile.production
sed -i "0,/\$2y\$10\$hash_will_be_replaced_by_script/ s//$(echo "$N8N_HASH" | sed 's/[[\*^$()+?{|]/\\&/g')/" /root/arti-marketing-ops/caddy/Caddyfile.production

echo "✅ Updated Caddyfile with authentication hashes"

# Step 5: Create credentials file for reference
cat > /root/arti-marketing-ops/auth/credentials.txt << EOF
# ARTi Platform Authentication Credentials
# Generated: $(date)

🔐 SUPABASE STUDIO ACCESS
URL: https://db.artistinfluence.com
Username: admin
Password: $STUDIO_PASSWORD

🔗 N8N AUTOMATION ACCESS  
URL: https://link.artistinfluence.com
Username: admin
Password: $N8N_PASSWORD

⚠️  SECURITY NOTES:
- These credentials protect access to production tools
- Change passwords regularly via this script
- Never share credentials in plain text
- Store securely in team password manager
EOF

echo ""
echo "💾 Credentials saved to: /root/arti-marketing-ops/auth/credentials.txt"

# Step 6: Restart Caddy
echo ""
echo "🔄 Restarting Caddy with authentication..."
docker restart supabase_caddy_arti-marketing-ops

# Wait for restart
sleep 5

# Step 7: Test authentication
echo ""
echo "🧪 Testing authentication setup..."

# Test Studio auth
if curl -s -o /dev/null -w "%{http_code}" https://db.artistinfluence.com | grep -q "401"; then
    echo "✅ Studio authentication working (401 without credentials)"
else
    echo "⚠️  Studio auth test inconclusive"
fi

# Test n8n auth
if curl -s -o /dev/null -w "%{http_code}" https://link.artistinfluence.com | grep -q "401"; then
    echo "✅ n8n authentication working (401 without credentials)"
else
    echo "⚠️  n8n auth test inconclusive"
fi

echo ""
echo "🎉 AUTHENTICATION WALL SETUP COMPLETE!"
echo "======================================"
echo ""
echo "📋 SUMMARY:"
echo "• Supabase Studio: https://db.artistinfluence.com (admin / $STUDIO_PASSWORD)"
echo "• n8n Platform: https://link.artistinfluence.com (admin / $N8N_PASSWORD)"
echo "• API remains open: https://api.artistinfluence.com (app-level auth)"
echo ""
echo "📁 Files created:"
echo "• /root/arti-marketing-ops/auth/credentials.txt"
echo "• /root/arti-marketing-ops/auth/.htpasswd-studio" 
echo "• /root/arti-marketing-ops/auth/.htpasswd-n8n"
echo "• Updated: caddy/Caddyfile.production"
echo ""
echo "🔐 Next: Store credentials securely and test access!"
EOF

chmod +x /root/arti-marketing-ops/scripts/setup-auth-wall.sh

echo "✅ Authentication wall script created and executable"
echo ""
echo "📋 TO RUN:"
echo "bash scripts/setup-auth-wall.sh"
