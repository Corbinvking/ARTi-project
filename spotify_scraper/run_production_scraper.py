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

# Error log setup
error_handler = logging.FileHandler(Path(__file__).parent / 'logs' / 'errors.log')
error_handler.setLevel(logging.ERROR)
error_logger = logging.getLogger('errors')
error_logger.addHandler(error_handler)


def check_api_health():
    """Check if Supabase API is reachable before starting scrape"""
    try:
        logger.info("Running API health check...")
        headers = {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}'
        }
        
        # Simple health check endpoint
        url = f"{SUPABASE_URL}/rest/v1/"
        response = requests.get(url, headers=headers, timeout=10)
        
        # Check if we got HTML instead of JSON (Cloudflare error)
        content_type = response.headers.get('Content-Type', '')
        if 'text/html' in content_type:
            logger.error(f"❌ API health check failed: Received HTML instead of JSON (likely Cloudflare error)")
            logger.error(f"Response preview: {response.text[:200]}")
            return False
        
        if response.status_code == 200:
            logger.info("✅ API health check passed")
            return True
        else:
            logger.error(f"❌ API health check failed: Status {response.status_code}")
            return False
            
    except requests.exceptions.Timeout:
        logger.error("❌ API health check failed: Connection timeout")
        return False
    except requests.exceptions.ConnectionError:
        logger.error("❌ API health check failed: Cannot connect to API")
        return False
    except Exception as e:
        logger.error(f"❌ API health check failed: {e}")
        return False


