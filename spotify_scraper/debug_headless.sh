#!/bin/bash
# Debug script to capture what the page looks like in headless mode

cd /root/arti-marketing-ops/spotify_scraper

echo "=========================================="
echo "  Spotify Scraper - Headless Debug Test"
echo "=========================================="
echo ""

# Create a debug script that takes a screenshot
cat > debug_headless.py << 'ENDOFSCRIPT'
import asyncio
import os
import sys
from datetime import datetime
from dotenv import load_dotenv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'runner'))
from app.scraper import SpotifyArtistsScraper

load_dotenv()

SPOTIFY_EMAIL = os.getenv('SPOTIFY_EMAIL')
SPOTIFY_PASSWORD = os.getenv('SPOTIFY_PASSWORD')

async def debug_headless():
    """Capture page state in headless mode"""
    
    test_url = "https://artists.spotify.com/c/artist/36Bfcbr8mLMRPteWtBIm6Y/song/2IwIvnhAM0zqBAKR7vnteg/playlists"
    
    print("[1] Starting browser (headless=True)...")
    scraper = SpotifyArtistsScraper(headless=True)
    
    try:
        await scraper.start()
        
        # Auto-login
        if not await scraper.verify_login():
            await scraper.auto_login(SPOTIFY_EMAIL, SPOTIFY_PASSWORD)
        
        print("[2] Navigating to playlist page...")
        await scraper.page.goto(test_url, wait_until='domcontentloaded', timeout=30000)
        
        # Wait for page to settle
        print("[3] Waiting for page to load...")
        await asyncio.sleep(5)
        
        # Take screenshot
        screenshot_path = "/var/log/spotify-scraper/debug_headless.png"
        await scraper.page.screenshot(path=screenshot_path, full_page=True)
        print(f"[4] Screenshot saved: {screenshot_path}")
        
        # Get page HTML
        html_content = await scraper.page.content()
        html_path = "/var/log/spotify-scraper/debug_page.html"
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        print(f"[5] HTML saved: {html_path}")
        
        # Check for key elements
        print("\n[6] Checking for elements...")
        
        # Check for dropdown button
        dropdowns = await scraper.page.locator('button').all()
        print(f"    Found {len(dropdowns)} buttons")
        
        # Check for tables
        tables = await scraper.page.locator('table').all()
        print(f"    Found {len(tables)} tables")
        
        # Check for any text containing "28 days"
        time_elements = await scraper.page.locator('text=/28 days|7 days|24 hour/i').all()
        print(f"    Found {len(time_elements)} time-range related elements")
        
        # Get all data-testid attributes
        testids = await scraper.page.locator('[data-testid]').all()
        print(f"    Found {len(testids)} elements with data-testid")
        
        # Show first few testids
        print("\n[7] Sample data-testid values:")
        for i, elem in enumerate(testids[:10]):
            testid = await elem.get_attribute('data-testid')
            text = await elem.text_content()
            text_preview = (text or '').strip()[:50]
            print(f"    {i+1}. {testid}: {text_preview}")
        
        print("\n[SUCCESS] Debug info captured!")
        print(f"\nTo analyze:")
        print(f"  1. Download screenshot: scp root@165.227.91.129:{screenshot_path} .")
        print(f"  2. Download HTML: scp root@165.227.91.129:{html_path} .")
        print(f"  3. Open HTML in browser to see what renders")
        
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
    finally:
        await scraper.stop()

if __name__ == "__main__":
    asyncio.run(debug_headless())
ENDOFSCRIPT

echo "Running headless debug..."
python3 debug_headless.py

# Cleanup
rm debug_headless.py

echo ""
echo "=========================================="
echo "Debug complete!"
echo "=========================================="

