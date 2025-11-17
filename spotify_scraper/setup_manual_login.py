#!/usr/bin/env python3
"""
Manual login setup - saves session for automated scraping
Run this ONCE to log in manually, then all future scrapes will use the saved session
"""
import asyncio
from runner.app.scraper import SpotifyArtistsScraper

async def manual_login_setup():
    print("=" * 70)
    print("SPOTIFY FOR ARTISTS - MANUAL LOGIN SETUP")
    print("=" * 70)
    print("\nThis will:")
    print("  1. Open a browser")
    print("  2. Navigate to Spotify for Artists")
    print("  3. Wait for YOU to log in manually")
    print("  4. Save your session for automated future runs")
    print("\nYou'll only need to do this ONCE!")
    print("=" * 70)
    print()
    print("Starting in 3 seconds...")
    await asyncio.sleep(3)
    print()
    
    async with SpotifyArtistsScraper(headless=False) as scraper:
        print("[*] Opening browser and navigating to Spotify for Artists...")
        await scraper.page.goto('https://artists.spotify.com/', wait_until='networkidle')
        print()
        print("=" * 70)
        print("PLEASE LOG IN MANUALLY")
        print("=" * 70)
        print("\nA browser window has opened.")
        print()
        print("Instructions:")
        print("  1. Log in to Spotify for Artists")
        print("  2. Complete any 2FA/verification if prompted")
        print("  3. Wait until you see the dashboard")
        print("  4. Return to this terminal")
        print()
        print("I'll check every 10 seconds if you're logged in...")
        print("=" * 70)
        print()
        
        # Wait for user to complete login
        max_attempts = 60  # 10 minutes total
        for i in range(max_attempts):
            await asyncio.sleep(10)
            
            # Check if logged in
            try:
                current_url = scraper.page.url
                if 'artists.spotify.com' in current_url and 'login' not in current_url.lower():
                    # Check for dashboard indicators
                    if await scraper.page.locator('text="Home"').count() > 0:
                        print()
                        print("=" * 70)
                        print("✅ SUCCESS! You're logged in!")
                        print("=" * 70)
                        print()
                        print("Your session has been saved to: data/browser_data/")
                        print()
                        print("From now on, the scraper will automatically use this session.")
                        print("You won't need to log in again (unless the session expires).")
                        print()
                        print("Next steps:")
                        print("  1. Run: python run_scraper.py")
                        print("  2. Or: python run_s4a_list.py")
                        print()
                        print("The scraper is now ready for automated use!")
                        print("=" * 70)
                        print()
                        print("Browser will close in 5 seconds...")
                        await asyncio.sleep(5)
                        return True
            except:
                pass
            
            # Progress indicator
            elapsed = (i + 1) * 10
            remaining = (max_attempts - i - 1) * 10
            print(f"  [{elapsed}s] Still waiting... ({remaining}s remaining before timeout)")
        
        print()
        print("=" * 70)
        print("⏱️  TIMEOUT")
        print("=" * 70)
        print()
        print("Login not detected after 10 minutes.")
        print("Please try again and complete the login process.")
        print()
        return False

if __name__ == "__main__":
    asyncio.run(manual_login_setup())

