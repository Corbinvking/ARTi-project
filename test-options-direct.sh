#!/bin/bash
# Direct test of OPTIONS endpoint

echo "=========================================="
echo "Testing OPTIONS Endpoint Directly"
echo "=========================================="
echo ""

echo "Test 1: OPTIONS to /api/health"
echo "----------------------------------------"
curl -X OPTIONS https://api.artistinfluence.com/api/health \
  -H 'Origin: https://app.artistinfluence.com' \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: Content-Type' \
  -i 2>&1

echo ""
echo ""
echo "Test 2: OPTIONS to /api/youtube-data-api/fetch-all-campaigns"
echo "----------------------------------------"
curl -X OPTIONS https://api.artistinfluence.com/api/youtube-data-api/fetch-all-campaigns \
  -H 'Origin: https://app.artistinfluence.com' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: Content-Type' \
  -i 2>&1

echo ""
echo ""
echo "Test 3: Check Caddy logs for OPTIONS requests"
echo "----------------------------------------"
if docker ps | grep -q caddy; then
    CONTAINER=$(docker ps | grep caddy | awk '{print $1}' | head -1)
    echo "Checking Caddy container logs..."
    docker logs "$CONTAINER" --tail 20 2>&1 | grep -i "options\|cors\|preflight" || echo "No OPTIONS/CORS entries in recent logs"
fi

echo ""
echo "=========================================="

