#!/usr/bin/env python3
"""
Production Spotify for Artists Scraper - Fresh Login Version
Scrapes ALL campaigns with SFA links using fresh incognito login every time.
Designed to run daily via cron job.

Usage:
  python3 run_production_scraper.py              # Scrape all campaigns
  python3 run_production_scraper.py --limit 10   # Test with 10 campaigns
"""

import asyncio
import os
import sys
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any
from pathlib import Path
from dotenv import load_dotenv
import requests
from playwright.async_api import async_playwright

# Load environment variables
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

# Add runner to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'runner'))
from app.pages.spotify_artists import SpotifyArtistsPage

# Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://api.artistinfluence.com')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
SPOTIFY_EMAIL = os.getenv('SPOTIFY_EMAIL')
SPOTIFY_PASSWORD = os.getenv('SPOTIFY_PASSWORD')

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def check_if_logged_in(page):
    """Check if already logged in from previous session"""
    try:
        logger.info("Checking for existing session...")
        await page.goto('https://artists.spotify.com', timeout=30000, wait_until='networkidle')
        await asyncio.sleep(3)
        
        # Check if we're already on the dashboard
        current_url = page.url
        
        if 'artists.spotify.com/c/' in current_url or 'artists.spotify.com/home' in current_url:
            logger.info("✓ Existing session found! Already logged in.")
            
            # Verify we have sp_dc cookie
            cookies = await page.context.cookies()
            has_sp_dc = any(c['name'] == 'sp_dc' for c in cookies)
            
            if has_sp_dc:
                logger.info("✓ Authentication cookie verified")
                return True
            else:
                logger.warning("⚠ On dashboard but no sp_dc cookie - session may be expired")
                return False
        else:
            logger.info("No existing session - need to login")
            return False
            
    except Exception as e:
        logger.warning(f"Could not verify existing session: {e}")
        return False


async def login_to_spotify(page, force_fresh=False):
    """Perform fresh login to Spotify for Artists"""
    if force_fresh:
        logger.info("Performing forced fresh login (clearing session)...")
        # Clear existing session if forcing fresh login
        await page.context.clear_cookies()
    else:
        logger.info("Starting login to Spotify for Artists...")
    
    # Navigate to landing page
    await page.goto('https://artists.spotify.com', wait_until='domcontentloaded')
    await asyncio.sleep(3)
    
    # Click Login button
    logger.info("  Clicking Login button...")
    login_btn = page.locator('button:has-text("Log in")')
    if await login_btn.count() > 0:
        await login_btn.click()
        await asyncio.sleep(3)
    
    # Enter email
    logger.info("  Entering email...")
    email_input = page.locator('input[type="text"]')
    await email_input.fill(SPOTIFY_EMAIL)
    await asyncio.sleep(1)
    
    # Click Continue
    logger.info("  Clicking Continue...")
    continue_btn = page.locator('button:has-text("Continue")')
    await continue_btn.click()
    await asyncio.sleep(5)
    
    # Click "Log in with a password"
    logger.info("  Clicking 'Log in with a password'...")
    password_option = page.locator('button:has-text("Log in with a password")')
    if await password_option.count() > 0:
        await password_option.click()
        await asyncio.sleep(3)
    
    # Enter password
    logger.info("  Entering password...")
    password_input = page.locator('input[type="password"]')
    await password_input.fill(SPOTIFY_PASSWORD)
    await asyncio.sleep(1)
    
    # Click final Log in button
    logger.info("  Clicking Log in button...")
    login_submit = page.locator('button[data-testid="login-button"]')
    await login_submit.click()
    await asyncio.sleep(10)
    
    # Dismiss welcome modal if present
    explore_btn = page.locator('button:has-text("I\'ll explore on my own")')
    if await explore_btn.count() > 0:
        logger.info("  Dismissing welcome modal...")
        await explore_btn.click()
        await asyncio.sleep(3)
    
    # Wait longer for sp_dc cookie to be set by Spotify
    logger.info("  Waiting for authentication cookies...")
    await asyncio.sleep(5)
    
    # Debug: Check current URL and cookies
    current_url = page.url
    logger.info(f"  Current URL: {current_url}")
    
    # Verify sp_dc cookie was set
    cookies = await page.context.cookies()
    cookie_names = [c['name'] for c in cookies]
    logger.info(f"  Found {len(cookies)} cookies: {', '.join(cookie_names[:10])}")
    
    has_sp_dc = any(c['name'] == 'sp_dc' for c in cookies)
    
    if has_sp_dc:
        logger.info("✓ Login successful! Authentication cookie found.")
        return True
    
    # Not found immediately - try waiting for dashboard elements
    logger.warning("⚠ sp_dc cookie not immediately found. Checking if we're on dashboard...")
    
    # Wait for dashboard to load (better indicator than cookie)
    try:
        await page.wait_for_url("**/artists.spotify.com/**", timeout=10000)
        logger.info("✓ Dashboard URL detected")
        
        # Now check cookies again
        await asyncio.sleep(3)
        cookies = await page.context.cookies()
        has_sp_dc = any(c['name'] == 'sp_dc' for c in cookies)
        
        if has_sp_dc:
            logger.info("✓ Authentication cookie found after dashboard load.")
            return True
        else:
            # Try to find sp_dc in all cookies
            logger.warning(f"⚠ All cookies: {[f'{c['name']}={c['value'][:20]}...' for c in cookies]}")
            logger.error("✗ sp_dc cookie still not found. Login may have failed.")
            return False
    except Exception as e:
        logger.error(f"✗ Failed to reach dashboard: {e}")
        return False


