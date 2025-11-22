"""
TRULY FRESH LOGIN - Uses incognito mode (no persistent session at all)
This tests the actual login flow that production will use
"""

import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from playwright.async_api import async_playwright

# Load .env
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

async def test_truly_fresh_login():
    """Test login with TRULY FRESH browser (incognito mode)"""
    
    print("=" * 60)
    print("  TRULY FRESH LOGIN - Incognito Mode")
    print("=" * 60)
    print("\nNo cookies, no session, completely fresh start!")
    print("This is exactly what production sees.\n")
    
    email = os.getenv('SPOTIFY_EMAIL')
    password = os.getenv('SPOTIFY_PASSWORD')
    
    if not email or not password:
        print("❌ ERROR: Set SPOTIFY_EMAIL and SPOTIFY_PASSWORD in .env")
        return
    
    print(f"Email: {email}")
    print("Password: ***\n")
    
    playwright = await async_playwright().start()
    
    try:
        # Launch browser in NON-incognito mode but NO persistent context
        print("[1/6] Launching fresh browser...")
        browser = await playwright.chromium.launch(headless=False)
        
        # Create new context (like incognito - no stored data)
        context = await browser.new_context()
        page = await context.new_page()
        
        print("[2/6] Navigating to Spotify for Artists...")
        await page.goto('https://artists.spotify.com', wait_until='domcontentloaded')
        await asyncio.sleep(3)
        
        current_url = page.url
        print(f"       Landed on: {current_url}")
        
        if 'login' not in current_url.lower() and 'artists.spotify.com' in current_url and 'home' not in current_url:
            print("       ⚠️  Already logged in somehow!")
        
        print("\n[3/6] Looking for login form...")
        
        # Take screenshot of what we see
        await page.screenshot(path='./step1_initial_page.png')
        print("       📸 Screenshot: step1_initial_page.png")
        
        # Try to find email input
        email_selectors = [
            'input#login-username',
            'input[name="username"]',
            'input[type="email"]',
            'input[type="text"]'
        ]
        
        email_found = False
        for selector in email_selectors:
            if await page.locator(selector).count() > 0:
                print(f"\n[4/6] Found email field: {selector}")
                await page.fill(selector, email)
                print("       ✅ Email entered")
                email_found = True
                break
        
        if not email_found:
            print("\n       ❌ No email field found!")
            print("       Check step1_initial_page.png to see what's on the page")
            print("\n🔍 BROWSER PAUSED - Inspect the page!")
            print("   Press Ctrl+C when done\n")
            try:
                await asyncio.sleep(300)
            except KeyboardInterrupt:
                pass
            await browser.close()
            await playwright.stop()
            return
        
        # Click Continue
        print("\n[5/6] Clicking Continue...")
        await page.screenshot(path='./step2_after_email.png')
        
        continue_selectors = [
            'button:has-text("Continue")',
            'button[id="login-button"]',
            'button[data-testid="login-button"]'
        ]
        
        for selector in continue_selectors:
            if await page.locator(selector).count() > 0:
                await page.click(selector)
                print(f"       ✅ Clicked: {selector}")
                break
        
        await asyncio.sleep(5)
        await page.screenshot(path='./step3_after_continue.png')
        print("       📸 Screenshot: step3_after_continue.png")
        
        # Look for password field
        print("\n[6/6] Looking for password field...")
        password_field = await page.locator('input[type="password"]').count()
        
        if password_field > 0:
            print("       ✅ Found password field!")
            await page.fill('input[type="password"]', password)
            print("       ✅ Password entered")
            
            # Look for login button
            await asyncio.sleep(1)
            await page.screenshot(path='./step4_password_entered.png')
            
            login_button_selectors = [
                'button:has-text("Log in")',
                'button:has-text("Sign in")',
                'button[id="login-button"]',
                'button[type="submit"]'
            ]
            
            for selector in login_button_selectors:
                if await page.locator(selector).count() > 0:
                    print(f"       Clicking login button: {selector}")
                    await page.click(selector)
                    break
            
            print("\n       Waiting for login to complete...")
            await asyncio.sleep(10)
            
            final_url = page.url
            print(f"       Final URL: {final_url}")
            
            if 'artists.spotify.com' in final_url and 'login' not in final_url:
                print("       ✅ Login successful!")
                
                # Check cookies
                cookies = await context.cookies()
                has_sp_dc = any(c['name'] == 'sp_dc' for c in cookies)
                print(f"       sp_dc cookie: {'✅ Found' if has_sp_dc else '❌ Missing'}")
                
                await page.screenshot(path='./step5_logged_in.png')
            else:
                print("       ❌ Login may have failed")
                await page.screenshot(path='./step5_login_failed.png')
        else:
            print("       ❌ No password field found!")
            print("       What buttons are available?")
            
            buttons = await page.locator('button, a[role="button"]').all()
            print(f"\n       Found {len(buttons)} buttons:")
            for i, btn in enumerate(buttons[:10]):
                text = await btn.text_content()
                print(f"         {i+1}. '{(text or '').strip()}'")
        
        print("\n🔍 BROWSER PAUSED - Inspect what happened!")
        print("   Screenshots saved to see each step")
        print("   Press Ctrl+C when done\n")
        
        try:
            await asyncio.sleep(300)
        except KeyboardInterrupt:
            pass
    
    finally:
        await browser.close()
        await playwright.stop()
        print("\n✅ Test complete!")
        print("\nCheck these screenshots:")
        print("  - step1_initial_page.png (what page loaded)")
        print("  - step2_after_email.png (after entering email)")
        print("  - step3_after_continue.png (after clicking continue)")
        print("  - step4_password_entered.png (if password field found)")
        print("  - step5_logged_in.png or step5_login_failed.png")

if __name__ == '__main__':
    asyncio.run(test_truly_fresh_login())

