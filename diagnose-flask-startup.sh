#!/bin/bash
# Diagnose Flask startup issues

echo "=========================================="
echo "Diagnosing Flask Startup Issues"
echo "=========================================="
echo ""

echo "Step 1: Check Flask service status..."
sudo systemctl status ratio-fixer --no-pager -l
echo ""

echo "Step 2: Check if Flask is listening..."
sudo netstat -tlnp 2>/dev/null | grep ":5000" || sudo ss -tlnp 2>/dev/null | grep ":5000"
echo ""

echo "Step 3: Check Flask logs (last 50 lines)..."
sudo journalctl -u ratio-fixer -n 50 --no-pager
echo ""

echo "Step 4: Check for Python errors..."
sudo journalctl -u ratio-fixer -n 100 --no-pager | grep -i "error\|traceback\|exception" | tail -20
echo ""

echo "Step 5: Test manual Flask start (if needed)..."
echo "If Flask isn't running, try:"
echo "  cd /opt/ratio-fixer"
echo "  source venv/bin/activate"
echo "  python main.py"

