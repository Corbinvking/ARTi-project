#!/bin/bash
# Quick script to check Flask service logs and diagnose issues

echo "=========================================="
echo "Checking Ratio Fixer Service Logs"
echo "=========================================="
echo ""

# Check service status
echo "Service Status:"
sudo systemctl status ratio-fixer --no-pager -l

echo ""
echo "=========================================="
echo "Recent Logs (last 50 lines):"
echo "=========================================="
sudo journalctl -u ratio-fixer -n 50 --no-pager

echo ""
echo "=========================================="
echo "Checking for common issues:"
echo "=========================================="

# Check if main.py exists
if [ -f "/opt/ratio-fixer/main.py" ]; then
    echo "✅ main.py exists"
else
    echo "❌ main.py NOT FOUND"
fi

# Check if venv exists
if [ -d "/opt/ratio-fixer/venv" ]; then
    echo "✅ venv directory exists"
else
    echo "❌ venv directory NOT FOUND"
fi

# Check if .env exists
if [ -f "/opt/ratio-fixer/.env" ]; then
    echo "✅ .env file exists"
    echo "   Checking for required keys:"
    if grep -q "RATIO_FIXER_API_KEY" /opt/ratio-fixer/.env; then
        echo "   ✅ RATIO_FIXER_API_KEY found"
    else
        echo "   ❌ RATIO_FIXER_API_KEY missing"
    fi
    if grep -q "GOOGLE_APPLICATION_CREDENTIALS" /opt/ratio-fixer/.env; then
        echo "   ✅ GOOGLE_APPLICATION_CREDENTIALS found"
    else
        echo "   ❌ GOOGLE_APPLICATION_CREDENTIALS missing"
    fi
else
    echo "❌ .env file NOT FOUND"
fi

# Check Python syntax
echo ""
echo "Checking Python syntax..."
cd /opt/ratio-fixer
source venv/bin/activate
python3 -m py_compile main.py 2>&1 && echo "✅ Python syntax OK" || echo "❌ Python syntax error"

# Check if port 5000 is in use
echo ""
echo "Checking if port 5000 is in use:"
if lsof -i :5000 > /dev/null 2>&1; then
    echo "⚠️  Port 5000 is in use:"
    lsof -i :5000
else
    echo "✅ Port 5000 is available"
fi

echo ""
echo "=========================================="
echo "To see live logs, run:"
echo "  sudo journalctl -u ratio-fixer -f"
echo "=========================================="

