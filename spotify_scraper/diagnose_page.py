#!/usr/bin/env python3
"""
Diagnose what's actually on the Spotify for Artists page
to understand why selectors are failing
"""

import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
from playwright.async_api import async_playwright

# Load environment
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

async def diagnose():
    """Open a page and show what's actually there"""
    
    # Test URL from the logs
    test_url = "https://artists.spotify.com/c/artist/36Bfcbr8mLMRPteWtBIm6Y/song/2IwIvnhAM0zqBAKR7vnteg/playlists"
    
    playwright = await async_playwright().start()
    
    # Use headless mode
    user_data_dir = os.getenv('USER_DATA_DIR', '/root/arti-marketing-ops/spotify_scraper/data/browser_data')
    
    context = await playwright.chromium.launch_persistent_context(
        user_data_dir=user_data_dir,
        headless=True,
        args=['--disable-blink-features=AutomationControlled']
    )
    
    page = context.pages[0] if context.pages else await context.new_page()
    
    print(f"Navigating to: {test_url}")
    await page.goto(test_url, wait_until='networkidle', timeout=30000)
    await asyncio.sleep(5)
    
    # Check current URL
    current_url = page.url
    print(f"\nCurrent URL: {current_url}")
    
    # Get page title
    title = await page.title()
    print(f"Page title: {title}")
    
    # Try to find various elements
    print("\n=== Looking for elements ===")
    
    selectors_to_try = [
        '.song-title',
        '[class*="title"]',
        'h1',
        'h2',
        '[data-testid*="title"]',
        '[data-testid*="song"]',
        'main',
        'body'
    ]
    
    for selector in selectors_to_try:
        count = await page.locator(selector).count()
        print(f"{selector}: {count} found")
        
        if count > 0:
            # Try to get text content
            try:
                text = await page.locator(selector).first.text_content(timeout=1000)
                print(f"  → Text: {text[:100]}")
            except:
                pass
    
    # Get page HTML (first 2000 chars)
    print("\n=== Page HTML (first 2000 chars) ===")
    html = await page.content()
    print(html[:2000])
    
    # Take screenshot
    screenshot_path = "/root/arti-marketing-ops/spotify_scraper/logs/diagnostic_screenshot.png"
    await page.screenshot(path=screenshot_path)
    print(f"\n✓ Screenshot saved to: {screenshot_path}")
    
    await context.close()
    await playwright.stop()
    
    print("\n=== Diagnosis Complete ===")

if __name__ == "__main__":
    asyncio.run(diagnose())

