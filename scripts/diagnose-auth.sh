#!/bin/bash

# Diagnose Authentication Issues
# Check why sites return ERR_INVALID_AUTH_CREDENTIALS

echo "🔍 DIAGNOSING AUTHENTICATION ISSUES"
echo "==================================="

cd /root/arti-marketing-ops

echo "📋 1. Checking current Caddyfile configuration..."
echo ""
echo "--- n8n Configuration ---"
grep -A 10 "link.artistinfluence.com" caddy/Caddyfile.production
echo ""
echo "--- Studio Configuration ---"
grep -A 10 "db.artistinfluence.com" caddy/Caddyfile.production

echo ""
echo "📋 2. Checking if credentials file exists..."
if [ -f "auth/credentials.txt" ]; then
    echo "✅ Credentials file exists"
    echo "--- Credentials Preview ---"
    head -20 auth/credentials.txt
else
    echo "❌ Credentials file missing!"
fi

echo ""
echo "📋 3. Testing authentication hashes..."
if [ -f "auth/credentials.txt" ]; then
    STUDIO_PASSWORD=$(grep -A 2 "SUPABASE STUDIO ACCESS" auth/credentials.txt | grep "Password:" | cut -d: -f2 | xargs)
    N8N_PASSWORD=$(grep -A 2 "N8N AUTOMATION ACCESS" auth/credentials.txt | grep "Password:" | cut -d: -f2 | xargs)
    
    echo "Studio password length: ${#STUDIO_PASSWORD}"
    echo "n8n password length: ${#N8N_PASSWORD}"
    
    if [ -n "$STUDIO_PASSWORD" ] && [ -n "$N8N_PASSWORD" ]; then
        echo "✅ Both passwords found"
        
        # Test hash generation
        STUDIO_HASH=$(htpasswd -bnB admin "$STUDIO_PASSWORD" | cut -d: -f2)
        N8N_HASH=$(htpasswd -bnB admin "$N8N_PASSWORD" | cut -d: -f2)
        
        echo "✅ Hashes generated successfully"
        echo "Studio hash preview: ${STUDIO_HASH:0:20}..."
        echo "n8n hash preview: ${N8N_HASH:0:20}..."
    else
        echo "❌ Could not extract passwords"
    fi
fi

echo ""
echo "📋 4. Checking Caddy container status..."
docker ps | grep caddy

echo ""
echo "📋 5. Checking Caddy logs for errors..."
echo "--- Recent Caddy Logs ---"
docker logs --tail 20 supabase_caddy_arti-marketing-ops

echo ""
echo "📋 6. Testing direct curl access..."
echo "--- Testing n8n (should return 401) ---"
curl -I https://link.artistinfluence.com 2>/dev/null || echo "Curl failed"

echo ""
echo "--- Testing Studio (should return 401) ---"
curl -I https://db.artistinfluence.com 2>/dev/null || echo "Curl failed"

echo ""
echo "📋 7. Checking if services are running..."
echo "--- n8n Status ---"
curl -I localhost:5678 2>/dev/null || echo "n8n not responding on localhost:5678"

echo ""
echo "--- Studio Status ---"
curl -I localhost:54323 2>/dev/null || echo "Studio not responding on localhost:54323"

echo ""
echo "🔍 DIAGNOSIS COMPLETE"
echo "==================="
