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
    
    # Step 2: Initialize scraper with FRESH browser (incognito mode)
    print("[2/5] Initializing FRESH browser and logging in...")
    print("     (Using incognito mode - no cached session)")
    
    from playwright.async_api import async_playwright
    
    playwright = await async_playwright().start()
    browser = await playwright.chromium.launch(headless=False)
    context = await browser.new_context()  # Fresh context = incognito
    page = await context.new_page()
    
    try:
        print("[*] Starting fresh login flow...")
        
        # Navigate to Spotify for Artists
        await page.goto('https://artists.spotify.com', wait_until='domcontentloaded')
        await asyncio.sleep(3)
        
        # Click Login button on landing page
        print("     Clicking Login button...")
        login_btn = page.locator('button:has-text("Log in")')
        if await login_btn.count() > 0:
            await login_btn.click()
            await asyncio.sleep(3)
        
        # Enter email
        print("     Entering email...")
        email_input = page.locator('input[type="text"]')
        await email_input.fill(SPOTIFY_EMAIL)
        await asyncio.sleep(1)
        
        # Click Continue
        print("     Clicking Continue...")
        continue_btn = page.locator('button:has-text("Continue")')
        await continue_btn.click()
        await asyncio.sleep(5)
        
        # Click "Log in with a password"
        print("     Clicking 'Log in with a password'...")
        password_option = page.locator('button:has-text("Log in with a password")')
        if await password_option.count() > 0:
            await password_option.click()
            await asyncio.sleep(3)
        
        # Enter password
        print("     Entering password...")
        password_input = page.locator('input[type="password"]')
        await password_input.fill(SPOTIFY_PASSWORD)
        await asyncio.sleep(1)
        
        # Click Log in
        print("     Clicking final Log in button...")
        login_submit = page.locator('button:has-text("Log in")')
        await login_submit.click()
        await asyncio.sleep(10)
        
        # Dismiss welcome modal
        print("     Dismissing welcome modal...")
        explore_btn = page.locator('button:has-text("I\'ll explore on my own")')
        if await explore_btn.count() > 0:
            await explore_btn.click()
            await asyncio.sleep(2)
        
        # Verify login
        current_url = page.url
        cookies = await context.cookies()
        has_sp_dc = any(c['name'] == 'sp_dc' for c in cookies)
        
        if 'artists.spotify.com' not in current_url or not has_sp_dc:
            print("[X] Login failed - not on dashboard or missing sp_dc cookie")
            await browser.close()
            await playwright.stop()
            return False
        
        print("[OK] Login successful - sp_dc cookie verified")
        print(f"     Current URL: {current_url}")
        print()
        
    except Exception as e:
        print(f"[X] Login failed: {e}")
        import traceback
        traceback.print_exc()
        await browser.close()
        await playwright.stop()
        return False
    
    # Step 3: Scrape the song data
    print("[3/5] Scraping song data...")
    
    try:
        sfa_url = test_campaign['sfa']
        print(f"     Navigating to: {sfa_url}")
        
        # Import the page helper
        from app.pages.spotify_artists import SpotifyArtistsPage
        
        # Create page helper
        spotify_page = SpotifyArtistsPage(page)
        
        # Navigate to song URL
        await page.goto(sfa_url, wait_until='networkidle')
        await asyncio.sleep(5)  # Human-like delay
        
        # Extract data for multiple time ranges
        song_data = {'time_ranges': {}}
        
        for time_range in ['7day', '24hour']:
            print(f"     Extracting {time_range} data...")
            
            # Switch to time range
            await spotify_page.switch_time_range(time_range)
            await asyncio.sleep(3)
            
            # Get stats
            stats = await spotify_page.get_song_stats(time_range)
            song_data['time_ranges'][time_range] = {'stats': stats}
            
            print(f"       {time_range}: {stats.get('streams', 0)} streams, {len(stats.get('playlists', []))} playlists")
        
        print("[OK] Data scraped successfully")
        print()
        
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
        
        print(f"     Summary:")
        print(f"       24h streams: {streams_24h}")
        print(f"       7d streams: {streams_7d}")
        print(f"       24h playlists: {playlists_24h_count}")
        print(f"       7d playlists: {playlists_7d_count}")
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
        await browser.close()
        await playwright.stop()
        return False
    
    # Close browser
    await browser.close()
    await playwright.stop()
    
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
