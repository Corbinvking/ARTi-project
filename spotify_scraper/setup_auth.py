#!/usr/bin/env python3
"""
One-time authentication setup for headless scraper
Run this with a display (locally or via X11 forwarding) to establish session
"""
import asyncio
import os
from dotenv import load_dotenv
from runner.app.scraper import SpotifyArtistsScraper

load_dotenv()

async def setup_auth():
    """
    Interactive login setup
    Creates persistent browser session that can be used in headless mode
    """
    print("=" * 60)
    print("🔐 Spotify for Artists - Authentication Setup")
    print("=" * 60)
    print()
    print("This script will:")
    print("  1. Open a browser window")
    print("  2. Navigate to Spotify for Artists")
    print("  3. Wait for you to log in (including 2FA)")
    print("  4. Save your session for future headless runs")
    print()
    print("⚠️  Make sure you have:")
    print("   - X11 forwarding enabled (if on remote server)")
    print("   - Your Spotify credentials ready")
    print("   - Access to 2FA device if required")
    print()
    input("Press Enter to begin...")
    print()
    
    try:
        # Start browser in headed mode
        async with SpotifyArtistsScraper(headless=False) as scraper:
            print("🌐 Opening browser...")
            print()
            
            # Navigate to S4A
            await scraper.page.goto('https://artists.spotify.com', wait_until='networkidle')
            
            print("📝 INSTRUCTIONS:")
            print("   1. A browser window should now be open")
            print("   2. Log in to Spotify for Artists")
            print("   3. Complete any 2FA/verification steps")
            print("   4. Wait for the dashboard to fully load")
            print("   5. Return to this terminal")
            print()
            
            # Wait for user to complete login
            print("⏳ Waiting for you to complete login...")
            print("   (You have 5 minutes)")
            print()
            
            # Check login status every 10 seconds
            for i in range(30):  # 30 * 10s = 5 minutes
                await asyncio.sleep(10)
                
                if await scraper.verify_login():
                    print()
                    print("=" * 60)
                    print("✅ SUCCESS! Login verified!")
                    print("=" * 60)
                    print()
                    print("Your session has been saved to:")
                    print(f"   {scraper.user_data_dir}")
                    print()
                    print("🎉 You can now run the scraper in headless mode!")
                    print()
                    print("Test it with:")
                    print("   python run_scraper.py")
                    print()
                    return
                
                remaining = (30 - i - 1) * 10
                print(f"   Still waiting... ({remaining}s remaining)")
            
            # Timeout
            print()
            print("❌ Timeout - Could not verify login")
            print("   Please try again and ensure you complete the login process")
            
    except Exception as e:
        print()
        print(f"❌ Error during setup: {e}")
        print()
        print("Troubleshooting:")
        print("  - If on remote server: Did you use 'ssh -X' for X11 forwarding?")
        print("  - If 'Display not found': Install X11 or use Xvfb")
        print("  - If browser didn't open: Check Playwright installation")

if __name__ == "__main__":
    asyncio.run(setup_auth())

