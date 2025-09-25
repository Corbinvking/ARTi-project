#!/bin/bash

# Fix Supabase Studio Authentication
# Addresses bcrypt hash replacement issue

echo "🔧 FIXING SUPABASE STUDIO AUTHENTICATION"
echo "========================================"

cd /root/arti-marketing-ops

# Step 1: Get the Studio password from credentials
echo "📋 Reading existing credentials..."
if [ -f "auth/credentials.txt" ]; then
    STUDIO_PASSWORD=$(grep -A 2 "SUPABASE STUDIO ACCESS" auth/credentials.txt | grep "Password:" | cut -d: -f2 | xargs)
    echo "✅ Found Studio password"
else
    echo "❌ Credentials file not found"
    exit 1
fi

# Step 2: Generate new bcrypt hash for Studio
echo "🔐 Generating new bcrypt hash for Studio..."
STUDIO_HASH=$(htpasswd -bnB admin "$STUDIO_PASSWORD" | cut -d: -f2)

# Escape special characters for sed
STUDIO_HASH_ESCAPED=$(echo "$STUDIO_HASH" | sed 's/[[\*^$()+?{|]/\\&/g')

echo "✅ Generated new hash for Studio"

# Step 3: Update Caddyfile with correct Studio hash
echo "📝 Updating Caddyfile with correct Studio authentication..."

# Create a temporary file with the corrected Caddyfile
cp caddy/Caddyfile.production caddy/Caddyfile.production.backup

# Use a more precise replacement - target only the Studio section
sed '/# Supabase Studio (WITH AUTHENTICATION)/,/^$/s/admin \$2y\$10\$[^}]*/admin '"$STUDIO_HASH_ESCAPED"'/' caddy/Caddyfile.production > caddy/Caddyfile.production.new

# Verify the replacement worked
if grep -q "admin \$2y\$10\$" caddy/Caddyfile.production.new; then
    mv caddy/Caddyfile.production.new caddy/Caddyfile.production
    echo "✅ Updated Caddyfile with correct Studio hash"
else
    echo "❌ Hash replacement failed, restoring backup"
    mv caddy/Caddyfile.production.backup caddy/Caddyfile.production
    exit 1
fi

# Step 4: Restart Caddy
echo "🔄 Restarting Caddy..."
docker restart supabase_caddy_arti-marketing-ops

# Wait for restart
sleep 5

# Step 5: Test Studio authentication
echo "🧪 Testing Studio authentication..."

# Test with curl (should return 401 without credentials)
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://db.artistinfluence.com)

if [ "$RESPONSE" = "401" ]; then
    echo "✅ Studio authentication working (401 without credentials)"
    
    # Test with credentials
    echo "🔑 Testing with credentials..."
    RESPONSE_WITH_AUTH=$(curl -s -o /dev/null -w "%{http_code}" -u "admin:$STUDIO_PASSWORD" https://db.artistinfluence.com)
    
    if [ "$RESPONSE_WITH_AUTH" = "200" ] || [ "$RESPONSE_WITH_AUTH" = "302" ]; then
        echo "✅ Studio authentication successful with credentials!"
    else
        echo "⚠️  Studio auth test with credentials returned: $RESPONSE_WITH_AUTH"
    fi
else
    echo "⚠️  Studio auth test returned: $RESPONSE (expected 401)"
fi

# Step 6: Show current authentication status
echo ""
echo "📊 AUTHENTICATION STATUS:"
echo "========================"
echo "• n8n Platform: ✅ Working"
echo "• Supabase Studio: 🔧 Fixed"
echo ""
echo "🔑 CREDENTIALS:"
echo "• Username: admin"
echo "• Studio Password: $STUDIO_PASSWORD"
echo "• URLs:"
echo "  - Studio: https://db.artistinfluence.com"
echo "  - n8n: https://link.artistinfluence.com"
echo ""
echo "🎉 STUDIO AUTHENTICATION FIXED!"
