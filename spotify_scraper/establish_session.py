"""
Script to establish a fresh Spotify for Artists session.
This uses more human-like interaction patterns to avoid bot detection.
"""
import asyncio
import os
import random
from playwright.async_api import async_playwright

# Get credentials from environment
EMAIL = os.environ.get('SPOTIFY_EMAIL', 'tribe@artistinfluence.com')
PASSWORD = os.environ.get('SPOTIFY_PASSWORD', '')

async def human_type(page, selector, text, min_delay=50, max_delay=150):
    """Type text with human-like delays"""
    element = page.locator(selector)
    await element.click()
    await asyncio.sleep(random.uniform(0.3, 0.7))
    
    for char in text:
        await element.type(char, delay=random.randint(min_delay, max_delay))
        # Occasional longer pause
        if random.random() < 0.1:
            await asyncio.sleep(random.uniform(0.1, 0.3))
    
    await asyncio.sleep(random.uniform(0.3, 0.8))

async def human_click(page, selector):
    """Click with human-like movement"""
    element = page.locator(selector).first
    await asyncio.sleep(random.uniform(0.2, 0.5))
    
    # Try to get bounding box for mouse movement
    try:
        box = await element.bounding_box()
        if box:
            # Move mouse to element with some offset
            x = box['x'] + box['width'] / 2 + random.randint(-5, 5)
            y = box['y'] + box['height'] / 2 + random.randint(-3, 3)
            await page.mouse.move(x, y, steps=random.randint(5, 15))
            await asyncio.sleep(random.uniform(0.1, 0.3))
    except:
        pass
    
    await element.click()
    await asyncio.sleep(random.uniform(0.5, 1.0))

async def establish_session():
    print(f"Email: {EMAIL}")
    if not PASSWORD:
        print("ERROR: SPOTIFY_PASSWORD environment variable not set")
        return False
    
    print("Starting browser...")
    
    async with async_playwright() as p:
        # Launch persistent browser context
        browser = await p.chromium.launch_persistent_context(
            './data/browser_data',
            headless=False,  # Must be visible to avoid bot detection
            viewport={'width': 1280, 'height': 800},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        
        page = browser.pages[0] if browser.pages else await browser.new_page()
        
        # Navigate to Spotify for Artists
        print("Navigating to Spotify for Artists...")
        await page.goto('https://artists.spotify.com')
        await asyncio.sleep(random.uniform(2, 4))
        
        # Check if already logged in
        current_url = page.url
        print(f"Current URL: {current_url}")
        
        if 'artists.spotify.com/c/' in current_url or 'artists.spotify.com/home' in current_url:
            print("Already logged in! Testing song access...")
            
            # Test accessing a song page
            test_url = 'https://artists.spotify.com/c/artist/6HWv9QK0gDs0yaNcGWHffV/song/1wFBrmz6TXZiP2TOO8wMcC/playlists'
            await page.goto(test_url)
            await asyncio.sleep(3)
            
            if 'login' in page.url.lower():
                print("Session not valid for song pages - need to re-login")
            else:
                print("Session is fully valid!")
                await page.screenshot(path='./logs/session_test.png')
                await browser.close()
                return True
        
        # Need to login
        print("Performing login...")
        
        # Click Login button if present
        try:
            login_btn = page.locator('button:has-text("Log in")')
            if await login_btn.count() > 0:
                await human_click(page, 'button:has-text("Log in")')
                await asyncio.sleep(random.uniform(2, 3))
        except:
            pass
        
        # Wait for and fill email
        print("Entering email...")
        await page.wait_for_selector('input[type="text"], input[type="email"], input[name="username"]', timeout=10000)
        await asyncio.sleep(random.uniform(0.5, 1.5))
        await human_type(page, 'input[type="text"], input[type="email"], input[name="username"]', EMAIL)
        
        # Click Continue
        print("Clicking Continue...")
        await human_click(page, 'button:has-text("Continue")')
        await asyncio.sleep(random.uniform(2, 4))
        
        # Take screenshot to see state
        await page.screenshot(path='./logs/establish_after_continue.png')
        print("Screenshot saved: establish_after_continue.png")
        
        # Look for "Log in with password" link
        print("Looking for password option...")
        password_option = page.locator('a:has-text("Log in with password"), button:has-text("Log in with password"), a:has-text("Log in with a password")')
        
        if await password_option.count() > 0:
            await human_click(page, 'a:has-text("Log in with password"), a:has-text("Log in with a password")')
            await asyncio.sleep(random.uniform(1, 2))
        else:
            # Maybe password input is already visible?
            pass
        
        # Wait for password input
        print("Waiting for password input...")
        try:
            await page.wait_for_selector('input[type="password"]', timeout=10000)
        except:
            print("Password input not found")
            await page.screenshot(path='./logs/establish_no_password.png')
            print("Screenshot saved: establish_no_password.png")
            await browser.close()
            return False
        
        # Enter password
        print("Entering password...")
        await human_type(page, 'input[type="password"]', PASSWORD, min_delay=80, max_delay=200)
        
        # Click Log In
        print("Clicking Log In...")
        await human_click(page, 'button:has-text("Log in")')
        
        # Wait for redirect to dashboard
        print("Waiting for dashboard...")
        try:
            await page.wait_for_url('**/artists.spotify.com/**', timeout=30000)
            print("Login successful!")
            await asyncio.sleep(2)
            
            # Test song access
            print("Testing song page access...")
            test_url = 'https://artists.spotify.com/c/artist/6HWv9QK0gDs0yaNcGWHffV/song/1wFBrmz6TXZiP2TOO8wMcC/playlists'
            await page.goto(test_url)
            await asyncio.sleep(3)
            
            if 'login' in page.url.lower():
                print("Login worked but song access still redirects to login :(")
                await browser.close()
                return False
            else:
                print("Full session established successfully!")
                await page.screenshot(path='./logs/establish_success.png')
                await browser.close()
                return True
                
        except Exception as e:
            print(f"Login failed: {e}")
            await page.screenshot(path='./logs/establish_failed.png')
            await browser.close()
            return False

if __name__ == '__main__':
    result = asyncio.run(establish_session())
    if result:
        print("\n✅ Session established successfully!")
    else:
        print("\n❌ Failed to establish session")
