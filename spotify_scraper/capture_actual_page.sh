#!/bin/bash
# Capture actual page HTML and screenshot to debug selectors

cd /root/arti-marketing-ops/spotify_scraper

cat > capture_page.py << 'EOF'
import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load .env
env_path = Path('/root/arti-marketing-ops/spotify_scraper/.env')
load_dotenv(env_path)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'runner'))
from app.scraper import SpotifyArtistsScraper

async def capture_page():
    """Capture actual page state for debugging"""
    
    # Known good URL
    url = "https://artists.spotify.com/c/artist/36Bfcbr8mLMRPteWtBIm6Y/song/2IwIvnhAM0zqBAKR7vnteg/playlists"
    
    print("Starting browser...")
    scraper = SpotifyArtistsScraper(headless=False)
    await scraper.start()
    
    try:
        print(f"Navigating to: {url}")
        await scraper.page.goto(url, wait_until='domcontentloaded', timeout=60000)
        await asyncio.sleep(5)  # Let page fully load
        
        # Take screenshot
        screenshot_path = '/var/log/spotify-scraper/actual_page.png'
        await scraper.page.screenshot(path=screenshot_path, full_page=True)
        print(f"✅ Screenshot saved: {screenshot_path}")
        
        # Save HTML
        html = await scraper.page.content()
        html_path = '/var/log/spotify-scraper/actual_page.html'
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"✅ HTML saved: {html_path}")
        
        # Find all buttons
        print("\n[Searching for buttons...]")
        buttons = await scraper.page.locator('button').all()
        print(f"Found {len(buttons)} buttons")
        for i, btn in enumerate(buttons[:10]):  # First 10
            text = await btn.text_content()
            aria_label = await btn.get_attribute('aria-label')
            data_testid = await btn.get_attribute('data-testid')
            print(f"  Button {i+1}: text='{text}' aria-label='{aria_label}' data-testid='{data_testid}'")
        
        # Find all dropdowns/selects
        print("\n[Searching for dropdowns...]")
        dropdowns = await scraper.page.locator('select, [role="combobox"], [role="listbox"]').all()
        print(f"Found {len(dropdowns)} dropdown-like elements")
        
        # Find tables
        print("\n[Searching for tables...]")
        tables = await scraper.page.locator('table').all()
        print(f"Found {len(tables)} tables")
        
        # Check for any element with "7" or "24" (time range indicators)
        print("\n[Searching for time range elements...]")
        time_elements = await scraper.page.locator('text=/7.*day|24.*hour|Last 7|Last 24/i').all()
        print(f"Found {len(time_elements)} time-range-like elements")
        for i, elem in enumerate(time_elements[:5]):
            text = await elem.text_content()
            tag = await elem.evaluate('el => el.tagName')
            print(f"  Element {i+1}: <{tag}> '{text}'")
        
    finally:
        await scraper.stop()
    
    print("\n✅ Capture complete!")
    print(f"\nTo download:")
    print(f"  scp root@165.227.91.129:/var/log/spotify-scraper/actual_page.png .")
    print(f"  scp root@165.227.91.129:/var/log/spotify-scraper/actual_page.html .")

if __name__ == '__main__':
    asyncio.run(capture_page())
EOF

python3 capture_page.py

