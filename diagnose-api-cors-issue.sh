#!/bin/bash
# Diagnose API CORS and 503 issues

echo "=========================================="
echo "Diagnosing API CORS and 503 Issues"
echo "=========================================="
echo ""

# Step 1: Check API container status
echo "Step 1: Checking API container status..."
docker compose ps api

# Step 2: Check API logs
echo ""
echo "Step 2: Recent API logs (last 30 lines)..."
docker compose logs api --tail 30

# Step 3: Test API health endpoint
echo ""
echo "Step 3: Testing API health endpoint..."
curl -v http://localhost:3001/healthz 2>&1 | head -20

# Step 4: Test Ratio Fixer endpoint from host
echo ""
echo "Step 4: Testing Ratio Fixer endpoint from host..."
curl -v http://localhost:3001/api/ratio-fixer/health 2>&1 | head -30

# Step 5: Test with CORS headers
echo ""
echo "Step 5: Testing with CORS preflight (OPTIONS)..."
curl -v -X OPTIONS \
  -H "Origin: https://app.artistinfluence.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: content-type" \
  http://localhost:3001/api/ratio-fixer/health 2>&1 | head -30

# Step 6: Check Flask connectivity from API container
echo ""
echo "Step 6: Testing Flask from API container..."
HOST_IP=$(hostname -I | awk '{print $1}')
docker exec arti-api curl -s --max-time 5 http://${HOST_IP}:5000/healthz || echo "❌ Flask not reachable from container"

# Step 7: Check environment variables
echo ""
echo "Step 7: Checking RATIO_FIXER_URL in API container..."
docker exec arti-api env | grep RATIO_FIXER

# Step 8: Check if API is accessible from external
echo ""
echo "Step 8: Testing external API access..."
curl -v -H "Origin: https://app.artistinfluence.com" \
  https://api.artistinfluence.com/api/ratio-fixer/health 2>&1 | head -30

echo ""
echo "=========================================="
echo "Diagnosis Complete"
echo "=========================================="

