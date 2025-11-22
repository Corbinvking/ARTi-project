#!/bin/bash
# Quick diagnostic script to test the scraper with our verified working campaign

cd /root/arti-marketing-ops/spotify_scraper

echo "=========================================="
echo "  Spotify Scraper - Single Campaign Test"
echo "=========================================="
echo ""
echo "Testing with Campaign 7343 (DAUNTER x URAI - ENGULFED)"
echo "This campaign was verified working locally with:"
echo "  - 56 streams (24h)"
echo "  - 320 streams (7d)"
echo "  - 4 playlists"
echo ""

# Create a test script that runs just one campaign
cat > test_single_campaign.py << 'ENDOFSCRIPT'
import asyncio
import os
import sys
from datetime import datetime, timezone
from dotenv import load_dotenv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'runner'))
from app.scraper import SpotifyArtistsScraper

load_dotenv()

SPOTIFY_EMAIL = os.getenv('SPOTIFY_EMAIL')
SPOTIFY_PASSWORD = os.getenv('SPOTIFY_PASSWORD')

async def test_single():
    """Test with the campaign we know works"""
    
    # Campaign 7343 - DAUNTER x URAI - ENGULFED
    test_url = "https://artists.spotify.com/c/artist/36Bfcbr8mLMRPteWtBIm6Y/song/2IwIvnhAM0zqBAKR7vnteg/stats"
    
    print(f"[1] Initializing scraper (headless=True)...")
    scraper = SpotifyArtistsScraper(headless=True)
    
    try:
        await scraper.start()
        print("[2] Browser started")
        
        print("[3] Checking login session...")
        # Session should be valid from browser_data
        if not await scraper.verify_login():
            print("[4] Session invalid, attempting auto-login...")
            login_ok = await scraper.auto_login(SPOTIFY_EMAIL, SPOTIFY_PASSWORD)
            if not login_ok:
                print("[ERROR] Login failed!")
                return False
        else:
            print("[4] Session valid!")
        
        print(f"[5] Scraping campaign...")
        print(f"    URL: {test_url}")
        
        data = await scraper.scrape_song_data(test_url, time_ranges=['7day', '24hour'])
        
        if data and 'time_ranges' in data:
            print("\n[OK] DATA SCRAPED SUCCESSFULLY!")
            
            if '7day' in data['time_ranges']:
                stats_7d = data['time_ranges']['7day']['stats']
                print(f"\n  7-day data:")
                print(f"    Streams: {stats_7d.get('streams', 0)}")
                print(f"    Playlists: {len(stats_7d.get('playlists', []))}")
                
            if '24hour' in data['time_ranges']:
                stats_24h = data['time_ranges']['24hour']['stats']
                print(f"\n  24-hour data:")
                print(f"    Streams: {stats_24h.get('streams', 0)}")
                print(f"    Playlists: {len(stats_24h.get('playlists', []))}")
            
            print("\n[SUCCESS] Test passed! Scraper is working correctly.")
            print("The issue might be with the 'delete me' test campaigns.")
            return True
        else:
            print("\n[ERROR] No data returned!")
            return False
            
    except Exception as e:
        print(f"\n[ERROR] Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        await scraper.stop()

if __name__ == "__main__":
    success = asyncio.run(test_single())
    sys.exit(0 if success else 1)
ENDOFSCRIPT

echo "Running single campaign test..."
python3 test_single_campaign.py

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "  ✓ TEST PASSED!"
    echo "=========================================="
    echo ""
    echo "The scraper is working correctly in production."
    echo "You can now run the full scraper:"
    echo "  python3 run_production_scraper.py"
    echo ""
else
    echo ""
    echo "=========================================="
    echo "  ✗ TEST FAILED"
    echo "=========================================="
    echo ""
    echo "Check the error messages above."
    echo "Log file: /var/log/spotify-scraper/production_scraper_*.log"
    echo ""
fi

# Cleanup
rm test_single_campaign.py

exit $EXIT_CODE

