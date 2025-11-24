#!/bin/bash
# Check how Caddy was originally started

set -e

echo "=========================================="
echo "Checking Caddy Original Startup Method"
echo "=========================================="
echo ""

# Step 1: Check if Caddy is in a Docker container
echo "Step 1: Checking if Caddy is in Docker..."
if docker ps -a | grep -i caddy; then
    echo "✅ Found Caddy container"
    docker ps -a | grep -i caddy
else
    echo "No Caddy container found"
fi

# Step 2: Check for startup scripts
echo ""
echo "Step 2: Checking for startup scripts..."
find /etc/systemd/system /etc/init.d /root /home -name "*caddy*" -type f 2>/dev/null | head -10

# Step 3: Check process history
echo ""
echo "Step 3: Checking recent processes..."
# Check if there's a way to see how Caddy was started
if command -v lastcomm >/dev/null 2>&1; then
    lastcomm caddy 2>/dev/null | head -5 || echo "No process history"
fi

# Step 4: Check if Caddy might be installed via snap
echo ""
echo "Step 4: Checking snap packages..."
if command -v snap >/dev/null 2>&1; then
    snap list | grep caddy || echo "No Caddy snap package"
fi

# Step 5: Check if Caddy is in PATH but not found
echo ""
echo "Step 5: Checking PATH..."
echo "PATH: $PATH"
which -a caddy 2>/dev/null || echo "Caddy not in PATH"

# Step 6: Check if there's a caddy binary in /usr/local/bin or /opt
echo ""
echo "Step 6: Checking common binary locations..."
for DIR in /usr/local/bin /opt/caddy /snap/bin /usr/bin; do
    if [ -f "$DIR/caddy" ]; then
        echo "✅ Found: $DIR/caddy"
        ls -la "$DIR/caddy"
    fi
done

# Step 7: Try to download/install Caddy if not found
echo ""
echo "Step 7: Installing Caddy if needed..."
if ! command -v caddy >/dev/null 2>&1; then
    echo "Caddy not found. Installing..."
    
    # Try to install via package manager
    if command -v apt-get >/dev/null 2>&1; then
        echo "Installing Caddy via apt..."
        sudo apt-get update
        sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
        curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
        curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
        sudo apt-get update
        sudo apt-get install -y caddy
    elif command -v yum >/dev/null 2>&1; then
        echo "Installing Caddy via yum..."
        sudo yum install -y 'dnf-command(copr)'
        sudo dnf copr enable @caddy/caddy
        sudo dnf install -y caddy
    else
        echo "⚠️  Package manager not found. Manual installation needed."
        echo "Visit: https://caddyserver.com/docs/install"
    fi
    
    # Verify installation
    if command -v caddy >/dev/null 2>&1; then
        echo "✅ Caddy installed successfully"
        CADDY_BIN=$(which caddy)
        echo "Caddy binary: $CADDY_BIN"
    else
        echo "❌ Caddy installation failed"
    fi
else
    echo "✅ Caddy is already installed"
    CADDY_BIN=$(which caddy)
    echo "Caddy binary: $CADDY_BIN"
fi

# Step 8: Start Caddy
echo ""
echo "Step 8: Starting Caddy..."
if command -v caddy >/dev/null 2>&1; then
    CADDY_BIN=$(which caddy)
    CADDYFILE="/etc/caddy/Caddyfile"
    
    # Create log directory
    sudo mkdir -p /var/log/caddy
    
    # Start Caddy
    echo "Starting Caddy with: $CADDY_BIN run --config $CADDYFILE --adapter caddyfile"
    sudo nohup "$CADDY_BIN" run --config "$CADDYFILE" --adapter caddyfile > /var/log/caddy/startup.log 2>&1 &
    
    sleep 3
    
    # Check if started
    if pgrep -f "caddy run" > /dev/null; then
        echo "✅ Caddy started successfully"
        pgrep -f "caddy run"
    else
        echo "❌ Caddy failed to start. Check logs:"
        sudo tail -20 /var/log/caddy/startup.log 2>/dev/null || echo "No startup log"
    fi
else
    echo "❌ Cannot start Caddy - binary not found"
fi

# Step 9: Test API
echo ""
echo "Step 9: Testing external API..."
sleep 5
EXTERNAL_RESPONSE=$(curl -s -H "Origin: https://app.artistinfluence.com" \
  --max-time 15 \
  https://api.artistinfluence.com/api/ratio-fixer/health 2>&1)

if echo "$EXTERNAL_RESPONSE" | grep -q '"available":true'; then
    echo "✅✅✅ SUCCESS! External API is working! ✅✅✅"
    echo "$EXTERNAL_RESPONSE" | jq . 2>/dev/null || echo "$EXTERNAL_RESPONSE"
else
    echo "⚠️  External API response:"
    echo "$EXTERNAL_RESPONSE" | head -30
fi

echo ""
echo "=========================================="
echo "Check Complete"
echo "=========================================="

