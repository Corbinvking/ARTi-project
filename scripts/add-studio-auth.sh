#!/bin/bash

# 🔐 Add Authentication Wall to Supabase Studio
# This script adds HTTP Basic Auth to db.artistinfluence.com

set -e

echo "🔐 Supabase Studio Authentication Setup"
echo "========================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Find Caddy container automatically
CADDY_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i caddy | head -1)

if [ -z "$CADDY_CONTAINER" ]; then
    echo "❌ Caddy container not found. Is it running?"
    echo "Available containers:"
    docker ps --format "  - {{.Names}}"
    exit 1
fi

echo "✅ Found Caddy container: $CADDY_CONTAINER"
echo ""

echo "📝 Step 1: Set Admin Password"
echo ""
echo "Enter a secure password for Supabase Studio access:"
read -s STUDIO_PASSWORD
echo ""
echo "Confirm password:"
read -s STUDIO_PASSWORD_CONFIRM
echo ""

if [ "$STUDIO_PASSWORD" != "$STUDIO_PASSWORD_CONFIRM" ]; then
    echo "❌ Passwords don't match!"
    exit 1
fi

if [ ${#STUDIO_PASSWORD} -lt 12 ]; then
    echo "⚠️  Warning: Password is less than 12 characters."
    echo "Continue anyway? (y/N)"
    read -r CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        echo "❌ Setup cancelled. Please use a stronger password."
        exit 1
    fi
fi

echo "🔒 Generating password hash..."
HASHED_PASSWORD=$(docker exec $CADDY_CONTAINER caddy hash-password --plaintext "$STUDIO_PASSWORD")

if [ -z "$HASHED_PASSWORD" ]; then
    echo "❌ Failed to generate password hash"
    exit 1
fi

echo "✅ Password hash generated"
echo ""

# Backup original Caddyfile
CADDYFILE_PATH="/root/arti-marketing-ops/caddy/Caddyfile.production"
BACKUP_PATH="${CADDYFILE_PATH}.backup.$(date +%Y%m%d_%H%M%S)"

echo "💾 Creating backup: $BACKUP_PATH"
cp "$CADDYFILE_PATH" "$BACKUP_PATH"

# Create new Caddyfile with auth
echo "📝 Updating Caddyfile..."

# Use sed to replace the db.artistinfluence.com section
# First, find the line number where the section starts and ends
START_LINE=$(grep -n "^# Supabase Studio" "$CADDYFILE_PATH" | cut -d: -f1)
END_LINE=$(awk "/^# Supabase Studio/,/^}/" "$CADDYFILE_PATH" | tail -1 | grep -n "^}" | cut -d: -f1)

# Create new section with auth
cat > /tmp/studio_section.txt << EOF
# Supabase Studio (Self-Hosted Admin Panel) - WITH AUTHENTICATION
db.artistinfluence.com {
    # HTTP Basic Authentication
    # Username: admin
    # Password: Set during setup
    basicauth {
        admin ${HASHED_PASSWORD}
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

# Replace the entire db.artistinfluence.com section
awk '
/^# Supabase Studio/ {
    system("cat /tmp/studio_section.txt")
    skip=1
    next
}
skip && /^}/ {
    skip=0
    next
}
!skip {
    print
}
' "$CADDYFILE_PATH" > /tmp/Caddyfile.new

# Move new file into place
mv /tmp/Caddyfile.new "$CADDYFILE_PATH"

echo "✅ Caddyfile updated"
echo ""

# Reload Caddy
echo "🔄 Reloading Caddy configuration..."
if docker exec $CADDY_CONTAINER caddy reload --config /etc/caddy/Caddyfile; then
    echo "✅ Caddy reloaded successfully"
else
    echo "❌ Failed to reload Caddy"
    echo "📝 Restoring backup..."
    cp "$BACKUP_PATH" "$CADDYFILE_PATH"
    docker exec $CADDY_CONTAINER caddy reload --config /etc/caddy/Caddyfile
    echo "❌ Setup failed. Original configuration restored."
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Authentication wall successfully added!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔐 Access Credentials:"
echo "   URL:      https://db.artistinfluence.com"
echo "   Username: admin"
echo "   Password: [the password you just set]"
echo ""
echo "📝 Important Notes:"
echo "   • Save these credentials in a secure password manager"
echo "   • Browser will remember credentials during session"
echo "   • Hard refresh (Ctrl+Shift+R) if you see old page"
echo "   • Backup saved at: $BACKUP_PATH"
echo ""
echo "🧪 Test now:"
echo "   1. Open https://db.artistinfluence.com in browser"
echo "   2. You should see a login prompt"
echo "   3. Enter username: admin"
echo "   4. Enter the password you just set"
echo ""
echo "🔄 To remove auth wall (if needed):"
echo "   1. Restore backup: cp $BACKUP_PATH $CADDYFILE_PATH"
echo "   2. Reload Caddy: docker exec $CADDY_CONTAINER caddy reload --config /etc/caddy/Caddyfile"
echo ""