def fetch_campaigns_with_retry(url, headers, params, max_retries=3):
    """Fetch campaigns with retry logic and exponential backoff"""
    import time
    
    for attempt in range(max_retries):
        try:
            logger.info(f"Fetching campaigns (attempt {attempt + 1}/{max_retries})...")
            response = requests.get(url, headers=headers, params=params, timeout=30)
            
            # Check if we got HTML instead of JSON (Cloudflare error)
            content_type = response.headers.get('Content-Type', '')
            if 'text/html' in content_type:
                logger.error(f"Received HTML instead of JSON (likely Cloudflare error)")
                logger.error(f"Response preview: {response.text[:300]}")
                
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt * 60  # 1min, 2min, 4min
                    logger.warning(f"⏳ Retrying in {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                    time.sleep(wait_time)
                    continue
                else:
                    logger.error("❌ Max retries exceeded. API is not responding with valid JSON.")
                    return None
            
            # Check status code
            if response.status_code != 200:
                logger.error(f"API returned status {response.status_code}")
                logger.error(f"Response: {response.text[:300]}")
                
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt * 60
                    logger.warning(f"⏳ Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                else:
                    logger.error("❌ Max retries exceeded")
                    return None
            
            # Success!
            data = response.json()
            logger.info(f"✅ Successfully fetched {len(data)} campaigns")
            return data
            
        except requests.exceptions.Timeout:
            logger.error(f"Request timeout (attempt {attempt + 1}/{max_retries})")
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt * 60
                logger.warning(f"⏳ Retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                logger.error("❌ Max retries exceeded")
                return None
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt * 60
                logger.warning(f"⏳ Retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                logger.error("❌ Max retries exceeded")
                return None
    
    return None


def send_alert_email(subject, body):
    """Send email alert on critical failure"""
    try:
        import smtplib
        from email.message import EmailMessage
        
        # Get email config from environment
        alert_email = os.getenv('ALERT_EMAIL', 'admin@artistinfluence.com')
        
        msg = EmailMessage()
        msg['Subject'] = f"[Spotify Scraper Alert] {subject}"
        msg['From'] = 'scraper@artistinfluence.com'
        msg['To'] = alert_email
        msg.set_content(body)
        
        # Use server's sendmail
        with smtplib.SMTP('localhost') as smtp:
            smtp.send_message(msg)
            
        logger.info(f"✅ Alert email sent to {alert_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send alert email: {e}")
        return False


def log_scraper_run(status, campaigns_total=0, campaigns_success=0, campaigns_failed=0, error_message=None):
    """Log scraper run status to a dedicated status file"""
    import json
    
    log_entry = {
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'status': status,  # 'success', 'partial', 'failed', 'no_api'
        'campaigns_total': campaigns_total,
        'campaigns_success': campaigns_success,
        'campaigns_failed': campaigns_failed,
        'error_message': error_message
    }
    
    status_file = Path(__file__).parent / 'logs' / 'status.jsonl'
    status_file.parent.mkdir(exist_ok=True)
    
    with open(status_file, 'a') as f:
        f.write(json.dumps(log_entry) + '\n')
    
    logger.info(f"📊 Run status logged: {status}")


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
    
    # Take screenshot for debugging
    try:
        await page.screenshot(path='/root/arti-marketing-ops/spotify_scraper/logs/login_step1_landing.png')
        logger.info("  Screenshot saved: login_step1_landing.png")
    except Exception as e:
        logger.warning(f"  Could not save screenshot: {e}")
    
    # Click Login button
    logger.info("  Looking for Login button...")
    login_btn = page.locator('button:has-text("Log in")')
    login_count = await login_btn.count()
    logger.info(f"  Found {login_count} Login button(s)")
    if login_count > 0:
        await login_btn.first.click()
        await asyncio.sleep(3)
    else:
        # Try alternative selectors
        alt_login = page.locator('a:has-text("Log in"), [data-testid="login-button"]')
        if await alt_login.count() > 0:
            await alt_login.first.click()
            await asyncio.sleep(3)
    
    # Take screenshot after login button click
    try:
        await page.screenshot(path='/root/arti-marketing-ops/spotify_scraper/logs/login_step2_email.png')
        logger.info("  Screenshot saved: login_step2_email.png")
    except Exception as e:
        logger.warning(f"  Could not save screenshot: {e}")
    
    # Wait for and enter email
    logger.info("  Waiting for email input...")
    try:
        email_input = page.locator('input[type="text"], input[id="login-username"], input[name="username"]')
        await email_input.first.wait_for(timeout=10000)
        logger.info("  Entering email...")
        await email_input.first.fill(SPOTIFY_EMAIL)
        await asyncio.sleep(1)
    except Exception as e:
        logger.error(f"  Failed to find email input: {e}")
        await page.screenshot(path='/root/arti-marketing-ops/spotify_scraper/logs/login_error_email.png')
        return False
    
    # Click Continue/Next button
    logger.info("  Looking for Continue button...")
    continue_btn = page.locator('button:has-text("Continue"), button:has-text("Next"), button[data-testid="login-button"]')
    continue_count = await continue_btn.count()
    logger.info(f"  Found {continue_count} Continue button(s)")
    if continue_count > 0:
        await continue_btn.first.click()
        await asyncio.sleep(5)
    
    # Take screenshot after Continue
    try:
        await page.screenshot(path='/root/arti-marketing-ops/spotify_scraper/logs/login_step3_method.png')
        logger.info("  Screenshot saved: login_step3_method.png")
    except Exception as e:
        logger.warning(f"  Could not save screenshot: {e}")
    
    # Check if password input is already visible (some flows skip the method selection)
    password_input = page.locator('input[type="password"]')
    if await password_input.count() > 0:
        logger.info("  Password input already visible - skipping method selection")
    else:
        # Click "Log in with a password" if present
        logger.info("  Looking for 'Log in with a password' option...")
        password_option = page.locator('button:has-text("Log in with a password"), button:has-text("Log in with password"), a:has-text("Log in with a password")')
        password_option_count = await password_option.count()
        logger.info(f"  Found {password_option_count} password option button(s)")
        
        if password_option_count > 0:
            await password_option.first.click()
            await asyncio.sleep(3)
        else:
            # Log the page content for debugging
            logger.warning("  Could not find password option button!")
            try:
                await page.screenshot(path='/root/arti-marketing-ops/spotify_scraper/logs/login_error_no_password_option.png')
                logger.info("  Screenshot saved: login_error_no_password_option.png")
                # Log visible buttons
                buttons = await page.locator('button').all_text_contents()
                logger.info(f"  Visible buttons on page: {buttons[:10]}")
            except Exception as e:
                logger.warning(f"  Could not log debug info: {e}")
    
    # Wait for password input and enter password
    logger.info("  Waiting for password input...")
    try:
        password_input = page.locator('input[type="password"]')
        await password_input.wait_for(timeout=15000)
        logger.info("  Entering password...")
        await password_input.fill(SPOTIFY_PASSWORD)
        await asyncio.sleep(1)
    except Exception as e:
        logger.error(f"  Failed to find password input: {e}")
        await page.screenshot(path='/root/arti-marketing-ops/spotify_scraper/logs/login_error_password.png')
        return False
    
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
    
    # Use retry logic with exponential backoff
    campaigns = fetch_campaigns_with_retry(url, headers, params, max_retries=3)
    
    if campaigns is None:
        logger.error("❌ FATAL: Could not fetch campaigns from database after retries")
        error_logger.error("Failed to fetch campaigns - API unreachable")
        return None
    
    if len(campaigns) == 0:
        logger.warning("⚠️  No campaigns found with valid SFA URLs")
    else:
        logger.info(f"✅ Found {len(campaigns)} campaigns with SFA URLs")
    
    return campaigns


async def scrape_campaign(page, spotify_page, campaign):
    """Scrape data for a single campaign"""
    campaign_id = campaign['id']
    campaign_name = campaign['campaign']
    sfa_url = campaign['sfa']
    
    logger.info(f"[{campaign_id}] Scraping: {campaign_name}")
    
    try:
        # Check if page is still alive
        if page.is_closed():
            logger.error(f"[{campaign_id}] Page is closed! Cannot scrape.")
            return None
        
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


def get_directory_size(path):
    """Get total size of directory in bytes"""
    import shutil
    total_size = 0
    for dirpath, dirnames, filenames in os.walk(path):
        for filename in filenames:
            filepath = os.path.join(dirpath, filename)
            try:
                total_size += os.path.getsize(filepath)
            except (OSError, FileNotFoundError):
                pass
    return total_size


def clear_browser_data_if_needed(user_data_dir, max_size_mb=500):
    """Clear browser data if it exceeds the maximum size"""
    import shutil
    
    if not os.path.exists(user_data_dir):
        return False
    
    size_bytes = get_directory_size(user_data_dir)
    size_mb = size_bytes / (1024 * 1024)
    
    if size_mb > max_size_mb:
        logger.warning(f"⚠️  Browser data directory is {size_mb:.1f}MB (limit: {max_size_mb}MB)")
        logger.info("🧹 Clearing browser data to prevent crashes...")
        try:
            shutil.rmtree(user_data_dir)
            os.makedirs(user_data_dir, exist_ok=True)
            logger.info("✅ Browser data cleared successfully")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to clear browser data: {e}")
            return False
    else:
        logger.info(f"Browser data size: {size_mb:.1f}MB (limit: {max_size_mb}MB) - OK")
        return False


async def launch_browser_context(playwright, user_data_dir, headless):
    """Launch a fresh browser context with all stability args"""
    # Launch with persistent context (maintains session across runs)
    context = await playwright.chromium.launch_persistent_context(
        user_data_dir=user_data_dir,
        headless=headless,
        args=[
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',  # Prevents running out of shared memory
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-extensions',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-breakpad',
            '--disable-component-extensions-with-background-pages',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--disable-renderer-backgrounding',
            '--force-color-profile=srgb',
            '--metrics-recording-only',
            '--no-first-run',
            '--password-store=basic',
            '--use-mock-keychain',
            '--disable-hang-monitor',  # Prevent browser from self-terminating
            '--single-process',  # Use single process to reduce memory
            '--disable-features=site-per-process',  # Reduce process spawning
        ],
        # Add timeout to prevent hanging
        timeout=60000
    )
    return context


async def process_batch(campaigns, batch_num, total_batches, user_data_dir, headless):
    """Process a batch of campaigns with a fresh browser instance"""
    logger.info("")
    logger.info("="*60)
    logger.info(f"BATCH {batch_num}/{total_batches} - Processing {len(campaigns)} campaigns")
    logger.info("="*60)
    
    success_count = 0
    failure_count = 0
    
    # Launch fresh browser for this batch
    playwright = await async_playwright().start()
    
    try:
        context = await launch_browser_context(playwright, user_data_dir, headless)
        page = context.pages[0] if context.pages else await context.new_page()
        
        # Check if we already have a valid session
        already_logged_in = await check_if_logged_in(page)
        
        if not already_logged_in:
            # Need to perform fresh login
            logger.info("Performing fresh login for this batch...")
            login_success = await login_to_spotify(page, force_fresh=True)
            
            if not login_success:
                logger.error("✗ Login failed for this batch")
                return 0, len(campaigns)  # All campaigns in batch failed
        
        logger.info("✓ Authentication verified, ready to scrape batch")
        
        # Create Spotify page helper
        spotify_page = SpotifyArtistsPage(page)
        
        # Scrape each campaign in this batch
        for i, campaign in enumerate(campaigns, 1):
            logger.info(f"[Batch {batch_num}: {i}/{len(campaigns)}] Processing campaign {campaign['id']}")
            
            # CRITICAL: Check if browser is still alive before each campaign
            try:
                if context.pages:
                    test_page = context.pages[0]
                    if test_page.is_closed():
                        logger.error(f"⚠️  Browser context died! Breaking batch...")
                        raise Exception("Browser context closed unexpectedly")
                else:
                    logger.error(f"⚠️  No pages in context! Browser may have crashed.")
                    raise Exception("No pages in browser context")
            except Exception as browser_check_error:
                logger.error(f"❌ Browser health check failed: {browser_check_error}")
                # Log remaining campaigns in batch as failed
                failure_count += len(campaigns) - i + 1
                break
            
            # Scrape data with automatic re-login on session expiry
            data = None
            retry_count = 0
            max_retries = 2
            
            while retry_count < max_retries and not data:
                try:
                    data = await scrape_campaign(page, spotify_page, campaign)
                    
                    if not data:
                        current_url = page.url
                        if 'login' in current_url.lower() or 'challenge' in current_url.lower():
                            logger.warning(f"[{campaign['id']}] Session expired, attempting re-login...")
                            retry_count += 1
                            if await login_to_spotify(page, force_fresh=True):
                                continue
                            else:
                                break
                        else:
                            break
                            
                except Exception as e:
                    logger.error(f"[{campaign['id']}] Error during scrape: {e}")
                    retry_count += 1
                    if retry_count < max_retries:
                        await asyncio.sleep(5)
                    else:
                        break
            
            if data:
                if await update_campaign_in_database(campaign['id'], data):
                    scrape_data = data.get('scrape_data', {})
                    await save_to_scraped_data_table(campaign, scrape_data)
                    if await sync_to_campaign_playlists(campaign['id'], scrape_data):
                        success_count += 1
                    else:
                        success_count += 1  # Still count as success
                else:
                    failure_count += 1
            else:
                failure_count += 1
            
            logger.info("")
            
            if i < len(campaigns):
                await asyncio.sleep(2)
        
    finally:
        # Always cleanup browser
        try:
            await context.close()
        except:
            pass
        await playwright.stop()
    
    logger.info(f"Batch {batch_num} complete: {success_count} success, {failure_count} failed")
    return success_count, failure_count


async def main(limit=None):
    """Main scraper execution with batch processing to prevent browser crashes"""
    
    # Configuration for batch processing
    BATCH_SIZE = 15  # Process 15 campaigns per browser instance
    MAX_BROWSER_DATA_MB = 500  # Clear browser data if larger than 500MB
    
    logger.info("="*60)
    logger.info("SPOTIFY FOR ARTISTS PRODUCTION SCRAPER")
    logger.info("(Batch Processing Mode - Browser Restarts Every 15 Campaigns)")
    logger.info("="*60)
    logger.info(f"Supabase URL: {SUPABASE_URL}")
    logger.info(f"Spotify Email: {SPOTIFY_EMAIL}")
    logger.info(f"Batch Size: {BATCH_SIZE} campaigns per browser instance")
    logger.info(f"Limit: {limit if limit else 'No limit (all campaigns)'}")
    logger.info("")
    
    # Validate credentials
    if not SPOTIFY_EMAIL or not SPOTIFY_PASSWORD:
        logger.error("SPOTIFY_EMAIL and SPOTIFY_PASSWORD must be set in .env")
        log_scraper_run('failed', error_message='Missing Spotify credentials')
        return False
    
    if not SUPABASE_SERVICE_ROLE_KEY:
        logger.error("SUPABASE_SERVICE_ROLE_KEY must be set in .env")
        log_scraper_run('failed', error_message='Missing Supabase key')
        return False
    
    # FAILSAFE: Pre-flight API health check
    logger.info("")
    if not check_api_health():
        logger.error("🚨 CRITICAL: API is not reachable. Aborting scraper run.")
        error_message = "API health check failed - cannot reach Supabase"
        log_scraper_run('no_api', error_message=error_message)
        
        send_alert_email(
            "Scraper Failed - API Unreachable",
            f"Timestamp: {datetime.now(timezone.utc).isoformat()}\n"
            f"Error: {error_message}\n"
            f"The scraper could not reach the Supabase API.\n"
            f"Please check if the API is down or if there are network issues."
        )
        return False
    
    logger.info("")
    
    # Fetch campaigns from database (with retry logic)
    campaigns = await fetch_campaigns_from_database(limit=limit)
    
    if campaigns is None:
        logger.error("🚨 FATAL: Could not connect to API after multiple retries")
        error_message = "Failed to fetch campaigns - API connection failed"
        log_scraper_run('no_api', error_message=error_message)
        
        send_alert_email(
            "Scraper Failed - API Connection Error",
            f"Timestamp: {datetime.now(timezone.utc).isoformat()}\n"
            f"Error: {error_message}\n"
            f"The scraper could not fetch campaigns after 3 retry attempts.\n"
            f"Check API logs and server status."
        )
        return False
    elif len(campaigns) == 0:
        logger.warning("⚠️  No campaigns to scrape (no valid SFA URLs found)")
        log_scraper_run('success', campaigns_total=0, campaigns_success=0)
        return True
    
    logger.info(f"✅ Found {len(campaigns)} campaigns to scrape")
    logger.info("")
    
    # Use headless mode based on environment
    headless = os.getenv('HEADLESS', 'false').lower() == 'true'
    
    # Browser data directory
    user_data_dir = os.getenv('USER_DATA_DIR', '/root/arti-marketing-ops/spotify_scraper/data/browser_data')
    os.makedirs(user_data_dir, exist_ok=True)
    
    logger.info(f"Browser data directory: {user_data_dir}")
    
    # CRASH PREVENTION: Clear browser data if it's too large
    clear_browser_data_if_needed(user_data_dir, MAX_BROWSER_DATA_MB)
    
    # Calculate batches
    total_campaigns = len(campaigns)
    total_batches = (total_campaigns + BATCH_SIZE - 1) // BATCH_SIZE
    
    logger.info(f"")
    logger.info(f"📦 Will process {total_campaigns} campaigns in {total_batches} batches")
    logger.info(f"   Each batch gets a fresh browser to prevent memory issues")
    logger.info(f"")
    
    total_success = 0
    total_failure = 0
    
    # Process campaigns in batches
    for batch_num in range(1, total_batches + 1):
        batch_start = (batch_num - 1) * BATCH_SIZE
        batch_end = min(batch_start + BATCH_SIZE, total_campaigns)
        batch_campaigns = campaigns[batch_start:batch_end]
        
        # Process this batch with a fresh browser
        success, failure = await process_batch(
            batch_campaigns, 
            batch_num, 
            total_batches, 
            user_data_dir, 
            headless
        )
        
        total_success += success
        total_failure += failure
        
        # Brief pause between batches to let memory settle
        if batch_num < total_batches:
            logger.info(f"⏸️  Pausing 5 seconds before next batch...")
            await asyncio.sleep(5)
            
            # Check if browser data needs clearing between batches
            clear_browser_data_if_needed(user_data_dir, MAX_BROWSER_DATA_MB)
    
    # Summary
    logger.info("")
    logger.info("="*60)
    logger.info("SCRAPING COMPLETE")
    logger.info("="*60)
    logger.info(f"Total campaigns: {total_campaigns}")
    logger.info(f"Total batches: {total_batches}")
    logger.info(f"Successful: {total_success}")
    logger.info(f"Failed: {total_failure}")
    success_rate = (total_success / total_campaigns * 100) if total_campaigns > 0 else 0
    logger.info(f"Success rate: {success_rate:.1f}%")
    logger.info("")
    
    # FAILSAFE: Log run status
    if total_success == total_campaigns:
        status = 'success'
        logger.info("✅ All campaigns scraped successfully")
    elif total_success > 0:
        status = 'partial'
        logger.warning(f"⚠️  Partial success: {total_failure} campaigns failed")
    else:
        status = 'failed'
        logger.error("❌ All campaigns failed")
        
        send_alert_email(
            "Scraper Failed - All Campaigns Failed",
            f"Timestamp: {datetime.now(timezone.utc).isoformat()}\n"
            f"Total campaigns: {total_campaigns}\n"
            f"All {total_campaigns} campaigns failed to scrape.\n"
            f"Check logs for details: /root/arti-marketing-ops/spotify_scraper/logs/production.log"
        )
    
    log_scraper_run(
        status=status,
        campaigns_total=total_campaigns,
        campaigns_success=total_success,
        campaigns_failed=total_failure
    )
    
    return total_success > 0


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Spotify for Artists Production Scraper')
    parser.add_argument('--limit', type=int, help='Limit number of campaigns to scrape (for testing)')
    args = parser.parse_args()
    
    success = asyncio.run(main(limit=args.limit))
    sys.exit(0 if success else 1)
