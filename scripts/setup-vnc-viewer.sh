#!/bin/bash
# Setup VNC viewer for Spotify scraper debugging

echo "🔧 Setting up VNC for scraper debugging..."
echo "========================================"

# Kill any existing VNC/Xvfb processes
pkill -9 x11vnc 2>/dev/null || true
pkill -9 Xvfb 2>/dev/null || true
sleep 2

# Start Xvfb (Virtual X server)
echo ""
echo "1️⃣  Starting Xvfb on display :99..."
Xvfb :99 -screen 0 1920x1080x24 > /dev/null 2>&1 &
sleep 3
echo "✅ Xvfb started"

# Start x11vnc (VNC server sharing the Xvfb display)
echo ""
echo "2️⃣  Starting x11vnc VNC server..."
x11vnc -display :99 -forever -shared -rfbport 5900 -nopw > /var/log/x11vnc.log 2>&1 &
sleep 2
echo "✅ VNC server started"

# Verify it's running
if pgrep x11vnc > /dev/null; then
    echo ""
    echo "========================================"
    echo "✅ VNC Server Ready!"
    echo "========================================"
    echo ""
    echo "📺 Connection Details:"
    echo "  Host: 164.90.129.146"
    echo "  Port: 5900"
    echo "  Password: (none)"
    echo ""
    echo "🔌 VNC Clients you can use:"
    echo "  • TightVNC Viewer (Windows)"
    echo "  • RealVNC Viewer (Cross-platform)"
    echo "  • TigerVNC (Linux)"
    echo "  • VNC Viewer (macOS)"
    echo ""
    echo "📝 To connect:"
    echo "  1. Open your VNC client"
    echo "  2. Enter: 164.90.129.146:5900"
    echo "  3. Connect (no password needed)"
    echo ""
    echo "🧪 To test the scraper while watching:"
    echo "  ssh root@164.90.129.146"
    echo "  cd /root/arti-marketing-ops/spotify_scraper"
    echo "  export DISPLAY=:99"
    echo "  python3 run_production_scraper.py --limit 3"
    echo ""
else
    echo "❌ VNC server failed to start"
    echo "Check logs: tail /var/log/x11vnc.log"
    exit 1
fi

