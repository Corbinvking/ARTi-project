#!/bin/bash
# Verify Ratio Fixer is fully working

echo "=========================================="
echo "Verifying Ratio Fixer Integration"
echo "=========================================="
echo ""

# Step 1: Check Flask service
echo "Step 1: Checking Flask service..."
if sudo systemctl is-active --quiet ratio-fixer; then
    echo "✅ Flask service is running"
else
    echo "❌ Flask service is not running"
    exit 1
fi

# Step 2: Check Flask is listening
echo ""
echo "Step 2: Checking Flask listening address..."
FLASK_LISTEN=$(sudo netstat -tlnp 2>/dev/null | grep :5000 || ss -tlnp 2>/dev/null | grep :5000)
echo "Flask: $FLASK_LISTEN"

if echo "$FLASK_LISTEN" | grep -q "0.0.0.0:5000\|:::5000"; then
    echo "✅ Flask is listening on all interfaces"
else
    echo "⚠️  Flask may only be on localhost - restarting service..."
    sudo systemctl restart ratio-fixer
    sleep 3
fi

# Step 3: Test Flask from host
echo ""
echo "Step 3: Testing Flask from host..."
HOST_TEST=$(curl -s http://localhost:5000/healthz)
if echo "$HOST_TEST" | grep -q "healthy"; then
    echo "✅ Flask is accessible from host"
else
    echo "❌ Flask not accessible: $HOST_TEST"
    exit 1
fi

# Step 4: Get host IP and test from container
HOST_IP=$(hostname -I | awk '{print $1}')
echo ""
echo "Step 4: Testing Flask from API container (host IP: $HOST_IP)..."
CONTAINER_TEST=$(docker exec arti-api curl -s --connect-timeout 3 http://${HOST_IP}:5000/healthz)
if echo "$CONTAINER_TEST" | grep -q "healthy"; then
    echo "✅ Flask is accessible from API container"
else
    echo "❌ Flask not accessible from container: $CONTAINER_TEST"
    exit 1
fi

# Step 5: Check API configuration
echo ""
echo "Step 5: Checking API configuration..."
if grep -q "RATIO_FIXER_URL=http://${HOST_IP}:5000" ~/arti-marketing-ops/apps/api/production.env; then
    echo "✅ API is configured with host IP"
else
    echo "⚠️  API URL may need updating"
    grep RATIO_FIXER_URL ~/arti-marketing-ops/apps/api/production.env || echo "RATIO_FIXER_URL not found"
fi

# Step 6: Test API bridge endpoint
echo ""
echo "Step 6: Testing API bridge health endpoint..."
sleep 3
API_RESPONSE=$(curl -s http://localhost:3001/api/ratio-fixer/health)
echo "$API_RESPONSE" | jq . 2>/dev/null || echo "$API_RESPONSE"

if echo "$API_RESPONSE" | grep -q '"available":true'; then
    echo ""
    echo "✅✅✅ SUCCESS! Ratio Fixer is fully working! ✅✅✅"
    echo ""
    echo "You can now:"
    echo "1. Go to https://app.artistinfluence.com/youtube/campaigns"
    echo "2. Click a campaign"
    echo "3. Navigate to 'Ratio Fixer' tab"
    echo "4. Start automated engagement ordering!"
else
    echo ""
    echo "⚠️  API bridge still showing as unavailable"
    echo "Response: $API_RESPONSE"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check API logs: docker compose logs api --tail 20"
    echo "2. Verify env var: docker exec arti-api env | grep RATIO_FIXER"
    echo "3. Restart API: docker compose restart api"
fi

echo ""
echo "=========================================="
echo "Verification Complete"
echo "=========================================="

