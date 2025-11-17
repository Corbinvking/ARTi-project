#!/usr/bin/env python3
"""
Debug script to identify current Spotify for Artists selectors
Run this to see what elements are actually on the page
"""
import asyncio
import os
from dotenv import load_dotenv
from runner.app.scraper import SpotifyArtistsScraper

load_dotenv()

async def debug_page():
    """Debug page structure and find selectors"""
    # Use the real URL provided by user
    test_url = os.getenv('TEST_SONG_URL', 'https://artists.spotify.com/c/artist/4F8JGeO6bJO7Z309mxHlP0/song/1n2dTO7KKWztAQyCDaGmAm/stats')
    
    print("=" * 70)
    print("SPOTIFY FOR ARTISTS SELECTOR DEBUGGER")
    print("=" * 70)
    print(f"\nTest URL: {test_url}\n")
    
    async with SpotifyArtistsScraper(headless=False) as scraper:
        # Navigate to song
        if '/stats' in test_url:
            test_url = test_url.replace('/stats', '/playlists')
        
        print("[*] Navigating to song...")
        await scraper.page.goto(test_url, wait_until='networkidle')
        await asyncio.sleep(5)  # Give page time to load
        
        print("\n[OK] Page loaded! Browser is open for inspection.")
        print("[*] Analyzing page structure...\n")
        
        # 1. Check for tabs
        print("="  * 70)
        print("1. CHECKING FOR TABS")
        print("=" * 70)
        
        tab_selectors = [
            'text="Playlists"',
            'text="Playlist"',
            '[role="tab"]',
            'button:has-text("Playlist")',
            'a:has-text("Playlist")'
        ]
        
        for selector in tab_selectors:
            try:
                count = await scraper.page.locator(selector).count()
                if count > 0:
                    print(f"[OK] Found {count} element(s) with: {selector}")
                    element = scraper.page.locator(selector).first
                    text = await element.text_content()
                    print(f"     Text: '{text}'")
            except Exception as e:
                print(f"[X] Selector failed: {selector} - {e}")
        
        # 2. Check for dropdown/time range selector
        print("\n" + "=" * 70)
        print("2. CHECKING FOR TIME RANGE DROPDOWN")
        print("=" * 70)
        
        dropdown_selectors = [
            'button:has-text("days")',
            'button:has-text("Last")',
            'button:has-text("hours")',
            '[role="button"]:has-text("days")',
            '[aria-haspopup="listbox"]',
            'select',
            '.dropdown',
            'button[aria-expanded]'
        ]
        
        for selector in dropdown_selectors:
            try:
                count = await scraper.page.locator(selector).count()
                if count > 0:
                    print(f"[OK] Found {count} element(s) with: {selector}")
                    element = scraper.page.locator(selector).first
                    text = await element.text_content()
                    print(f"     Text: '{text[:50]}'")
            except Exception as e:
                print(f"[X] Selector failed: {selector}")
        
        # 3. Check for table/list structure
        print("\n" + "=" * 70)
        print("3. CHECKING FOR TABLE/LIST STRUCTURE")
        print("=" * 70)
        
        table_selectors = [
            'table',
            'tbody tr',
            '[role="table"]',
            '[role="row"]',
            '.playlist-row',
            'ul li',
            '[data-testid*="playlist"]',
            '[data-testid*="table"]'
        ]
        
        for selector in table_selectors:
            try:
                count = await scraper.page.locator(selector).count()
                if count > 0:
                    print(f"[OK] Found {count} element(s) with: {selector}")
                    if count <= 5:
                        # Show content of first few elements
                        for i in range(min(count, 3)):
                            element = scraper.page.locator(selector).nth(i)
                            text = await element.text_content()
                            print(f"     [{i+1}] {text[:80] if text else 'N/A'}...")
            except Exception as e:
                print(f"[X] Selector failed: {selector}")
        
        # 4. Check for stream/listener counts
        print("\n" + "=" * 70)
        print("4. CHECKING FOR STREAM/LISTENER COUNTS")
        print("=" * 70)
        
        count_selectors = [
            '[data-testid*="streams"]',
            '[data-testid*="listeners"]',
            'text=/\\d+,\\d+/',  # Pattern for comma-separated numbers
            '.stat',
            '.metric',
            'h2:has-text(/\\d+/)',
            'span:has-text(/\\d+,\\d+/)'
        ]
        
        for selector in count_selectors:
            try:
                count = await scraper.page.locator(selector).count()
                if count > 0:
                    print(f"[OK] Found {count} element(s) with: {selector}")
                    for i in range(min(count, 3)):
                        element = scraper.page.locator(selector).nth(i)
                        text = await element.text_content()
                        print(f"     [{i+1}] {text}")
            except Exception as e:
                print(f"[X] Selector failed: {selector}")
        
        # 5. Get page structure
        print("\n" + "=" * 70)
        print("5. PAGE STRUCTURE (data-testid attributes)")
        print("=" * 70)
        
        try:
            # Get all elements with data-testid
            elements = await scraper.page.locator('[data-testid]').all()
            testids = []
            for elem in elements[:20]:  # First 20
                testid = await elem.get_attribute('data-testid')
                if testid:
                    testids.append(testid)
            
            if testids:
                print("\nFound data-testid attributes:")
                for testid in set(testids):
                    print(f"  - {testid}")
            else:
                print("[!] No data-testid attributes found")
        except Exception as e:
            print(f"[X] Error getting test IDs: {e}")
        
        # 6. Take a screenshot
        print("\n" + "=" * 70)
        print("6. SAVING DEBUG SCREENSHOT")
        print("=" * 70)
        
        try:
            screenshot_path = "data/artifacts/debug_page.png"
            os.makedirs("data/artifacts", exist_ok=True)
            await scraper.page.screenshot(path=screenshot_path)
            print(f"[OK] Screenshot saved to: {screenshot_path}")
        except Exception as e:
            print(f"[X] Screenshot failed: {e}")
        
        # 7. Save page HTML
        print("\n" + "=" * 70)
        print("7. SAVING PAGE HTML")
        print("=" * 70)
        
        try:
            html_path = "data/artifacts/debug_page.html"
            html = await scraper.page.content()
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(html)
            print(f"[OK] HTML saved to: {html_path}")
        except Exception as e:
            print(f"[X] HTML save failed: {e}")
        
        print("\n" + "=" * 70)
        print("DEBUG COMPLETE")
        print("=" * 70)
        print("\nNext steps:")
        print("1. Check the screenshot: data/artifacts/debug_page.png")
        print("2. Review the HTML: data/artifacts/debug_page.html")
        print("3. Use Chrome DevTools (F12) on the open browser to inspect elements")
        print("4. Update selectors in spotify_artists.py based on findings")
        print("\n[*] Browser will stay open for 60 seconds for manual inspection...")
        print("    (Press Ctrl+C to close immediately)")
        
        try:
            await asyncio.sleep(60)
        except KeyboardInterrupt:
            print("\n[OK] Closing browser...")

if __name__ == "__main__":
    asyncio.run(debug_page())

