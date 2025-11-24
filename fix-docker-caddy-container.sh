#!/bin/bash
# Fix Docker Caddy container

set -e

echo "=========================================="
echo "Fixing Docker Caddy Container"
echo "=========================================="
echo ""

# Step 1: Check Caddy container status
echo "Step 1: Checking Caddy container status..."
docker ps -a | grep caddy

CADDY_CONTAINER="supabase_caddy_arti-marketing-ops"

# Step 2: Check container logs
echo ""
echo "Step 2: Checking Caddy container logs..."
docker logs --tail 20 "$CADDY_CONTAINER" 2>&1 | head -30

# Step 3: Find where the Caddyfile is mounted
echo ""
echo "Step 3: Finding Caddyfile location..."
docker inspect "$CADDY_CONTAINER" --format '{{range .Mounts}}{{if eq .Destination "/etc/caddy/Caddyfile"}}{{.Source}}{{end}}{{end}}' 2>/dev/null || echo "Could not find Caddyfile mount"

# Step 4: Check the actual Caddyfile in the container
echo ""
echo "Step 4: Checking Caddyfile in container..."
docker exec "$CADDY_CONTAINER" cat /etc/caddy/Caddyfile 2>/dev/null | head -30 || echo "Container not running, cannot read Caddyfile"

# Step 5: Stop the container
echo ""
echo "Step 5: Stopping Caddy container..."
docker stop "$CADDY_CONTAINER" 2>/dev/null || echo "Container already stopped"

# Step 6: Find the actual Caddyfile location from docker-compose
echo ""
echo "Step 6: Finding Caddyfile from docker-compose..."
# Check if there's a docker-compose file for Supabase
if [ -f "/root/arti-marketing-ops/docker-compose.supabase-project.yml" ]; then
    echo "Found Supabase docker-compose file"
    grep -A 5 "caddy" /root/arti-marketing-ops/docker-compose.supabase-project.yml | head -20
fi

# Check Supabase directory
if [ -d "/root/arti-marketing-ops/supabase" ]; then
    echo "Checking Supabase directory for Caddyfile..."
    find /root/arti-marketing-ops/supabase -name "*Caddyfile*" -o -name "*caddy*" 2>/dev/null | head -10
fi

# Step 7: Update the Caddyfile that the container uses
echo ""
echo "Step 7: Finding and updating the correct Caddyfile..."
# The container might be using a Caddyfile from the Supabase project
# Let's check common locations
for CADDYFILE_LOC in \
    "/root/arti-marketing-ops/supabase/Caddyfile" \
    "/root/arti-marketing-ops/caddy/Caddyfile.production" \
    "/root/arti-marketing-ops/Caddyfile"; do
    if [ -f "$CADDYFILE_LOC" ]; then
        echo "Found Caddyfile at: $CADDYFILE_LOC"
        echo "Current API configuration:"
        grep -A 10 "api.artistinfluence.com" "$CADDYFILE_LOC" | head -15 || echo "No api.artistinfluence.com block"
        
        # Update to use port 3001
        echo ""
        echo "Updating to use port 3001..."
        sudo sed -i 's|reverse_proxy.*:3002|reverse_proxy localhost:3001|g' "$CADDYFILE_LOC"
        sudo sed -i 's|reverse_proxy api:3001|reverse_proxy localhost:3001|g' "$CADDYFILE_LOC"
        sudo sed -i 's|api.yourdomain.com|api.artistinfluence.com|g' "$CADDYFILE_LOC"
        
        echo "✅ Updated $CADDYFILE_LOC"
    fi
done

# Step 8: Start the container
echo ""
echo "Step 8: Starting Caddy container..."
docker start "$CADDY_CONTAINER"
sleep 5

# Check if it's running
if docker ps | grep -q "$CADDY_CONTAINER"; then
    echo "✅ Caddy container is running"
else
    echo "⚠️  Caddy container is not running. Checking logs..."
    docker logs --tail 30 "$CADDY_CONTAINER" 2>&1
fi

# Step 9: Test external API
echo ""
echo "Step 9: Testing external API..."
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
    
    # Check container logs
    echo ""
    echo "Recent container logs:"
    docker logs --tail 10 "$CADDY_CONTAINER" 2>&1
fi

echo ""
echo "=========================================="
echo "Fix Complete"
echo "=========================================="

