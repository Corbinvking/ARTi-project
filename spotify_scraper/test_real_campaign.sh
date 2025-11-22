#!/bin/bash
# Test scraper with ONE real campaign that has data

cd /root/arti-marketing-ops/spotify_scraper

echo "=========================================="
echo "  Testing with REAL Campaign (7343)"
echo "=========================================="
echo ""
echo "Campaign: DAUNTER x URAI - ENGULFED"
echo "Expected: 320 streams (7d), 4 playlists"
echo ""

# Create a one-off test script
cat > test_real_campaign.py << 'EOF'
import asyncio
import os
import sys
from datetime import datetime, timezone
from dotenv import load_dotenv
import aiohttp

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'runner'))
from app.scraper import SpotifyArtistsScraper

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL', 'http://localhost:54321')
SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
SPOTIFY_EMAIL = os.getenv('SPOTIFY_EMAIL')
SPOTIFY_PASSWORD = os.getenv('SPOTIFY_PASSWORD')

async def test_real_campaign():
    """Test with Campaign 7343 - has real data"""
    
    # Fetch campaign 7343 from database
    headers = {
        'apikey': SERVICE_KEY,
        'Authorization': f'Bearer {SERVICE_KEY}',
        'Content-Type': 'application/json'
    }
    
    print("[1/5] Fetching Campaign 7343 from database...")
    async with aiohttp.ClientSession() as session:
        url = f"{SUPABASE_URL}/rest/v1/spotify_campaigns"
        params = {
            'select': 'id,campaign,sfa,track_name,artist_name',
            'id': 'eq.7343'
        }
        
        async with session.get(url, headers=headers, params=params) as response:
            if response.status != 200:
                print(f"[ERROR] Database error: {response.status}")
                return False
            
            data = await response.json()
            if not data:
                print("[ERROR] Campaign 7343 not found!")
                return False
            
            campaign = data[0]
            print(f"[OK] Campaign: {campaign['campaign']}")
            print(f"     SFA URL: {campaign['sfa']}")
            print()
    
    # Initialize scraper
    print("[2/5] Starting scraper in GUI mode...")
    headless_mode = os.getenv('HEADLESS', 'false').lower() == 'true'
    print(f"     Mode: {'HEADLESS' if headless_mode else 'GUI'}")
    
    scraper = SpotifyArtistsScraper(headless=headless_mode)
    
    try:
        await scraper.start()
        
        print("[3/5] Verifying login...")
        if not await scraper.verify_login():
            print("     Attempting auto-login...")
            if not await scraper.auto_login(SPOTIFY_EMAIL, SPOTIFY_PASSWORD):
                print("[ERROR] Login failed!")
                return False
        print("[OK] Login verified")
        print()
        
        print("[4/5] Scraping campaign data...")
        print(f"     URL: {campaign['sfa']}")
        
        song_data = await scraper.scrape_song_data(campaign['sfa'], time_ranges=['7day', '24hour'])
        
        if not song_data or 'time_ranges' not in song_data:
            print("[ERROR] No data returned!")
            return False
        
        # Extract results
        streams_24h = 0
        streams_7d = 0
        playlists_24h = 0
        playlists_7d = 0
        
        if '24hour' in song_data['time_ranges']:
            stats = song_data['time_ranges']['24hour']['stats']
            streams_24h = stats.get('streams', 0)
            playlists_24h = len(stats.get('playlists', []))
        
        if '7day' in song_data['time_ranges']:
            stats = song_data['time_ranges']['7day']['stats']
            streams_7d = stats.get('streams', 0)
            playlists_7d = len(stats.get('playlists', []))
        
        print()
        print("========================================")
        print("  RESULTS")
        print("========================================")
        print(f"24-hour data:")
        print(f"  Playlists: {playlists_24h}")
        print(f"  Streams:   {streams_24h}")
        print()
        print(f"7-day data:")
        print(f"  Playlists: {playlists_7d}")
        print(f"  Streams:   {streams_7d}")
        print()
        
        # Determine if successful
        if playlists_7d > 0 and streams_7d > 0:
            print("========================================")
            print("  ✓✓✓ SUCCESS! ✓✓✓")
            print("========================================")
            print()
            print(f"Scraper is WORKING! Found {playlists_7d} playlists with {streams_7d} streams!")
            print("You can now run the full scraper on all 131 campaigns.")
            print()
            return True
        else:
            print("========================================")
            print("  ✗ STILL NOT WORKING")
            print("========================================")
            print()
            print("Even with GUI mode, couldn't extract playlist data.")
            print("This means the selectors need updating for current Spotify UI.")
            print()
            return False
            
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        await scraper.stop()

if __name__ == "__main__":
    success = asyncio.run(test_real_campaign())
    sys.exit(0 if success else 1)
EOF

# Run with virtual display
export DISPLAY=:99
python3 test_real_campaign.py

EXIT_CODE=$?

# Cleanup
rm test_real_campaign.py

exit $EXIT_CODE

