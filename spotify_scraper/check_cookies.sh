#!/bin/bash
# Check browser cookies and session state

cd /root/arti-marketing-ops/spotify_scraper

cat > check_cookies.py << 'EOF'
import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import json

# Load .env
env_path = Path('/root/arti-marketing-ops/spotify_scraper/.env')
load_dotenv(env_path)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'runner'))
from app.scraper import SpotifyArtistsScraper

async def check_cookies():
    """Check what cookies are saved in the session"""
    
    print("Starting browser...")
    scraper = SpotifyArtistsScraper(headless=False)
    await scraper.start()
    
    try:
        # Verify login
        print("\n[1/4] Verifying login...")
        if not await scraper.verify_login():
            print("❌ Not logged in!")
            return
        print("✅ Logged in to home page")
        
        # Get cookies from home page
        print("\n[2/4] Getting cookies from home page...")
        context = scraper.context
        cookies = await context.cookies()
        
        spotify_cookies = [c for c in cookies if 'spotify.com' in c['domain']]
        print(f"Found {len(spotify_cookies)} Spotify cookies:")
        for cookie in spotify_cookies:
            print(f"  - {cookie['name']}: domain={cookie['domain']}, secure={cookie.get('secure', False)}, httpOnly={cookie.get('httpOnly', False)}")
        
        # Check for critical auth cookies
        critical_cookies = ['sp_dc', 'sp_key', 'sp_t']
        found_critical = [c['name'] for c in spotify_cookies if c['name'] in critical_cookies]
        print(f"\nCritical auth cookies found: {found_critical}")
        if not found_critical:
            print("⚠️  WARNING: No critical auth cookies found!")
        
        # Try to navigate to song page
        print("\n[3/4] Navigating to song page...")
        song_url = "https://artists.spotify.com/c/artist/36Bfcbr8mLMRPteWtBIm6Y/song/2IwIvnhAM0zqBAKR7vnteg/playlists"
        
        await scraper.page.goto(song_url, wait_until='domcontentloaded', timeout=30000)
        await asyncio.sleep(3)
        
        final_url = scraper.page.url
        print(f"Final URL: {final_url}")
        
        if 'login' in final_url.lower():
            print("❌ Redirected to login!")
            
            # Check cookies again after redirect
            print("\n[4/4] Checking cookies after redirect...")
            cookies_after = await context.cookies()
            spotify_cookies_after = [c for c in cookies_after if 'spotify.com' in c['domain']]
            print(f"Cookies after redirect: {len(spotify_cookies_after)}")
            
            # See if any were removed
            before_names = {c['name'] for c in spotify_cookies}
            after_names = {c['name'] for c in spotify_cookies_after}
            removed = before_names - after_names
            added = after_names - before_names
            
            if removed:
                print(f"⚠️  Cookies REMOVED: {removed}")
            if added:
                print(f"➕ Cookies ADDED: {added}")
        else:
            print("✅ Successfully navigated without redirect!")
        
    finally:
        await scraper.stop()

if __name__ == '__main__':
    asyncio.run(check_cookies())
EOF

python3 check_cookies.py

