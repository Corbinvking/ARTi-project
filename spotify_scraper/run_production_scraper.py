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


async def login_to_spotify(page):
    """Perform fresh login to Spotify for Artists"""
    logger.info("Starting fresh login to Spotify for Artists...")
    
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
    
    # Wait a bit longer to ensure cookies are fully set
    await asyncio.sleep(2)
    
    logger.info("✓ Login successful!")
    return True


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


async def sync_to_campaign_playlists(campaign_id, scrape_data):
    """
    Bridge function: Sync scraped playlist data to campaign_playlists table
    This keeps the UI working with existing queries while storing raw data in spotify_campaigns
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
        
        # Insert new playlist data
        playlist_records = []
        for playlist_data in playlists_by_id.values():
            record = {
                'campaign_id': campaign_id,
                'playlist_name': playlist_data['playlist_name'],
                'streams_24h': playlist_data['streams_24h'],
                'streams_7d': playlist_data['streams_7d'],
                'streams_28d': playlist_data['streams_28d'],
            }
            playlist_records.append(record)
        
        # Batch insert
        insert_url = f"{SUPABASE_URL}/rest/v1/campaign_playlists"
        insert_response = requests.post(insert_url, headers=headers, json=playlist_records)
        
        if insert_response.status_code not in [200, 201]:
            logger.error(f"[{campaign_id}] Failed to sync playlists: {insert_response.status_code} - {insert_response.text}")
            return False
        
        logger.info(f"[{campaign_id}] ✓ Synced {len(playlist_records)} playlists to campaign_playlists")
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
    
    # Initialize browser (fresh incognito context)
    logger.info("Initializing browser...")
    playwright = await async_playwright().start()
    
    # Use headless mode based on environment
    headless = os.getenv('HEADLESS', 'false').lower() == 'true'
    browser = await playwright.chromium.launch(headless=headless)
    context = await browser.new_context()  # Fresh context = incognito
    page = await context.new_page()
    
    success_count = 0
    failure_count = 0
    
    try:
        # Login once at the beginning
        if not await login_to_spotify(page):
            logger.error("Login failed, aborting")
            return False
        
        # Verify we have the sp_dc cookie
        cookies = await context.cookies()
        has_sp_dc = any(c['name'] == 'sp_dc' for c in cookies)
        if not has_sp_dc:
            logger.error("sp_dc cookie not found, aborting")
            return False
        
        logger.info("")
        logger.info(f"Starting to scrape {len(campaigns)} campaigns...")
        logger.info("")
        
        # Create Spotify page helper
        spotify_page = SpotifyArtistsPage(page)
        
        # Scrape each campaign
        for i, campaign in enumerate(campaigns, 1):
            logger.info(f"[{i}/{len(campaigns)}] Processing campaign {campaign['id']}")
            
            # Scrape data
            data = await scrape_campaign(page, spotify_page, campaign)
            
            if data:
                # Update raw data in spotify_campaigns table
                if await update_campaign_in_database(campaign['id'], data):
                    # Bridge: Sync playlist data to campaign_playlists for UI
                    scrape_data = data.get('scrape_data', {})
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
