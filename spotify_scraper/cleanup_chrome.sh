#!/bin/bash
# Check for lingering Chrome processes and clean up

echo "=========================================="
echo "  Chrome Process Cleanup"
echo "=========================================="
echo ""

echo "[1/3] Checking for Chrome processes..."
CHROME_PROCS=$(ps aux | grep -i chrome | grep -v grep)
if [ -z "$CHROME_PROCS" ]; then
    echo "✅ No Chrome processes running"
else
    echo "Found Chrome processes:"
    echo "$CHROME_PROCS"
    echo ""
    echo "Killing all Chrome processes..."
    pkill -9 chrome
    pkill -9 chromium
    sleep 2
    echo "✅ Chrome processes killed"
fi

echo ""
echo "[2/3] Checking for Xvfb..."
if pgrep -x "Xvfb" > /dev/null; then
    echo "✅ Xvfb is running"
else
    echo "Starting Xvfb..."
    Xvfb :99 -screen 0 1920x1080x24 &
    sleep 2
    echo "✅ Xvfb started"
fi

echo ""
echo "[3/3] Checking browser_data directory..."
BROWSER_DATA="/root/arti-marketing-ops/spotify_scraper/browser_data"
if [ -d "$BROWSER_DATA" ]; then
    echo "Browser data exists at: $BROWSER_DATA"
    echo "Size: $(du -sh $BROWSER_DATA | cut -f1)"
    
    # Check for lock files
    LOCKS=$(find "$BROWSER_DATA" -name "lockfile" -o -name "SingletonLock" 2>/dev/null)
    if [ ! -z "$LOCKS" ]; then
        echo "⚠️  Found lock files (will be removed):"
        echo "$LOCKS"
        find "$BROWSER_DATA" -name "lockfile" -delete 2>/dev/null
        find "$BROWSER_DATA" -name "SingletonLock" -delete 2>/dev/null
        echo "✅ Lock files removed"
    else
        echo "✅ No lock files found"
    fi
else
    echo "⚠️  Browser data directory doesn't exist!"
    echo "This means the login session was never saved."
fi

echo ""
echo "=========================================="
echo "  Ready to test!"
echo "=========================================="
echo ""
echo "Now run:"
echo "  bash capture_actual_page.sh"

