#!/bin/bash
# Fix API environment variable and restart

set -e

echo "=========================================="
echo "Fixing API Environment and Restarting"
echo "=========================================="
echo ""

cd ~/arti-marketing-ops

# Step 1: Get host IP
HOST_IP=$(hostname -I | awk '{print $1}')
echo "Host IP: $HOST_IP"

# Step 2: Update production.env
echo ""
echo "Step 1: Updating RATIO_FIXER_URL in production.env..."
sed -i "s|RATIO_FIXER_URL=.*|RATIO_FIXER_URL=http://${HOST_IP}:5000|" apps/api/production.env
echo "✅ Updated to: http://${HOST_IP}:5000"

# Step 3: Verify the change
echo ""
echo "Step 2: Verifying production.env..."
grep RATIO_FIXER_URL apps/api/production.env

# Step 4: Stop and remove container to force env reload
echo ""
echo "Step 3: Stopping API container..."
docker compose stop api
docker compose rm -f api

# Step 5: Start container (will pick up new env vars)
echo ""
echo "Step 4: Starting API container with new environment..."
docker compose up -d api

# Step 6: Wait for API to be ready
echo ""
echo "Step 5: Waiting for API to be ready..."
sleep 10

# Step 7: Verify environment variable in container
echo ""
echo "Step 6: Verifying environment variable in container..."
CONTAINER_URL=$(docker exec arti-api env | grep RATIO_FIXER_URL | cut -d '=' -f2)
echo "Container has: RATIO_FIXER_URL=$CONTAINER_URL"

if [ "$CONTAINER_URL" = "http://${HOST_IP}:5000" ]; then
    echo "✅ Environment variable is correct!"
else
    echo "⚠️  Environment variable mismatch!"
    echo "   Expected: http://${HOST_IP}:5000"
    echo "   Got: $CONTAINER_URL"
fi

# Step 8: Test Flask connection from container
echo ""
echo "Step 7: Testing Flask connection from container..."
docker exec arti-api curl -s --max-time 5 http://${HOST_IP}:5000/healthz && echo " ✅ Flask reachable!" || echo " ❌ Flask not reachable"

# Step 9: Test API bridge endpoint
echo ""
echo "Step 8: Testing API bridge health endpoint..."
sleep 3
RESPONSE=$(curl -s http://localhost:3001/api/ratio-fixer/health)
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

if echo "$RESPONSE" | grep -q '"available":true'; then
    echo ""
    echo "✅✅✅ SUCCESS! API is working correctly! ✅✅✅"
else
    echo ""
    echo "⚠️  API still showing as unavailable"
    echo "   Check API logs: docker compose logs api --tail 20"
fi

# Step 10: Test with CORS headers
echo ""
echo "Step 9: Testing with CORS headers..."
curl -v -H "Origin: https://app.artistinfluence.com" \
  http://localhost:3001/api/ratio-fixer/health 2>&1 | grep -i "access-control" || echo "CORS headers check complete"

echo ""
echo "=========================================="
echo "Fix Complete!"
echo "=========================================="

