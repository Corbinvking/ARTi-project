#!/bin/bash
# Find Caddy configuration file

echo "=========================================="
echo "Finding Caddy Configuration"
echo "=========================================="
echo ""

# Step 1: Check Caddy process
echo "Step 1: Checking Caddy process..."
CADDY_PID=$(pgrep -f "caddy run" | head -1)
if [ -n "$CADDY_PID" ]; then
    echo "✅ Found Caddy process: PID $CADDY_PID"
    
    # Get full command line
    CADDY_CMD=$(ps -p $CADDY_PID -o args=)
    echo "Command: $CADDY_CMD"
    
    # Extract config file path
    if echo "$CADDY_CMD" | grep -q " --config "; then
        CADDYFILE_PATH=$(echo "$CADDY_CMD" | sed -n 's/.*--config \([^ ]*\).*/\1/p')
        echo "✅ Config file: $CADDYFILE_PATH"
    elif echo "$CADDY_CMD" | grep -q " -conf "; then
        CADDYFILE_PATH=$(echo "$CADDY_CMD" | sed -n 's/.*-conf \([^ ]*\).*/\1/p')
        echo "✅ Config file: $CADDYFILE_PATH"
    else
        echo "⚠️  No --config or -conf found in command"
        echo "   Trying default locations..."
        CADDYFILE_PATH="/etc/caddy/Caddyfile"
    fi
else
    echo "❌ Caddy process not found"
    exit 1
fi

# Step 2: Verify Caddyfile exists
echo ""
echo "Step 2: Verifying Caddyfile..."
if [ -f "$CADDYFILE_PATH" ]; then
    echo "✅ Caddyfile found at: $CADDYFILE_PATH"
    echo ""
    echo "File size: $(du -h "$CADDYFILE_PATH" | cut -f1)"
    echo "Last modified: $(stat -c %y "$CADDYFILE_PATH")"
else
    echo "❌ Caddyfile not found at: $CADDYFILE_PATH"
    echo ""
    echo "Searching for Caddyfile..."
    find /etc /opt /home /root -name "Caddyfile" 2>/dev/null | head -5
    exit 1
fi

# Step 3: Show API proxy configuration
echo ""
echo "Step 3: Current API proxy configuration..."
echo "----------------------------------------"
grep -A 10 "api.artistinfluence.com" "$CADDYFILE_PATH" || echo "No api.artistinfluence.com block found"
echo ""

# Step 4: Check for reverse_proxy directives
echo "Step 4: Checking reverse_proxy directives..."
grep -n "reverse_proxy" "$CADDYFILE_PATH" | head -10

# Step 5: Check what port it's proxying to
echo ""
echo "Step 5: Checking proxy ports..."
grep "reverse_proxy.*300" "$CADDYFILE_PATH" || echo "No port 300x found"

echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo "Caddyfile location: $CADDYFILE_PATH"
echo ""
echo "To edit: sudo nano $CADDYFILE_PATH"
echo "To reload: sudo systemctl reload caddy (if systemd) or kill -USR1 $CADDY_PID"

