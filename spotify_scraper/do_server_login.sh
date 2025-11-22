#!/bin/bash

# ==========================================
#  Interactive Login on Server
# ==========================================
# This script helps you log in to Spotify
# for Artists on the production server

set -e

echo "=========================================="
echo "  Spotify Login on Server"
echo "=========================================="
echo ""
echo "This will:"
echo "  1. Start browser in GUI mode with Xvfb"
echo "  2. Navigate to Spotify for Artists login"
echo "  3. Wait for you to manually login"
echo "  4. Save the session to browser_data/"
echo ""
echo "You'll need to:"
echo "  - Have X11 forwarding enabled (ssh -X)"
echo "  - OR take screenshots to guide you"
echo ""

# Load environment
cd /root/arti-marketing-ops
source spotify_scraper/.env

# Create session directory
mkdir -p /root/arti-marketing-ops/spotify_scraper/browser_data

# Create Python login script
cat > /tmp/spotify_login.py << 'PYTHON_EOF'
import asyncio
import os
import sys

# Add parent directory to path
sys.path.insert(0, '/root/arti-marketing-ops/spotify_scraper')

from runner.app.scraper import SpotifyArtistsScraper

async def manual_login():
    """Guide user through manual login"""
    
    print("\n[1/5] Starting browser...")
    print("     Using GUI mode with Xvfb virtual display")
    
    # Start with GUI mode
    os.environ['HEADLESS'] = 'false'
    
    scraper = SpotifyArtistsScraper()
    await scraper.start()
    
    page = scraper.page
    
    print("\n[2/5] Navigating to Spotify for Artists...")
    await page.goto('https://artists.spotify.com', wait_until='domcontentloaded')
    
    print("\n[3/5] Please log in manually!")
    print("     The browser is running on display :99")
    print("     Taking screenshot every 10 seconds...")
    
    screenshot_num = 1
    
    # Wait for login (check every 10 seconds)
    for i in range(60):  # Wait up to 10 minutes
        try:
            # Take screenshot
            screenshot_path = f'/var/log/spotify-scraper/login_step_{screenshot_num}.png'
            await page.screenshot(path=screenshot_path)
            print(f"     Screenshot {screenshot_num}: {screenshot_path}")
            screenshot_num += 1
            
            # Check if we're logged in
            if 'artists.spotify.com/home' in page.url or await page.locator('text=Home').count() > 0:
                print("\n[4/5] ✓ Login detected!")
                break
                
            print(f"     Still waiting... ({i+1}/60)")
            await asyncio.sleep(10)
            
        except Exception as e:
            print(f"     Error: {e}")
            continue
    else:
        print("\n[ERROR] Login timeout after 10 minutes")
        await scraper.stop()
        sys.exit(1)
    
    # Verify we're logged in
    print("\n[5/5] Verifying login...")
    await page.goto('https://artists.spotify.com/home', wait_until='domcontentloaded')
    
    if await page.locator('text=Home').count() > 0:
        print("\n✓ Login successful!")
        print("✓ Session saved to: /root/arti-marketing-ops/spotify_scraper/browser_data/")
    else:
        print("\n✗ Login verification failed")
        await scraper.stop()
        sys.exit(1)
    
    await scraper.stop()
    print("\n==========================================")
    print("  Login complete!")
    print("==========================================")

if __name__ == '__main__':
    asyncio.run(manual_login())
PYTHON_EOF

# Start Xvfb if not running
if ! pgrep -x "Xvfb" > /dev/null; then
    echo "Starting Xvfb on display :99..."
    Xvfb :99 -screen 0 1920x1080x24 &
    export DISPLAY=:99
    sleep 2
fi

# Run login script
echo ""
echo "Starting login process..."
python3 /tmp/spotify_login.py

# Cleanup
rm /tmp/spotify_login.py

echo ""
echo "To view screenshots:"
echo "  scp root@165.227.91.129:/var/log/spotify-scraper/login_step_*.png ."

