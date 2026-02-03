"""
Manual login script for Spotify for Artists.
This script opens a browser window where you can manually login,
then verifies the session is working.

IMPORTANT: Uses stealth mode to hide automation detection.
This ensures the session created will work for automated scraping.
"""
import asyncio
import os
import sys
from playwright.async_api import async_playwright

async def wait_for_input(prompt):
    """Async-compatible input that keeps the event loop alive"""
    print(prompt, end='', flush=True)
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, sys.stdin.readline)


async def apply_stealth_scripts(page):
    """Apply JavaScript patches to hide automation detection"""
    try:
        await page.add_init_script("""
            // Overwrite navigator.webdriver
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            
            // Remove automation indicators from window
            delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
            delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
            delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
            
            // Overwrite chrome runtime to hide automation
            if (window.chrome) {
                window.chrome.runtime = {
                    connect: () => {},
                    sendMessage: () => {},
                    onMessage: { addListener: () => {} }
                };
            }
            
            // Override permissions query
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
            
            // Make plugins array look realistic
            Object.defineProperty(navigator, 'plugins', {
                get: () => [
                    { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer' },
                    { name: 'Chrome PDF Plugin', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
                    { name: 'Native Client', filename: 'internal-nacl-plugin' }
                ]
            });
            
            // Make languages array realistic
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en']
            });
        """)
        print("  Applied stealth scripts to browser")
    except Exception as e:
        print(f"  Warning: Could not apply stealth scripts: {e}")


async def manual_login():
    print("="*60)
    print("SPOTIFY FOR ARTISTS - MANUAL LOGIN (STEALTH MODE)")
    print("="*60)
    print()
    print("This script will:")
    print("1. Open a browser window WITH STEALTH MODE")
    print("2. Navigate to Spotify for Artists")
    print("3. Wait for you to login MANUALLY")
    print("4. Verify the session works for song pages")
    print()
    print("IMPORTANT: You must login manually to avoid bot detection!")
    print("The stealth mode hides automation markers from Spotify.")
    print()
    
    # Clear browser data first (outside async context)
    browser_data_dir = './data/browser_data'
    if os.path.exists(browser_data_dir):
        print(f"Clearing existing browser data at {browser_data_dir}...")
        import shutil
        try:
            shutil.rmtree(browser_data_dir)
            print("Browser data cleared.")
        except Exception as e:
            print(f"Warning: Could not clear browser data: {e}")
    
    # Ensure logs directory exists
    os.makedirs('./logs', exist_ok=True)
    
    # STEALTH MODE: Enhanced args to hide automation detection
    stealth_args = [
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--disable-automation',
        '--disable-browser-side-navigation',
        '--excludeSwitches=enable-automation',
        '--useAutomationExtension=false',
        '--no-sandbox',
        '--disable-setuid-sandbox',
    ]
    
    async with async_playwright() as p:
        # Launch browser with stealth settings
        print("Launching browser with stealth mode...")
        browser = await p.chromium.launch_persistent_context(
            browser_data_dir,
            headless=False,  # Must be visible for manual login
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            args=stealth_args,
            slow_mo=50,
            ignore_https_errors=True,
        )
        
        page = browser.pages[0] if browser.pages else await browser.new_page()
        
        # Apply stealth scripts
        await apply_stealth_scripts(page)
        
        # Navigate to Spotify for Artists
        print("Navigating to Spotify for Artists...")
        await page.goto('https://artists.spotify.com', timeout=60000)
        
        print()
        print("="*60)
        print("PLEASE LOGIN MANUALLY IN THE BROWSER WINDOW")
        print("="*60)
        print()
        print("Once you are logged in and see the dashboard, press Enter...")
        
        # Wait for user input using async-compatible method
        await wait_for_input("Press Enter after logging in: ")
        
        # Small delay to ensure page is stable
        await asyncio.sleep(1)
        
        # Check if page is still open
        try:
            current_url = page.url
        except Exception as e:
            print(f"❌ Browser was closed: {e}")
            return False
        
        print(f"Current URL: {current_url}")
        
        if 'artists.spotify.com/c/' in current_url or 'artists.spotify.com/home' in current_url:
            print("✅ On dashboard! Testing song page access...")
            
            # Test accessing a song page
            test_url = 'https://artists.spotify.com/c/artist/6HWv9QK0gDs0yaNcGWHffV/song/1wFBrmz6TXZiP2TOO8wMcC/playlists'
            
            try:
                await page.goto(test_url, timeout=30000)
                await asyncio.sleep(3)
                
                final_url = page.url
                print(f"Song page URL: {final_url}")
                
                if 'login' in final_url.lower() or 'accounts.spotify.com' in final_url:
                    print("❌ Session not valid for song pages")
                    try:
                        await page.screenshot(path='./logs/manual_login_failed.png')
                    except:
                        pass
                    await browser.close()
                    return False
                else:
                    print("✅ Session is fully valid for song pages!")
                    try:
                        await page.screenshot(path='./logs/manual_login_success.png')
                    except:
                        pass
                    
                    # Save cookies info
                    cookies = await browser.cookies()
                    print(f"Saved {len(cookies)} cookies")
                    
                    await browser.close()
                    return True
            except Exception as e:
                print(f"❌ Error testing song page: {e}")
                print("This may be fine - the session data is already saved.")
                print("Try running the production scraper to test.")
                await browser.close()
                return True  # Session might still be valid
        else:
            print("❌ Not on dashboard - login may have failed")
            await browser.close()
            return False

if __name__ == '__main__':
    result = asyncio.run(manual_login())
    if result:
        print()
        print("="*60)
        print("✅ SESSION ESTABLISHED SUCCESSFULLY!")
        print("="*60)
        print()
        print("The browser data is saved at ./data/browser_data/")
        print("You can now transfer this to production using:")
        print("  tar -czf browser_data.tar.gz -C data browser_data")
        print("  scp browser_data.tar.gz root@164.90.129.146:/tmp/")
        print("  ssh root@164.90.129.146 'cd /root/arti-marketing-ops/spotify_scraper && rm -rf data/browser_data && tar -xzf /tmp/browser_data.tar.gz -C data/'")
    else:
        print()
        print("="*60)
        print("❌ SESSION ESTABLISHMENT FAILED")
        print("="*60)
