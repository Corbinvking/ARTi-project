#!/bin/bash
# Fix Flask to listen on all interfaces (0.0.0.0) instead of just localhost

set -e

echo "=========================================="
echo "Fixing Flask to Listen on All Interfaces"
echo "=========================================="
echo ""

cd /opt/ratio-fixer

# Backup main.py
cp main.py main.py.backup.$(date +%Y%m%d_%H%M%S)

# Check current configuration
if grep -q "app.run(debug=True)" main.py; then
    echo "Found Flask run configuration..."
    
    # Update to listen on 0.0.0.0
    sed -i 's/app.run(debug=True)/app.run(host="0.0.0.0", port=5000, debug=True)/' main.py
    
    echo "✅ Updated Flask to listen on 0.0.0.0:5000"
else
    echo "⚠️  Could not find app.run() - checking manually..."
    grep -A 2 "if __name__" main.py
fi

# Verify the change
echo ""
echo "Verifying change..."
if grep -q 'app.run(host="0.0.0.0"' main.py; then
    echo "✅ Flask will now listen on all interfaces"
else
    echo "❌ Change may not have been applied correctly"
    exit 1
fi

# Restart Flask service
echo ""
echo "Restarting Flask service..."
sudo systemctl restart ratio-fixer
sleep 3

# Verify Flask is listening on 0.0.0.0
echo ""
echo "Verifying Flask is listening on 0.0.0.0..."
sleep 2
if sudo netstat -tlnp 2>/dev/null | grep :5000 | grep -q "0.0.0.0:5000"; then
    echo "✅ Flask is now listening on 0.0.0.0:5000"
elif ss -tlnp 2>/dev/null | grep :5000 | grep -q "0.0.0.0:5000"; then
    echo "✅ Flask is now listening on 0.0.0.0:5000"
else
    echo "⚠️  Flask may still be listening on localhost only"
    echo "   Check manually: sudo netstat -tlnp | grep :5000"
fi

# Test from host
echo ""
echo "Testing Flask from host..."
curl -s http://localhost:5000/healthz && echo " ✅ Host connection works" || echo " ❌ Host connection failed"

# Get Docker gateway and test from container
DOCKER_GATEWAY=$(docker network inspect bridge --format '{{range .IPAM.Config}}{{.Gateway}}{{end}}' 2>/dev/null || echo "172.17.0.1")
echo ""
echo "Testing Flask from API container (gateway: $DOCKER_GATEWAY)..."
docker exec arti-api curl -s --connect-timeout 3 http://${DOCKER_GATEWAY}:5000/healthz && echo " ✅ Container connection works!" || echo " ❌ Container connection failed"

# Update API production.env if needed
echo ""
echo "Updating API configuration..."
cd ~/arti-marketing-ops
sed -i "s|RATIO_FIXER_URL=.*|RATIO_FIXER_URL=http://${DOCKER_GATEWAY}:5000|" apps/api/production.env
docker compose restart api
sleep 5

# Final test
echo ""
echo "Final API bridge test..."
sleep 3
curl -s http://localhost:3001/api/ratio-fixer/health | jq . 2>/dev/null || curl -s http://localhost:3001/api/ratio-fixer/health

echo ""
echo "=========================================="
echo "✅ Fix Complete!"
echo "=========================================="

