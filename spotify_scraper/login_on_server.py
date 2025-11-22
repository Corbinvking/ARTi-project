#!/usr/bin/env python3
"""
Login to Spotify for Artists on Production Server
This creates a fresh browser session for the scraper to use
"""

import asyncio
import os
import sys
from pathlib import Path

# Add runner to path
sys.path.insert(0, str(Path(__file__).parent))

from runner.app.scraper import SpotifyArtistsScraper

async def do_login():
    """Perform login on production server"""
    
    # Get credentials from environment
    email = os.getenv('SPOTIFY_EMAIL')
    password = os.getenv('SPOTIFY_PASSWORD')
    
    if not email or not password:
        print("❌ ERROR: SPOTIFY_EMAIL and SPOTIFY_PASSWORD must be set in .env")
        print("\nPlease add to spotify_scraper/.env:")
        print("  SPOTIFY_EMAIL=your-email@example.com")
        print("  SPOTIFY_PASSWORD=your-password")
        sys.exit(1)
    
    print("==========================================")
    print("  Logging in to Spotify for Artists")
    print("==========================================")
    print(f"Email: {email}")
    print(f"Mode: {'Headless' if os.getenv('HEADLESS', 'true').lower() == 'true' else 'GUI'}")
    print("")
    
    # Use GUI mode for login (more reliable)
    os.environ['HEADLESS'] = 'false'
    
    print("[1/4] Starting browser...")
    scraper = SpotifyArtistsScraper()
    await scraper.start()
    
    print("\n[2/4] Attempting auto-login...")
    success = await scraper.auto_login(email, password)
    
    if not success:
        print("\n❌ Auto-login failed!")
        print("\nPlease check:")
        print("  1. Email and password are correct")
        print("  2. No 2FA is enabled on the account")
        print("  3. Account has Spotify for Artists access")
        await scraper.stop()
        sys.exit(1)
    
    print("\n[3/4] Verifying login...")
    # Navigate to a song page to verify
    test_url = "https://artists.spotify.com/home"
    await scraper.page.goto(test_url, wait_until='domcontentloaded')
    await asyncio.sleep(2)
    
    # Take a screenshot
    screenshot_path = '/var/log/spotify-scraper/login_verified.png'
    await scraper.page.screenshot(path=screenshot_path)
    print(f"Screenshot saved: {screenshot_path}")
    
    # Check if we're logged in
    if await scraper.page.locator('text=Home').count() > 0:
        print("\n✅ Login verified successfully!")
    else:
        print("\n⚠️  Login verification inconclusive")
        print(f"   Current URL: {scraper.page.url}")
    
    print("\n[4/4] Saving session...")
    await scraper.stop()
    
    print("\n==========================================")
    print("  ✅ Login Complete!")
    print("==========================================")
    print(f"\nSession saved to:")
    print(f"  {scraper.user_data_dir}")
    print("\nThe scraper can now use this session.")
    print("\nTo verify, run:")
    print("  bash test_real_campaign.sh")

if __name__ == '__main__':
    asyncio.run(do_login())

