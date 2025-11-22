"""
Debug script to inspect the current Spotify for Artists page and help identify selectors
"""

import asyncio
import os
import sys
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'runner'))

from app.scraper import SpotifyArtistsScraper

load_dotenv()

SPOTIFY_EMAIL = os.getenv('SPOTIFY_EMAIL')
SPOTIFY_PASSWORD = os.getenv('SPOTIFY_PASSWORD')

async def debug_page():
    """Open a song page and dump HTML for selector analysis"""
    
    # Test with a known working URL
    test_url = "https://artists.spotify.com/c/artist/36Bfcbr8mLMRPteWtBIm6Y/song/2IwIvnhAM0zqBAKR7vnteg/playlists"
    
    scraper = SpotifyArtistsScraper(headless=False)
    await scraper.start()
    
    # Login or check session
    await scraper.auto_login(SPOTIFY_EMAIL, SPOTIFY_PASSWORD)
    
    # Navigate to the song page
    print(f"Navigating to: {test_url}")
    await scraper.page.goto(test_url, wait_until='domcontentloaded', timeout=30000)
    await asyncio.sleep(5)
    
    print("\n=== PAGE ANALYSIS ===\n")
    
    # Get page title
    title = await scraper.page.title()
    print(f"Page Title: {title}")
    print(f"Current URL: {scraper.page.url}\n")
    
    # Look for text containing "streams"
    print("Looking for elements containing 'stream'...")
    try:
        stream_elements = await scraper.page.locator('text=/stream/i').all()
        print(f"Found {len(stream_elements)} elements")
        for i, elem in enumerate(stream_elements[:10]):
            text = await elem.text_content()
            html = await elem.inner_html()
            print(f"  {i+1}. Text: {text[:100]}")
            print(f"     HTML: {html[:200]}\n")
    except Exception as e:
        print(f"Error: {e}")
    
    # Look for numbers (potential stream counts)
    print("\n Looking for large numbers (potential streams)...")
    try:
        # Look for elements with data-testid
        testid_elements = await scraper.page.locator('[data-testid]').all()
        print(f"Found {len(testid_elements)} elements with data-testid")
        for elem in testid_elements[:20]:
            testid = await elem.get_attribute('data-testid')
            text = await elem.text_content()
            if text:
                text = text.strip()
                if text and len(text) < 100:  # Reasonable length
                    print(f"  {testid}: {text}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Look for table rows (playlists)
    print("\nLooking for playlist table...")
    try:
        tables = await scraper.page.locator('table').all()
        print(f"Found {len(tables)} tables")
        
        for i, table in enumerate(tables):
            rows = await table.locator('tr').all()
            print(f"\n  Table {i+1}: {len(rows)} rows")
            if rows:
                # Show first few rows
                for j, row in enumerate(rows[:3]):
                    cells = await row.locator('td, th').all()
                    cell_texts = []
                    for cell in cells:
                        text = await cell.text_content()
                        cell_texts.append(text.strip()[:50] if text else "")
                    print(f"    Row {j+1}: {cell_texts}")
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n\n=== Keeping browser open for manual inspection ===")
    print("Press Ctrl+C when done inspecting...")
    
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        print("\nClosing...")
    
    await scraper.stop()

if __name__ == "__main__":
    asyncio.run(debug_page())