async def fetch_campaigns_from_database(limit=None):
    """Fetch all campaigns with valid SFA URLs from database"""
    logger.info("Fetching campaigns from database...")
    
    headers = {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json'
    }
    
    url = f"{SUPABASE_URL}/rest/v1/spotify_campaigns"
    params = {
        'select': 'id,campaign,sfa,track_name,artist_name',
        'sfa': 'like.https://artists.spotify.com%',
        'order': 'id.asc'
    }
    
    if limit:
        params['limit'] = str(limit)
    
    response = requests.get(url, headers=headers, params=params)
    
    if response.status_code != 200:
        logger.error(f"Database error: {response.status_code} - {response.text}")
        return []
    
    campaigns = response.json()
    logger.info(f"Found {len(campaigns)} campaigns with SFA URLs")
    return campaigns


async def scrape_campaign(page, spotify_page, campaign):
    """Scrape data for a single campaign"""
    campaign_id = campaign['id']
    campaign_name = campaign['campaign']
    sfa_url = campaign['sfa']
    
    logger.info(f"[{campaign_id}] Scraping: {campaign_name}")
    
    try:
        # Navigate to song
        await spotify_page.navigate_to_song(sfa_url)
        await asyncio.sleep(2)
        
        # Scrape all three time ranges
        song_data = {'time_ranges': {}}
        
        for time_range in ['24hour', '7day', '28day']:
            logger.info(f"  Extracting {time_range} data...")
            
            # Switch time range
            await spotify_page.switch_time_range(time_range)
            await asyncio.sleep(2)
            
            # Get stats
            stats = await spotify_page.get_song_stats()
            song_data['time_ranges'][time_range] = {'stats': stats}
            
            streams = stats.get('streams', 0)
            playlists_count = len(stats.get('playlists', []))
            logger.info(f"    {time_range}: {streams} streams, {playlists_count} playlists")
        
        # Extract data for database update
        stats_24h = song_data['time_ranges']['24hour']['stats']
        stats_7d = song_data['time_ranges']['7day']['stats']
        stats_28d = song_data['time_ranges']['28day']['stats']
        
        return {
            'streams_24h': stats_24h.get('streams', 0),
            'streams_7d': stats_7d.get('streams', 0),
            'streams_28d': stats_28d.get('streams', 0),
            'playlists_24h_count': len(stats_24h.get('playlists', [])),
            'playlists_7d_count': len(stats_7d.get('playlists', [])),
            'playlists_28d_count': len(stats_28d.get('playlists', [])),
            'last_scraped_at': datetime.now(timezone.utc).isoformat(),
            'scrape_data': song_data
        }
        
    except Exception as e:
        logger.error(f"[{campaign_id}] Error: {e}")
        import traceback
        traceback.print_exc()
        return None


