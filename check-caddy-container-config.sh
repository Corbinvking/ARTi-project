#!/bin/bash
# Check what Caddyfile the container is actually using

set -e

echo "=========================================="
echo "Checking Caddy Container Configuration"
echo "=========================================="
echo ""

# Find Caddy container
CONTAINER=$(docker ps | grep caddy | awk '{print $1}' | head -1)

if [ -z "$CONTAINER" ]; then
    echo "❌ Caddy container not found"
    exit 1
fi

echo "Caddy container: $CONTAINER"
echo ""

# Check what Caddyfile the container is using
echo "1. Checking container's Caddyfile:"
echo "----------------------------------------"
docker exec "$CONTAINER" cat /etc/caddy/Caddyfile 2>/dev/null || echo "Could not read /etc/caddy/Caddyfile from container"

echo ""
echo "2. Checking container's mounted volumes:"
echo "----------------------------------------"
docker inspect "$CONTAINER" | grep -A 10 "Mounts" || docker inspect "$CONTAINER" | grep -A 10 "Binds"

echo ""
echo "3. Checking if Caddy is using a different config path:"
echo "----------------------------------------"
docker exec "$CONTAINER" ps aux | grep caddy || echo "Could not check Caddy process"

echo ""
echo "4. Checking Caddy admin API (if enabled):"
echo "----------------------------------------"
docker exec "$CONTAINER" curl -s http://localhost:2019/config/ 2>/dev/null | head -50 || echo "Caddy admin API not accessible or not enabled"

echo ""
echo "5. Comparing host Caddyfile with what Caddy sees:"
echo "----------------------------------------"
echo "Host /etc/caddy/Caddyfile (first 20 lines):"
head -20 /etc/caddy/Caddyfile

echo ""
echo "=========================================="

