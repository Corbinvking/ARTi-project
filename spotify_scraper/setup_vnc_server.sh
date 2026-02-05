#!/bin/bash

# ==========================================
#  VNC Server Setup for Spotify Scraper
# ==========================================
# This script installs and configures x11vnc
# so you can connect remotely and do manual logins
#
# Usage:
#   1. SSH into your server
#   2. Run: bash setup_vnc_server.sh
#   3. Connect with VNC client to: your-server-ip:5900
# ==========================================

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🖥️  VNC SERVER SETUP FOR SPOTIFY SCRAPER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (sudo)"
    exit 1
fi

# Install required packages
echo "[1/5] Installing required packages..."
apt-get update -qq
apt-get install -y -qq x11vnc xvfb fluxbox xterm > /dev/null 2>&1
echo "      ✓ Packages installed"

# Create VNC password
VNC_PASSWORD="${VNC_PASSWORD:-spotify123}"
echo ""
echo "[2/5] Setting VNC password..."
mkdir -p /root/.vnc
x11vnc -storepasswd "$VNC_PASSWORD" /root/.vnc/passwd
chmod 600 /root/.vnc/passwd
echo "      ✓ VNC password set"

# Stop any existing Xvfb/x11vnc processes
echo ""
echo "[3/5] Cleaning up existing processes..."
pkill -9 x11vnc 2>/dev/null || true
pkill -9 Xvfb 2>/dev/null || true
pkill -9 fluxbox 2>/dev/null || true
sleep 1
echo "      ✓ Old processes stopped"

# Start Xvfb
echo ""
echo "[4/5] Starting virtual display..."
Xvfb :99 -screen 0 1920x1080x24 -ac &
export DISPLAY=:99
sleep 2

# Start fluxbox window manager (optional but helpful)
fluxbox &
sleep 1
echo "      ✓ Virtual display :99 running"

# Start x11vnc
echo ""
echo "[5/5] Starting VNC server..."
x11vnc -display :99 -forever -shared -rfbauth /root/.vnc/passwd -bg -o /var/log/x11vnc.log
sleep 1
echo "      ✓ VNC server running on port 5900"

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ VNC SERVER READY!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📡 Connection Details:"
echo "   Host: ${SERVER_IP}:5900"
echo "   Password: ${VNC_PASSWORD}"
echo ""
echo "🔌 Connect using any VNC client:"
echo "   - RealVNC: https://www.realvnc.com/download/viewer/"
echo "   - TightVNC: https://www.tightvnc.com/"
echo "   - TigerVNC: https://tigervnc.org/"
echo "   - Mac: built-in Screen Sharing"
echo ""
echo "🔐 Now run the manual login:"
echo "   cd /root/arti-marketing-ops/spotify_scraper"
echo "   python3 manual_browser_login.py"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
