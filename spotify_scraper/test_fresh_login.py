"""
Test FRESH login to Spotify for Artists (no existing session)
This deletes browser data first to simulate production environment
"""

import asyncio
import os
import sys
import shutil
from pathlib import Path
from dotenv import load_dotenv

# Load .env
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

sys.path.insert(0, str(Path(__file__).parent))
from runner.app.scraper import SpotifyArtistsScraper

async def test_fresh_login():
    """Test login with NO existing session"""
    
    print("=" * 60)
    print("  FRESH LOGIN TEST - No Existing Session")
    print("=" * 60)
    print()
    
    email = os.getenv('SPOTIFY_EMAIL')
    password = os.getenv('SPOTIFY_PASSWORD')
    
    if not email or not password:
        print("❌ ERROR: Set SPOTIFY_EMAIL and SPOTIFY_PASSWORD in .env")
        return
    
    # DELETE existing browser data to force fresh login
    browser_data = Path('./browser_data')
    if browser_data.exists():
        print("🗑️  Deleting existing browser session...")
        shutil.rmtree(browser_data)
        print("   ✅ Browser data cleared\n")
    
    print(f"Email: {email}")
    print("Password: ***\n")
    print("This will test the FULL login flow from scratch.\n")
    
    # Start fresh browser
    scraper = SpotifyArtistsScraper(headless=False)
    await scraper.start()
    
    try:
        print("[1/3] Attempting auto-login with scraper.auto_login()...")
        print("       (This uses the actual production login flow)\n")
        
        success = await scraper.auto_login(email, password)
        
        if success:
            print("\n✅ Login successful!")
            print(f"   Current URL: {scraper.page.url}")
            
            # Check for sp_dc cookie
            cookies = await scraper.context.cookies()
            has_sp_dc = any(c['name'] == 'sp_dc' for c in cookies)
            
            if has_sp_dc:
                print("   ✅ sp_dc cookie found - full auth complete!")
            else:
                print("   ⚠️  sp_dc cookie missing - auth incomplete!")
            
            # Take screenshot
            screenshot_path = './login_success.png'
            await scraper.page.screenshot(path=screenshot_path)
            print(f"\n📸 Screenshot saved: {screenshot_path}")
            
            # Test navigation to a song page
            print("\n[2/3] Testing navigation to song page...")
            test_url = "https://artists.spotify.com/c/artist/36Bfcbr8mLMRPteWtBIm6Y/song/2IwIvnhAM0zqBAKR7vnteg/playlists"
            await scraper.page.goto(test_url, wait_until='domcontentloaded', timeout=30000)
            await asyncio.sleep(3)
            
            final_url = scraper.page.url
            if 'login' in final_url.lower():
                print(f"   ❌ Redirected to login: {final_url}")
            else:
                print(f"   ✅ Successfully navigated: {final_url}")
                await scraper.page.screenshot(path='./song_page.png')
                print("   📸 Screenshot saved: ./song_page.png")
            
        else:
            print("\n❌ Login failed!")
            print("   Check the browser window to see what went wrong")
            await scraper.page.screenshot(path='./login_failed.png')
            print("   📸 Screenshot saved: ./login_failed.png")
        
        print("\n[3/3] Keeping browser open for 30 seconds for inspection...")
        print("       Press Ctrl+C to close early\n")
        
        try:
            await asyncio.sleep(30)
        except KeyboardInterrupt:
            pass
    
    finally:
        await scraper.stop()
        print("\n✅ Test complete!")

if __name__ == '__main__':
    asyncio.run(test_fresh_login())

