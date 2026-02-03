#!/usr/bin/env python3
"""Debug script to capture what the song page looks like"""
import asyncio
import os
from playwright.async_api import async_playwright

async def capture():
    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            './data/browser_data', 
            headless=os.environ.get('DISPLAY') is None
        )
        page = browser.pages[0] if browser.pages else await browser.new_page()
        
        # Go to a song page
        url = 'https://artists.spotify.com/c/artist/6HWv9QK0gDs0yaNcGWHffV/song/1wFBrmz6TXZiP2TOO8wMcC/playlists'
        print(f"Navigating to: {url}")
        await page.goto(url, wait_until='networkidle', timeout=30000)
        await asyncio.sleep(3)
        
        # Save screenshot
        await page.screenshot(path='./logs/song_page_debug.png', full_page=True)
        print(f'Screenshot saved to ./logs/song_page_debug.png')
        print(f'Current URL: {page.url}')
        print(f'Title: {await page.title()}')
        
        # Get page content for analysis
        content = await page.content()
        
        # Check for various error indicators
        error_selectors = [
            'text=/error/i',
            'text=/cannot/i', 
            'text=/not part of your catalog/i',
            'text=/access denied/i',
            'text=/something went wrong/i'
        ]
        
        for selector in error_selectors:
            try:
                elements = page.locator(selector)
                count = await elements.count()
                if count > 0:
                    texts = await elements.all_text_contents()
                    print(f"Found '{selector}': {texts[:3]}")
            except:
                pass
        
        # Check for playlist elements
        playlist_selectors = [
            '[data-testid="playlists-table"]',
            'table',
            '[role="table"]',
            'text=/playlist/i'
        ]
        
        print("\nChecking for playlist elements:")
        for selector in playlist_selectors:
            try:
                count = await page.locator(selector).count()
                print(f"  {selector}: {count} found")
            except Exception as e:
                print(f"  {selector}: error - {e}")
        
        # Check for time range dropdown
        print("\nChecking for time range dropdown:")
        dropdown_selectors = [
            'button:has-text("24 hours")',
            'button:has-text("7 days")',
            'button:has-text("28 days")',
            '[data-testid*="dropdown"]',
            '[role="combobox"]',
            'select'
        ]
        
        for selector in dropdown_selectors:
            try:
                count = await page.locator(selector).count()
                if count > 0:
                    print(f"  {selector}: {count} found")
            except:
                pass
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(capture())
