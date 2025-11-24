#!/bin/bash
# Find Caddy binary and start it

set -e

echo "=========================================="
echo "Finding and Starting Caddy"
echo "=========================================="
echo ""

# Step 1: Check if Caddy is already running
echo "Step 1: Checking if Caddy is running..."
if pgrep -f "caddy run" > /dev/null; then
    echo "✅ Caddy is already running"
    exit 0
fi

# Step 2: Find Caddy binary in common locations
echo ""
echo "Step 2: Finding Caddy binary..."
CADDY_BIN=""

# Check common locations
for LOC in "/usr/bin/caddy" "/usr/local/bin/caddy" "/opt/caddy/caddy" "/snap/bin/caddy"; do
    if [ -f "$LOC" ] && [ -x "$LOC" ]; then
        CADDY_BIN="$LOC"
        echo "✅ Found Caddy at: $CADDY_BIN"
        break
    fi
done

# If not found, search more broadly
if [ -z "$CADDY_BIN" ]; then
    echo "Searching for Caddy binary..."
    CADDY_BIN=$(find /usr /opt /snap -type f -name "caddy" -executable 2>/dev/null | head -1)
    if [ -n "$CADDY_BIN" ]; then
        echo "✅ Found Caddy at: $CADDY_BIN"
    fi
fi

# If still not found, check if it's in a Docker container or installed via package manager
if [ -z "$CADDY_BIN" ]; then
    echo "Checking package manager..."
    if command -v dpkg >/dev/null 2>&1; then
        CADDY_PKG=$(dpkg -L caddy 2>/dev/null | grep -E "/usr/bin/caddy|/usr/local/bin/caddy" | head -1)
        if [ -n "$CADDY_PKG" ] && [ -x "$CADDY_PKG" ]; then
            CADDY_BIN="$CADDY_PKG"
            echo "✅ Found Caddy via package manager: $CADDY_BIN"
        fi
    fi
fi

# If still not found, try to install or use systemd
if [ -z "$CADDY_BIN" ]; then
    echo "⚠️  Caddy binary not found"
    echo "Checking if Caddy is managed by systemd..."
    if systemctl list-units --all | grep -q caddy; then
        echo "✅ Caddy systemd service found"
        echo "Starting Caddy via systemd..."
        sudo systemctl start caddy
        sleep 3
        if systemctl is-active --quiet caddy; then
            echo "✅ Caddy started via systemd"
            exit 0
        fi
    else
        echo "❌ Caddy not found and no systemd service"
        echo "You may need to install Caddy or check how it was originally started"
        exit 1
    fi
fi

# Step 3: Verify Caddyfile exists
echo ""
echo "Step 3: Verifying Caddyfile..."
CADDYFILE="/etc/caddy/Caddyfile"
if [ ! -f "$CADDYFILE" ]; then
    echo "❌ Caddyfile not found at $CADDYFILE"
    exit 1
fi
echo "✅ Caddyfile found"

# Step 4: Start Caddy
echo ""
echo "Step 4: Starting Caddy..."
# Create log directory if it doesn't exist
sudo mkdir -p /var/log/caddy

# Start Caddy in background
sudo nohup "$CADDY_BIN" run --config "$CADDYFILE" --adapter caddyfile > /var/log/caddy/startup.log 2>&1 &

# Wait a moment
sleep 3

# Check if it started
CADDY_PID=$(pgrep -f "caddy run" | head -1)
if [ -n "$CADDY_PID" ]; then
    echo "✅ Caddy started (PID: $CADDY_PID)"
else
    echo "❌ Caddy failed to start. Check logs:"
    sudo tail -20 /var/log/caddy/startup.log 2>/dev/null || echo "No startup log"
    exit 1
fi

# Step 5: Wait for Caddy to be ready
echo ""
echo "Step 5: Waiting for Caddy to be ready..."
sleep 5

# Check if Caddy is responding
if curl -s http://localhost:2019/config/ > /dev/null 2>&1; then
    echo "✅ Caddy admin API is responding"
else
    echo "⚠️  Caddy admin API not responding yet (might be normal)"
fi

# Step 6: Check if Caddy is listening on ports
echo ""
echo "Step 6: Checking if Caddy is listening..."
if ss -tlnp | grep -q ":80\|:443" | grep caddy; then
    echo "✅ Caddy is listening on ports 80/443"
else
    echo "⚠️  Caddy might not be listening yet"
    ss -tlnp | grep -E ":80|:443" | head -5
fi

# Step 7: Test external API
echo ""
echo "Step 7: Testing external API..."
sleep 3
EXTERNAL_RESPONSE=$(curl -s -H "Origin: https://app.artistinfluence.com" \
  --max-time 15 \
  https://api.artistinfluence.com/api/ratio-fixer/health 2>&1)

if echo "$EXTERNAL_RESPONSE" | grep -q '"available":true'; then
    echo "✅✅✅ SUCCESS! External API is working! ✅✅✅"
    echo "$EXTERNAL_RESPONSE" | jq . 2>/dev/null || echo "$EXTERNAL_RESPONSE"
else
    echo "⚠️  External API response:"
    echo "$EXTERNAL_RESPONSE" | head -30
    
    # Check Caddy logs
    echo ""
    echo "Recent Caddy logs:"
    sudo tail -10 /var/log/caddy/error.log 2>/dev/null | jq -r '.msg' 2>/dev/null || sudo tail -10 /var/log/caddy/error.log 2>/dev/null || echo "No error log"
fi

echo ""
echo "=========================================="
echo "Start Complete"
echo "=========================================="