async def update_campaign_in_database(campaign_id, data):
    """Update campaign data in spotify_campaigns table (raw data storage)"""
    headers = {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json'
    }
    
    # First, fetch the previous values for trend calculation
    get_url = f"{SUPABASE_URL}/rest/v1/spotify_campaigns"
    get_params = {'id': f'eq.{campaign_id}', 'select': 'streams_24h,streams_7d,streams_28d'}
    try:
        previous_response = requests.get(get_url, headers=headers, params=get_params)
        if previous_response.status_code == 200 and previous_response.json():
            prev_data = previous_response.json()[0]
            previous_values = {
                'streams_24h': prev_data.get('streams_24h', 0),
                'streams_7d': prev_data.get('streams_7d', 0),
                'streams_28d': prev_data.get('streams_28d', 0)
            }
            # Add previous values to scrape_data for trend calculation
            if 'scrape_data' in data and isinstance(data['scrape_data'], dict):
                data['scrape_data']['previous'] = previous_values
                logger.info(f"[{campaign_id}] Stored previous values: 24h={previous_values['streams_24h']}, 7d={previous_values['streams_7d']}")
    except Exception as e:
        logger.warning(f"[{campaign_id}] Could not fetch previous values: {e}")
    
    url = f"{SUPABASE_URL}/rest/v1/spotify_campaigns"
    params = {'id': f'eq.{campaign_id}'}
    
    response = requests.patch(url, headers=headers, params=params, json=data)
    
    if response.status_code not in [200, 204]:
        logger.error(f"[{campaign_id}] Database update failed: {response.status_code} - {response.text}")
        return False
    
    logger.info(f"[{campaign_id}] ✓ Raw data updated in spotify_campaigns (with trend history)")
    return True


def is_algorithmic_playlist(playlist_name):
    """
    Detect if a playlist is a Spotify algorithmic playlist.
    These are automatically generated by Spotify for users.
    """
    ALGORITHMIC_PATTERNS = [
        'radio',
        'discover weekly',
        'your dj',
        'daylist',
        'mixes',
        'release radar',
        'daily mix',
        'on repeat',
        'repeat rewind'
    ]
    
    name = playlist_name.lower()
    return any(pattern in name for pattern in ALGORITHMIC_PATTERNS)


async def save_to_scraped_data_table(campaign, scrape_data):
    """
    FIX #1: Save historical scraped data to scraped_data table.
    This preserves historical trends and performance data over time.
    """
    headers = {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json'
    }
    
    try:
        record = {
            'platform': 'spotify',
            'song_url': campaign.get('sfa', ''),
            'artist_name': campaign.get('artist_name'),
            'song_title': campaign.get('track_name'),
            'scraped_at': datetime.now(timezone.utc).isoformat(),
            'raw_data': scrape_data  # Full JSON with all time ranges and playlists
        }
        
        url = f"{SUPABASE_URL}/rest/v1/scraped_data"
        response = requests.post(url, headers=headers, json=record)
        
        if response.status_code not in [200, 201]:
            logger.warning(f"[{campaign['id']}] Failed to save historical data: {response.status_code} - {response.text}")
            return False
        
        logger.info(f"[{campaign['id']}] ✓ Historical data saved to scraped_data table")
        return True
        
    except Exception as e:
        logger.error(f"[{campaign['id']}] Error saving historical data: {e}")
        return False


