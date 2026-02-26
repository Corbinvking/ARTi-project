#!/usr/bin/env python3
"""
Manual Browser Login for Spotify for Artists
Opens a browser window in VNC for manual login and CAPTCHA solving
"""

import asyncio
import os
import sys
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
    """Open browser for manual login"""
    context = None
    playwright = None
    
    # Ensure DISPLAY is set
    os.environ['DISPLAY'] = ':99'
    
    # Set user data directory
    user_data_dir = '/root/arti-marketing-ops/spotify_scraper/data/browser_data'
    os.makedirs(user_data_dir, exist_ok=True)
    
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("🔐 MANUAL BROWSER LOGIN")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print()
    print("Starting browser in VNC window...")
    print(f"Session will be saved to: {user_data_dir}")
    print()
    
    try:
        playwright = await async_playwright().start()
        
        # Launch persistent context (saves session)
        context = await playwright.chromium.launch_persistent_context(
            user_data_dir=user_data_dir,
            headless=False,
            slow_mo=1000,  # Slow down actions
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',
            ]
        )
        
        # Get or create page
        if context.pages:
            page = context.pages[0]
        else:
            page = await context.new_page()
        
        # Navigate to Spotify for Artists
        print("🌐 Navigating to Spotify for Artists...")
        await page.goto('https://artists.spotify.com', timeout=60000)
        
        print()
        print("✅ Browser opened in VNC viewer!")
        print()
        print("📋 Instructions:")
        print("  1. Look at your VNC viewer window")
        print("  2. Login to Spotify for Artists manually")
        print("  3. Solve any CAPTCHA if it appears")
        print("  4. Verify you reach the dashboard")
        print("  5. Press Ctrl+C in this terminal when done")
        print()
        print("⏳ Browser will stay open for 15 minutes...")
        print("   (or until you press Ctrl+C)")
        print()
        
        # Keep browser open; Ctrl+C sends CancelledError to the sleep
        try:
            await asyncio.sleep(900)  # 15 minutes
        except asyncio.CancelledError:
            print()
            print("Ctrl+C detected - verifying session and saving...")
        
        # Verify session before closing by hitting an authenticated route
        session_valid = False
        try:
            page = context.pages[0] if context.pages else None
            if page and not page.is_closed():
                print()
                print("Verifying session with /c/roster ...")
                await page.goto('https://artists.spotify.com/c/roster', timeout=15000, wait_until='domcontentloaded')
                await asyncio.sleep(3)
                verify_url = page.url
                if 'accounts.spotify.com' in verify_url or 'login' in verify_url.lower():
                    print("❌ Session is NOT valid - you were redirected to login.")
                    print("   Make sure you complete the full login before pressing Ctrl+C.")
                else:
                    session_valid = True
                    print(f"✓ Session verified (landed on {verify_url})")
        except Exception as e:
            print(f"⚠️  Could not verify session: {e}")
        
        # Clear session_expired.flag if session is valid
        flag_path = Path(__file__).parent / 'logs' / 'session_expired.flag'
        if session_valid and flag_path.exists():
            try:
                flag_path.unlink()
                print("✓ Cleared session_expired.flag")
            except Exception:
                pass
        
        # Always close browser so cookies/session are persisted (critical after Ctrl+C)
        try:
            await context.close()
        except Exception:
            pass
        try:
            await playwright.stop()
        except Exception:
            pass
        
        print()
        if session_valid:
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("✅ SESSION SAVED AND VERIFIED!")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print()
            print("🧪 Run the scraper:")
            print("   cd /root/arti-marketing-ops/spotify_scraper")
            print("   bash run_production_scraper.sh")
            print()
            print("Expected output:")
            print('   ✓ Existing session found! Already logged in.')
        else:
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("⚠️  SESSION SAVED BUT NOT VERIFIED")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print()
            print("The browser session was saved, but login could not be confirmed.")
            print("Please re-run this script and complete the Spotify login before pressing Ctrl+C.")
        print()
        
    except Exception as e:
        print()
        print(f"❌ Error: {e}")
        print()
        print("Troubleshooting:")
        print("  1. Check VNC is running: pgrep x11vnc")
        print("  2. Check Xvfb is running: pgrep Xvfb")
        print("  3. Check DISPLAY is set: echo $DISPLAY")
        print()
        sys.exit(1)
    finally:
        # Always close so session is saved (especially on Ctrl+C)
        if context is not None:
            try:
                await context.close()
            except Exception:
                pass
        if playwright is not None:
            try:
                await playwright.stop()
            except Exception:
                pass

if __name__ == '__main__':
    asyncio.run(main())

