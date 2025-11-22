"""
Test the full Spotify scraper workflow against PRODUCTION database:
1. Connect to PRODUCTION database
2. Fetch a campaign with valid SFA URL
3. Scrape the song data
4. Update the database
5. Verify the update

NOTE: This tests against the production database at artistinfluence.com
"""

import asyncio
import os
import sys
from datetime import datetime, timezone
from dotenv import load_dotenv
import requests

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'runner'))

from app.scraper import SpotifyArtistsScraper

load_dotenv()

# Use PRODUCTION Supabase URL (external access)
SUPABASE_URL = "https://api.artistinfluence.com"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

SPOTIFY_EMAIL = os.getenv('SPOTIFY_EMAIL')
SPOTIFY_PASSWORD = os.getenv('SPOTIFY_PASSWORD')

print("[*] Starting Full Workflow Test")
print(f"[*] Supabase URL: {SUPABASE_URL}")
print(f"[*] Spotify Email: {SPOTIFY_EMAIL}")
print()

async def test_workflow():
    """Test the complete workflow"""
    
    # Step 1: Connect to database and fetch a test campaign
    print("[1/5] Fetching test campaign from PRODUCTION database...")
    
    headers = {
        'apikey': SERVICE_KEY,
        'Authorization': f'Bearer {SERVICE_KEY}',
        'Content-Type': 'application/json'
    }
    
    url = f"{SUPABASE_URL}/rest/v1/spotify_campaigns"
    params = {
        'select': 'id,campaign,sfa,track_name,artist_name',
        'sfa': 'like.https://artists.spotify.com%',
        'limit': '1',
        'order': 'id.asc'
    }
    
    try:
        response = requests.get(url, headers=headers, params=params)
        if response.status_code != 200:
            print(f"[X] Database error: {response.status_code} - {response.text}")
            return False
        
        campaigns = response.json()
        
        if not campaigns:
            print("[X] No campaigns found with valid SFA URLs")
            return False
        
        test_campaign = campaigns[0]
        print(f"[OK] Found campaign: {test_campaign['campaign']}")
        print(f"     Track: {test_campaign.get('track_name', 'N/A')} by {test_campaign.get('artist_name', 'N/A')}")
        print(f"     SFA URL: {test_campaign['sfa']}")
        print()
        
    except Exception as e:
        print(f"[X] Database connection failed: {e}")
        return False
    
    # Step 2: Initialize scraper and login
    print("[2/5] Initializing scraper and logging in...")
    scraper = SpotifyArtistsScraper(headless=False)  # Use GUI mode for debugging
    
    try:
        await scraper.start()
        print("[*] Browser started, attempting login...")
        
        login_success = await scraper.auto_login(SPOTIFY_EMAIL, SPOTIFY_PASSWORD)
        
        if not login_success:
            print("[X] Login failed")
            await scraper.stop()
            return False
        
        print("[OK] Login successful")
        print()
        
    except Exception as e:
        print(f"[X] Scraper initialization failed: {e}")
        await scraper.stop()
        return False
    
    # Step 3: Scrape the song data
    print("[3/5] Scraping song data...")
    
    try:
        sfa_url = test_campaign['sfa']
        song_data = await scraper.scrape_song_data(sfa_url, time_ranges=['7day', '24hour'])
        
        if not song_data:
            print("[X] No data scraped")
            await scraper.stop()
            return False
        
        print("[OK] Data scraped successfully:")
        
        # Extract data from the nested structure
        streams_24h = 0
        streams_7d = 0
        playlists_24h_count = 0
        playlists_7d_count = 0
        playlists_24h = []
        playlists_7d = []
        
        if '24hour' in song_data.get('time_ranges', {}):
            stats_24h = song_data['time_ranges']['24hour']['stats']
            streams_24h = stats_24h.get('streams', 0)
            playlists_24h = stats_24h.get('playlists', [])
            playlists_24h_count = len(playlists_24h)
        
        if '7day' in song_data.get('time_ranges', {}):
            stats_7d = song_data['time_ranges']['7day']['stats']
            streams_7d = stats_7d.get('streams', 0)
            playlists_7d = stats_7d.get('playlists', [])
            playlists_7d_count = len(playlists_7d)
        
        print(f"     24h streams: {streams_24h}")
        print(f"     7d streams: {streams_7d}")
        print(f"     24h playlists: {playlists_24h_count}")
        print(f"     7d playlists: {playlists_7d_count}")
        print()
        
        # Show some playlist examples
        if playlists_7d:
            print("[*] Sample playlists (7 day):")
            for playlist in playlists_7d[:3]:
                print(f"     - {playlist.get('name', 'Unknown')} ({playlist.get('streams', '0')} streams)")
        print()
        
    except Exception as e:
        print(f"[X] Scraping failed: {e}")
        import traceback
        traceback.print_exc()
        await scraper.stop()
        return False
    
    await scraper.stop()
    
    # Step 4: Update the database
    print("[4/5] Updating PRODUCTION database...")
    
    update_data = {
        'streams_24h': streams_24h,
        'streams_7d': streams_7d,
        'playlists_24h_count': playlists_24h_count,
        'playlists_7d_count': playlists_7d_count,
        'last_scraped_at': datetime.now(timezone.utc).isoformat(),
        'scrape_data': song_data
    }
    
    url = f"{SUPABASE_URL}/rest/v1/spotify_campaigns"
    params = {'id': f'eq.{test_campaign["id"]}'}
    
    try:
        response = requests.patch(url, headers=headers, params=params, json=update_data)
        if response.status_code not in [200, 204]:
            print(f"[X] Update failed: {response.status_code} - {response.text}")
            return False
        
        print(f"[OK] Database updated for campaign ID {test_campaign['id']}")
        print()
        
    except Exception as e:
        print(f"[X] Database update failed: {e}")
        return False
    
    # Step 5: Verify the update
    print("[5/5] Verifying database update...")
    
    url = f"{SUPABASE_URL}/rest/v1/spotify_campaigns"
    params = {
        'select': 'id,campaign,streams_24h,streams_7d,playlists_24h_count,playlists_7d_count,last_scraped_at',
        'id': f'eq.{test_campaign["id"]}'
    }
    
    try:
        response = requests.get(url, headers=headers, params=params)
        if response.status_code != 200:
            print(f"[X] Verification failed: {response.status_code}")
            return False
        
        result = response.json()
        if not result:
            print("[X] Campaign not found after update")
            return False
        
        updated_campaign = result[0]
        print("[OK] Verification successful:")
        print(f"     Campaign: {updated_campaign['campaign']}")
        print(f"     24h streams: {updated_campaign['streams_24h']}")
        print(f"     7d streams: {updated_campaign['streams_7d']}")
        print(f"     24h playlists: {updated_campaign['playlists_24h_count']}")
        print(f"     7d playlists: {updated_campaign['playlists_7d_count']}")
        print(f"     Last scraped: {updated_campaign['last_scraped_at']}")
        print()
        
    except Exception as e:
        print(f"[X] Verification failed: {e}")
        return False
    
    print("[OK] ==== FULL WORKFLOW TEST PASSED ====")
    print()
    print("[*] You can now:")
    print("    1. Check the frontend UI to see if data appears")
    print("    2. Run the production scraper on all campaigns")
    return True

if __name__ == "__main__":
    if not SPOTIFY_EMAIL or not SPOTIFY_PASSWORD:
        print("[X] SPOTIFY_EMAIL or SPOTIFY_PASSWORD not found in .env")
        sys.exit(1)
    
    success = asyncio.run(test_workflow())
    sys.exit(0 if success else 1)
