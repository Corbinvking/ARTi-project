#!/bin/bash

# ==========================================
#  Start VNC + Manual Login (All-in-One)
# ==========================================
# This script:
#   1. Starts Xvfb (virtual display)
#   2. Starts x11vnc (VNC server)
#   3. Opens browser for manual Spotify login
#
# Usage:
#   ssh root@your-server
#   cd /root/arti-marketing-ops/spotify_scraper
#   bash start_vnc_and_login.sh
# ==========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Configuration
VNC_PORT=5900
VNC_PASSWORD="${VNC_PASSWORD:-spotify123}"
DISPLAY_NUM=99

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 SPOTIFY MANUAL LOGIN WITH VNC"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if x11vnc is installed
if ! command -v x11vnc &> /dev/null; then
    echo "❌ x11vnc not found. Installing..."
    apt-get update -qq
    apt-get install -y -qq x11vnc xvfb fluxbox
    echo "✓ Installed x11vnc"
fi

# Setup VNC password if not exists
if [ ! -f /root/.vnc/passwd ]; then
    echo "Setting up VNC password..."
    mkdir -p /root/.vnc
    x11vnc -storepasswd "$VNC_PASSWORD" /root/.vnc/passwd
    chmod 600 /root/.vnc/passwd
fi

# Stop any existing processes
echo "[1/4] Cleaning up existing processes..."
pkill -9 x11vnc 2>/dev/null || true
pkill -9 Xvfb 2>/dev/null || true
pkill -9 chromium 2>/dev/null || true
pkill -9 chrome 2>/dev/null || true
sleep 1

# Clear any browser locks (in case of crash)
echo "[2/4] Clearing browser locks..."
rm -f data/browser_data/SingletonLock 2>/dev/null || true
rm -f data/browser_data/SingletonCookie 2>/dev/null || true
rm -f data/browser_data/SingletonSocket 2>/dev/null || true

# Start Xvfb
echo "[3/4] Starting virtual display :$DISPLAY_NUM..."
Xvfb :$DISPLAY_NUM -screen 0 1920x1080x24 -ac > /dev/null 2>&1 &
XVFB_PID=$!
export DISPLAY=:$DISPLAY_NUM
sleep 2

if ! ps -p $XVFB_PID > /dev/null; then
    echo "❌ Failed to start Xvfb"
    exit 1
fi
echo "   ✓ Xvfb running (PID: $XVFB_PID)"

# Start VNC server
echo "[4/4] Starting VNC server..."
x11vnc -display :$DISPLAY_NUM \
    -forever \
    -shared \
    -rfbauth /root/.vnc/passwd \
    -rfbport $VNC_PORT \
    -bg \
    -o /var/log/x11vnc.log \
    -noxdamage

sleep 1

# Verify VNC is running
if pgrep -x x11vnc > /dev/null; then
    echo "   ✓ VNC server running on port $VNC_PORT"
else
    echo "❌ Failed to start VNC server"
    exit 1
fi

# Get server IPs
SERVER_IPS=$(hostname -I 2>/dev/null || ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v 127.0.0.1)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📡 VNC SERVER READY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Connect with your VNC client to:"
for ip in $SERVER_IPS; do
    echo "   ${ip}:$VNC_PORT"
done
echo ""
echo "Password: $VNC_PASSWORD"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Load environment
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

echo "🌐 Starting browser for manual login..."
echo "   Watch your VNC viewer for the browser window!"
echo ""
echo "📋 Instructions:"
echo "   1. Connect to VNC (see above)"
echo "   2. Login to Spotify for Artists in the browser"
echo "   3. Solve any CAPTCHA if prompted"
echo "   4. Wait until you see the Spotify dashboard"
echo "   5. Press Ctrl+C here when done"
echo ""

# Start the manual browser login
export DISPLAY=:$DISPLAY_NUM
export HEADLESS=false
python3 manual_browser_login.py

# Cleanup on exit
echo ""
echo "Cleaning up..."
pkill -9 x11vnc 2>/dev/null || true
pkill -9 Xvfb 2>/dev/null || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SESSION SAVED!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🧪 Test the scraper:"
echo "   bash run_production_scraper.sh"
echo ""