async def sync_to_campaign_playlists(campaign_id, scrape_data):
    """
    Bridge function: Sync scraped playlist data to campaign_playlists table
    This keeps the UI working with existing queries while storing raw data in spotify_campaigns
    
    FIX #2: Now preserves is_algorithmic flags by auto-detecting algorithmic playlists
    """
    headers = {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json'
    }
    
    try:
        # Extract unique playlists across all time ranges
        playlists_by_id = {}
        
        for time_range, time_data in scrape_data.get('time_ranges', {}).items():
            stats = time_data.get('stats', {})
            playlists = stats.get('playlists', [])
            
            for playlist in playlists:
                playlist_name = playlist.get('name', 'Unknown')
                # Use name as key for now (could use Spotify ID if available)
                if playlist_name not in playlists_by_id:
                    playlists_by_id[playlist_name] = {
                        'playlist_name': playlist_name,
                        'streams_24h': 0,
                        'streams_7d': 0,
                        'streams_28d': 0,
                    }
                
                # Map time range to field name
                # Remove commas from stream counts before converting to int
                streams_str = str(playlist.get('streams', 0)).replace(',', '')
                streams = int(streams_str) if streams_str.isdigit() else 0
                
                if time_range == '24hour':
                    playlists_by_id[playlist_name]['streams_24h'] = streams
                elif time_range == '7day':
                    playlists_by_id[playlist_name]['streams_7d'] = streams
                elif time_range == '28day':
                    playlists_by_id[playlist_name]['streams_28d'] = streams
        
        if not playlists_by_id:
            logger.info(f"[{campaign_id}] No playlists to sync")
            return True
        
        # First, delete existing campaign_playlists entries for this campaign
        # This ensures we only show current data
        delete_url = f"{SUPABASE_URL}/rest/v1/campaign_playlists"
        delete_params = {'campaign_id': f'eq.{campaign_id}'}
        
        delete_response = requests.delete(delete_url, headers=headers, params=delete_params)
        if delete_response.status_code not in [200, 204]:
            logger.warning(f"[{campaign_id}] Could not delete old playlists: {delete_response.status_code}")
        
        # Insert new playlist data with auto-detected is_algorithmic flag
        playlist_records = []
        algorithmic_count = 0
        vendor_count = 0
        
        for playlist_data in playlists_by_id.values():
            playlist_name = playlist_data['playlist_name']
            is_algo = is_algorithmic_playlist(playlist_name)
            
            if is_algo:
                algorithmic_count += 1
            else:
                vendor_count += 1
            
            record = {
                'campaign_id': campaign_id,
                'playlist_name': playlist_name,
                'streams_24h': playlist_data['streams_24h'],
                'streams_7d': playlist_data['streams_7d'],
                'streams_28d': playlist_data['streams_28d'],
                'is_algorithmic': is_algo,  # FIX #2: Auto-detect and preserve algorithmic flag
            }
            playlist_records.append(record)
        
        # Batch insert
        insert_url = f"{SUPABASE_URL}/rest/v1/campaign_playlists"
        insert_response = requests.post(insert_url, headers=headers, json=playlist_records)
        
        if insert_response.status_code not in [200, 201]:
            logger.error(f"[{campaign_id}] Failed to sync playlists: {insert_response.status_code} - {insert_response.text}")
            return False
        
        logger.info(f"[{campaign_id}] ✓ Synced {len(playlist_records)} playlists ({algorithmic_count} algorithmic, {vendor_count} vendor)")
        return True
        
    except Exception as e:
        logger.error(f"[{campaign_id}] Error syncing playlists: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main(limit=None):
    """Main scraper execution"""
    logger.info("="*60)
    logger.info("SPOTIFY FOR ARTISTS PRODUCTION SCRAPER")
    logger.info("="*60)
    logger.info(f"Supabase URL: {SUPABASE_URL}")
    logger.info(f"Spotify Email: {SPOTIFY_EMAIL}")
    logger.info(f"Limit: {limit if limit else 'No limit (all campaigns)'}")
    logger.info("")
    
    # Validate credentials
    if not SPOTIFY_EMAIL or not SPOTIFY_PASSWORD:
        logger.error("SPOTIFY_EMAIL and SPOTIFY_PASSWORD must be set in .env")
        return False
    
    if not SUPABASE_SERVICE_ROLE_KEY:
        logger.error("SUPABASE_SERVICE_ROLE_KEY must be set in .env")
        return False
    
    # Fetch campaigns from database
    campaigns = await fetch_campaigns_from_database(limit=limit)
    
    if not campaigns:
        logger.warning("No campaigns to scrape")
        return False
    
    # Initialize browser with persistent context (saves cookies/session)
    logger.info("Initializing browser with persistent context...")
    playwright = await async_playwright().start()
    
    # Use headless mode based on environment
    headless = os.getenv('HEADLESS', 'false').lower() == 'true'
    
    # Use persistent context to save login session
    user_data_dir = os.getenv('USER_DATA_DIR', '/root/arti-marketing-ops/spotify_scraper/data/browser_data')
    os.makedirs(user_data_dir, exist_ok=True)
    
    logger.info(f"Browser data directory: {user_data_dir}")
    
    # Launch with persistent context (maintains session across runs)
    context = await playwright.chromium.launch_persistent_context(
        user_data_dir=user_data_dir,
        headless=headless,
        args=[
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu'
        ]
    )
    page = context.pages[0] if context.pages else await context.new_page()
    
    success_count = 0
    failure_count = 0
    
    try:
        # Check if we already have a valid session
        already_logged_in = await check_if_logged_in(page)
        
        if not already_logged_in:
            # Need to perform fresh login
            logger.info("Performing fresh login...")
            login_success = await login_to_spotify(page, force_fresh=True)
            
            if not login_success:
                logger.error("✗ Login failed, aborting scraper")
                return False
        
        logger.info("✓ Authentication verified, ready to scrape")
        
        logger.info("")
        logger.info(f"Starting to scrape {len(campaigns)} campaigns...")
        logger.info("")
        
        # Create Spotify page helper
        spotify_page = SpotifyArtistsPage(page)
        
        # Scrape each campaign
        for i, campaign in enumerate(campaigns, 1):
            logger.info(f"[{i}/{len(campaigns)}] Processing campaign {campaign['id']}")
            
            # Scrape data with automatic re-login on session expiry
            data = None
            retry_count = 0
            max_retries = 2
            
            while retry_count < max_retries and not data:
                try:
                    data = await scrape_campaign(page, spotify_page, campaign)
                    
                    # Check if we got logged out during scraping
                    if not data:
                        current_url = page.url
                        if 'login' in current_url.lower() or 'challenge' in current_url.lower():
                            logger.warning(f"[{campaign['id']}] Session expired during scraping, attempting re-login...")
                            retry_count += 1
                            
                            # Attempt re-login
                            if await login_to_spotify(page, force_fresh=True):
                                logger.info(f"[{campaign['id']}] Re-login successful, retrying campaign...")
                                continue
                            else:
                                logger.error(f"[{campaign['id']}] Re-login failed, skipping campaign")
                                break
                        else:
                            # Data is None but not due to logout - skip campaign
                            break
                            
                except Exception as e:
                    logger.error(f"[{campaign['id']}] Error during scrape: {e}")
                    retry_count += 1
                    if retry_count < max_retries:
                        logger.info(f"[{campaign['id']}] Retrying... ({retry_count}/{max_retries})")
                        await asyncio.sleep(5)
                    else:
                        logger.error(f"[{campaign['id']}] Max retries reached, skipping")
                        break
            
            if data:
                # Update raw data in spotify_campaigns table
                if await update_campaign_in_database(campaign['id'], data):
                    scrape_data = data.get('scrape_data', {})
                    
                    # FIX #1: Save historical data to scraped_data table
                    await save_to_scraped_data_table(campaign, scrape_data)
                    
                    # FIX #2: Sync playlist data to campaign_playlists for UI (with algorithmic detection)
                    if await sync_to_campaign_playlists(campaign['id'], scrape_data):
                        success_count += 1
                    else:
                        # Raw data saved but sync failed - partial success
                        logger.warning(f"[{campaign['id']}] Raw data saved but playlist sync failed")
                        success_count += 1  # Still count as success
                else:
                    failure_count += 1
            else:
                failure_count += 1
            
            logger.info("")
            
            # Small delay between campaigns to avoid rate limiting
            if i < len(campaigns):
                await asyncio.sleep(2)
        
    finally:
        # Cleanup
        await browser.close()
        await playwright.stop()
    
    # Summary
    logger.info("="*60)
    logger.info("SCRAPING COMPLETE")
    logger.info("="*60)
    logger.info(f"Total campaigns: {len(campaigns)}")
    logger.info(f"Successful: {success_count}")
    logger.info(f"Failed: {failure_count}")
    logger.info(f"Success rate: {(success_count/len(campaigns)*100):.1f}%")
    logger.info("")
    
    return success_count > 0


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Spotify for Artists Production Scraper')
    parser.add_argument('--limit', type=int, help='Limit number of campaigns to scrape (for testing)')
    args = parser.parse_args()
    
    success = asyncio.run(main(limit=args.limit))
    sys.exit(0 if success else 1)
