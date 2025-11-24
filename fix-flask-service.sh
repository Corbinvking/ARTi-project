#!/bin/bash
# Fix common Flask service startup issues

set -e

echo "=========================================="
echo "Fixing Ratio Fixer Service"
echo "=========================================="
echo ""

cd /opt/ratio-fixer

# Step 1: Check logs
echo "Step 1: Checking service logs..."
ERROR_LOG=$(sudo journalctl -u ratio-fixer -n 20 --no-pager | grep -i "error\|failed\|exception" | head -5)
if [ ! -z "$ERROR_LOG" ]; then
    echo "Found errors:"
    echo "$ERROR_LOG"
    echo ""
fi

# Step 2: Stop any manually running Flask instances
echo "Step 2: Stopping any manual Flask instances..."
pkill -f "python.*main.py" 2>/dev/null || true
sleep 2

# Step 3: Check Python syntax
echo "Step 3: Checking Python syntax..."
source venv/bin/activate
if python3 -m py_compile main.py 2>&1; then
    echo "✅ Python syntax OK"
else
    echo "❌ Python syntax error - check main.py"
    python3 -m py_compile main.py
    exit 1
fi

# Step 4: Verify dependencies
echo "Step 4: Verifying dependencies..."
pip install flask-cors flask flask-sqlalchemy flask-login flask-bcrypt flask-migrate > /dev/null 2>&1
echo "✅ Dependencies verified"

# Step 5: Check .env file
echo "Step 5: Checking .env file..."
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    exit 1
fi

if ! grep -q "RATIO_FIXER_API_KEY=" .env; then
    echo "⚠️  RATIO_FIXER_API_KEY not in .env - adding placeholder"
    echo "RATIO_FIXER_API_KEY=5f1c6f51dd6430beac6746467593e99b75b924ae1cde6b7f0943edef30d328c7" >> .env
fi

if ! grep -q "GOOGLE_APPLICATION_CREDENTIALS=" .env; then
    echo "⚠️  GOOGLE_APPLICATION_CREDENTIALS not in .env - adding"
    echo "GOOGLE_APPLICATION_CREDENTIALS=/opt/ratio-fixer/rich-phenomenon-428302-q5-dba5f2f381c1.json" >> .env
fi

# Step 6: Test Flask app manually
echo "Step 6: Testing Flask app manually (5 second test)..."
timeout 5 python3 main.py > /tmp/flask-test.log 2>&1 &
FLASK_PID=$!
sleep 3
if ps -p $FLASK_PID > /dev/null; then
    echo "✅ Flask app starts successfully"
    kill $FLASK_PID 2>/dev/null || true
    wait $FLASK_PID 2>/dev/null || true
else
    echo "❌ Flask app failed to start - check /tmp/flask-test.log"
    cat /tmp/flask-test.log
    exit 1
fi

# Step 7: Restart service
echo "Step 7: Restarting service..."
sudo systemctl daemon-reload
sudo systemctl restart ratio-fixer
sleep 3

# Step 8: Check if service is running
if sudo systemctl is-active --quiet ratio-fixer; then
    echo "✅ Service is now running!"
    echo ""
    echo "Test health endpoint:"
    sleep 2
    curl -s http://localhost:5000/healthz || echo "Health check failed - wait a few seconds and try again"
else
    echo "❌ Service still not running"
    echo ""
    echo "Check logs:"
    sudo journalctl -u ratio-fixer -n 30 --no-pager
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ Service Fixed!"
echo "=========================================="

