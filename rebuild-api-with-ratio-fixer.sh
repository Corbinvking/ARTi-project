#!/bin/bash
# Rebuild API container with Ratio Fixer routes

set -e

echo "=========================================="
echo "Rebuilding API Container with Ratio Fixer Routes"
echo "=========================================="
echo ""

cd ~/arti-marketing-ops

# Step 1: Stop the API container
echo "Step 1: Stopping API container..."
docker compose stop api

# Step 2: Remove old container
echo "Step 2: Removing old container..."
docker compose rm -f api

# Step 3: Build new image with no cache
echo "Step 3: Building new API image (this may take a few minutes)..."
docker compose build --no-cache api

# Step 4: Start the container
echo "Step 4: Starting API container..."
docker compose up -d api

# Step 5: Wait for health check
echo "Step 5: Waiting for API to be healthy..."
sleep 10

# Step 6: Test the route
echo "Step 6: Testing Ratio Fixer health endpoint..."
for i in {1..5}; do
    sleep 2
    RESPONSE=$(curl -s http://localhost:3001/api/ratio-fixer/health || echo "FAILED")
    if echo "$RESPONSE" | grep -q "available\|status"; then
        echo "✅ API route is working!"
        echo "Response: $RESPONSE"
        exit 0
    fi
    echo "Attempt $i: Still waiting..."
done

echo "⚠️  Route not responding yet. Check logs:"
echo "   docker compose logs api --tail 50"

echo ""
echo "Verify the route exists:"
echo "   curl http://localhost:3001/api/ratio-fixer/health"





