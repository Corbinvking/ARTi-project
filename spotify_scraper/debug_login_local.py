"""
Debug script to pause after login and inspect the page
Run this locally to see what's actually on the Spotify login page
"""

import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load .env
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

sys.path.insert(0, str(Path(__file__).parent))
from runner.app.scraper import SpotifyArtistsScraper

async def debug_login():
    """Debug login flow with manual inspection"""
    
    print("=" * 60)
    print("  DEBUG MODE - Login Flow")
    print("=" * 60)
    print("\nThis script will:")
    print("  1. Open a visible browser")
    print("  2. Navigate to Spotify login")
    print("  3. Enter email and click Continue")
    print("  4. PAUSE so you can inspect the page")
    print("\nBrowser will stay open for 5 minutes.\n")
    
    email = os.getenv('SPOTIFY_EMAIL')
    password = os.getenv('SPOTIFY_PASSWORD')
    
    if not email or not password:
        print("❌ ERROR: Set SPOTIFY_EMAIL and SPOTIFY_PASSWORD in .env")
        return
    
    print(f"Email: {email}")
    print("Password: ***\n")
    
    # Start browser (headless=False for debugging)
    scraper = SpotifyArtistsScraper(headless=False)
    await scraper.start()
    
    try:
        # Navigate DIRECTLY to Spotify for Artists (not regular login)
        print("[1/4] Navigating to Spotify for Artists...")
        await scraper.page.goto('https://artists.spotify.com', wait_until='domcontentloaded')
        await asyncio.sleep(5)  # Wait for redirect/login
        
        # Check where we ended up
        current_url = scraper.page.url
        print(f"       Current URL: {current_url}")
        
        # If we're on a login page, enter credentials
        if 'login' in current_url.lower() or 'accounts.spotify.com' in current_url:
            print("[2/4] On login page - entering email...")
            
            # Try to fill email
            email_selector = 'input#login-username, input[name="username"], input[type="email"], input[type="text"]'
            try:
                await scraper.page.fill(email_selector, email, timeout=5000)
                print("       Email entered")
            except:
                print("       ⚠️  Could not find email field")
            
            # Click Continue
            print("[3/4] Clicking Continue/Log in...")
            try:
                await scraper.page.click('button:has-text("Continue"), button:has-text("Log in"), button[type="submit"]', timeout=5000)
                print("       Button clicked")
            except:
                print("       ⚠️  Could not find Continue button")
            
            print("       Waiting for page to load...")
            await asyncio.sleep(5)
        else:
            print("[2/4] Already on Spotify for Artists page!")
        
        # Update current URL
        current_url = scraper.page.url
        print(f"\n[4/4] Final URL: {current_url}")
        
        # List all buttons
        print("\n" + "=" * 60)
        print("  BUTTONS ON PAGE:")
        print("=" * 60)
        buttons = await scraper.page.locator('button, a[role="button"]').all()
        print(f"Found {len(buttons)} buttons:\n")
        for i, btn in enumerate(buttons):
            text = await btn.text_content()
            data_testid = await btn.get_attribute('data-testid')
            aria_label = await btn.get_attribute('aria-label')
            print(f"  {i+1}. text='{(text or '').strip()}'")
            print(f"      data-testid='{data_testid}'")
            print(f"      aria-label='{aria_label}'")
            print()
        
        # List all input fields
        print("=" * 60)
        print("  INPUT FIELDS ON PAGE:")
        print("=" * 60)
        inputs = await scraper.page.locator('input').all()
        print(f"Found {len(inputs)} inputs:\n")
        for i, inp in enumerate(inputs):
            inp_type = await inp.get_attribute('type')
            inp_id = await inp.get_attribute('id')
            inp_name = await inp.get_attribute('name')
            placeholder = await inp.get_attribute('placeholder')
            print(f"  {i+1}. type='{inp_type}' id='{inp_id}'")
            print(f"      name='{inp_name}' placeholder='{placeholder}'")
            print()
        
        # Take screenshot
        screenshot_path = './debug_screenshot.png'
        await scraper.page.screenshot(path=screenshot_path)
        print("=" * 60)
        print(f"📸 Screenshot saved: {screenshot_path}")
        print("=" * 60)
        
        # PAUSE - keep browser open
        print("\n🔍 BROWSER PAUSED!")
        print("   - Check the browser window")
        print("   - Look for 'Log in with password' button")
        print("   - See what fields/buttons are available")
        print("   - Browser will close in 5 minutes")
        print("   - Press Ctrl+C to close now")
        print()
        
        try:
            await asyncio.sleep(300)  # Wait 5 minutes
        except KeyboardInterrupt:
            print("\n\nClosing browser...")
    
    finally:
        await scraper.stop()
        print("\n✅ Debug complete!")

if __name__ == '__main__':
    asyncio.run(debug_login())

