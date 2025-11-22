#!/bin/bash
# Manual Interactive Login to Spotify for Artists
# This will keep the browser open so you can manually log in

cd /root/arti-marketing-ops/spotify_scraper

# Start Xvfb if not running
if ! pgrep -x "Xvfb" > /dev/null; then
    echo "Starting Xvfb on display :99..."
    Xvfb :99 -screen 0 1920x1080x24 &
    sleep 2
fi
export DISPLAY=:99

cat > manual_login.py << 'EOF'
import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load .env
env_path = Path('/root/arti-marketing-ops/spotify_scraper/.env')
load_dotenv(env_path)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'runner'))
from app.scraper import SpotifyArtistsScraper

async def manual_login():
    """Keep browser open for manual login"""
    
    print("=" * 60)
    print("  MANUAL LOGIN - Spotify for Artists")
    print("=" * 60)
    print()
    print("This will:")
    print("  1. Open a browser (visible on server via Xvfb)")
    print("  2. Navigate to Spotify for Artists login")
    print("  3. Wait for you to complete the login manually")
    print("  4. Take screenshots every 10 seconds to guide you")
    print("  5. Detect when login is complete")
    print("  6. Save the session for future use")
    print()
    print("Screenshots will be saved to: /var/log/spotify-scraper/")
    print()
    input("Press Enter to start...")
    
    print("\nStarting browser...")
    scraper = SpotifyArtistsScraper(headless=False)
    await scraper.start()
    
    try:
        # Navigate to login page
        print("Navigating to Spotify for Artists...")
        await scraper.page.goto('https://artists.spotify.com', wait_until='domcontentloaded')
        await asyncio.sleep(3)
        
        # If already logged in, great!
        if 'home' in scraper.page.url:
            print("✅ Already logged in!")
        else:
            print("\n📸 Taking screenshots every 10 seconds...")
            print("   Download them to see progress:")
            print("   scp root@165.227.91.129:/var/log/spotify-scraper/manual_login_*.png .")
            print()
            
            # Wait for login (take screenshots every 10 seconds)
            for i in range(60):  # Wait up to 10 minutes
                screenshot_path = f'/var/log/spotify-scraper/manual_login_{i+1:02d}.png'
                await scraper.page.screenshot(path=screenshot_path)
                print(f"   [{i+1}/60] Screenshot saved: manual_login_{i+1:02d}.png")
                
                # Check if we're logged in
                current_url = scraper.page.url
                if 'artists.spotify.com/home' in current_url or await scraper.page.locator('text=Home').count() > 0:
                    print("\n✅ Login detected!")
                    break
                
                await asyncio.sleep(10)
            else:
                print("\n⏱️  Timeout after 10 minutes")
                await scraper.stop()
                return
        
        # Verify we have the critical cookie
        print("\nVerifying authentication cookies...")
        cookies = await scraper.context.cookies()
        spotify_cookies = [c for c in cookies if 'spotify.com' in c['domain']]
        cookie_names = [c['name'] for c in spotify_cookies]
        
        print(f"Found {len(spotify_cookies)} Spotify cookies")
        critical = ['sp_dc', 'sp_key', 'sp_t']
        found_critical = [c for c in critical if c in cookie_names]
        missing_critical = [c for c in critical if c not in cookie_names]
        
        print(f"✅ Critical cookies present: {found_critical}")
        if missing_critical:
            print(f"⚠️  Critical cookies MISSING: {missing_critical}")
            print("   The login may be incomplete!")
        else:
            print("✅ All critical auth cookies present!")
        
        # Test navigation to a song page
        print("\nTesting navigation to song page...")
        test_url = "https://artists.spotify.com/c/artist/36Bfcbr8mLMRPteWtBIm6Y/song/2IwIvnhAM0zqBAKR7vnteg/stats"
        await scraper.page.goto(test_url, wait_until='domcontentloaded', timeout=30000)
        await asyncio.sleep(3)
        
        final_url = scraper.page.url
        if 'login' in final_url.lower():
            print("❌ Still redirecting to login!")
            print(f"   URL: {final_url}")
        else:
            print("✅ Successfully navigated to song page!")
            print("   Session is working correctly!")
        
        await scraper.stop()
        
        print("\n" + "=" * 60)
        print("  Session saved!")
        print("=" * 60)
        print("\nNow test with:")
        print("  bash test_real_campaign.sh")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        await scraper.stop()

if __name__ == '__main__':
    asyncio.run(manual_login())
EOF

python3 manual_login.py

