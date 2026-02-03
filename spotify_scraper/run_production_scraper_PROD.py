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
import re
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
from app.pages.spotify_artists import SpotifyArtistsPage, SessionExpiredError

# Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://api.artistinfluence.com')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
SPOTIFY_EMAIL = os.getenv('SPOTIFY_EMAIL')
SPOTIFY_PASSWORD = os.getenv('SPOTIFY_PASSWORD')
MANUAL_LOGIN_TIMEOUT_MINUTES = int(os.getenv('MANUAL_LOGIN_TIMEOUT_MINUTES', '10'))

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
    """Check if already logged in from previous session.
    
    IMPORTANT: This function TRUSTS the URL-based detection.
    If we're on the dashboard, we're logged in - period.
    We do NOT check for sp_dc cookie because:
    1. The cookie may be HttpOnly and not visible to Playwright
    2. Session can be valid even without visible cookie
    3. Forcing re-login triggers bot detection
    """
    try:
        logger.info("Checking for existing session...")
        await page.goto('https://artists.spotify.com', timeout=30000, wait_until='domcontentloaded')
        await asyncio.sleep(5)  # Give time for redirects
        
        # Check current URL after redirects
        current_url = page.url
        logger.info(f"Current URL: {current_url}")
        
        # FIRST: Check if we're on the login page (definitely not logged in)
        if 'accounts.spotify.com' in current_url or 'login' in current_url.lower():
            logger.info("Redirected to login page - not logged in")
            return False
        
        # SECOND: Check if we're on the dashboard - TRUST THE URL COMPLETELY
        # Dashboard URLs like /c/roster, /home, /c/artist etc. mean we're logged in
        # DO NOT check for cookies - this causes bot detection when we try to re-login
        dashboard_patterns = [
            'artists.spotify.com/c/',
            'artists.spotify.com/home',
            'artists.spotify.com/roster',
            'artists.spotify.com/team',
            'artists.spotify.com/profile',
        ]
        
        for pattern in dashboard_patterns:
            if pattern in current_url:
                logger.info("✓ Existing session found! Already logged in.")
                logger.info(f"✓ On S4A dashboard ({pattern}) - session is valid")
                # Verify session by attempting to access an authenticated route
                try:
                    await page.goto('https://artists.spotify.com/c/roster', timeout=15000, wait_until='domcontentloaded')
                    await asyncio.sleep(2)
                    if 'accounts.spotify.com' in page.url or 'login' in page.url.lower():
                        logger.warning("Session check failed: redirected to login from /c/roster")
                        return False
                except Exception as e:
                    logger.warning(f"Session check encountered an error: {e}")
                return True
        
        # THIRD: Check if we got redirected to any artists.spotify.com page that's not login
        if 'artists.spotify.com' in current_url and 'login' not in current_url.lower():
            # Check if there's a login button visible (indicates landing page, not logged in)
            try:
                login_btn = page.locator('button:has-text("Log in"), a:has-text("Log in")')
                if await login_btn.count() > 0 and await login_btn.first.is_visible():
                    logger.info("On landing page with login button - not logged in")
                    return False
            except:
                pass
            
            # If no login button, we might be logged in
            logger.info("✓ On S4A site without login prompt - assuming logged in")
            return True
        
        # FOURTH: Only check for login form if we're on an ambiguous URL
        try:
            login_form = page.locator('form[action*="login"], input[id="login-username"], input[autocomplete="username"]')
            if await login_form.count() > 0:
                is_visible = await login_form.first.is_visible()
                if is_visible:
                    logger.info("Login form detected - not logged in")
                    return False
        except:
            pass
        
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
    
    # Check if we're already on the login page
    current_url = page.url
    if 'accounts.spotify.com' in current_url or 'login' in current_url.lower():
        logger.info("Already on login page - proceeding directly to email entry...")
    else:
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
    
    # Let the method selection page fully render (password option can appear after JS)
    await asyncio.sleep(3)
    
    # Check if password input is already visible (some flows skip the method selection)
    password_input = page.locator('input[type="password"]')
    password_input_visible = False
    if await password_input.count() > 0:
        password_input_visible = await password_input.first.is_visible()
    if password_input_visible:
        logger.info("  Password input already visible - skipping method selection")
    else:
        # Spotify's new login flow (2025+): After email + Continue, shows "login code" page by default.
        # The "Log in with password" link appears BELOW the code input section.
        # We need to find and click this link to switch to password mode.
        
        logger.info("  Looking for 'Log in with password' link (new login code flow)...")
        
        # Extended selectors for the password option - Spotify now shows it as a link
        password_option_selectors = [
            # New login code flow - password option as link below code section
            'a:has-text("Log in with password")',
            'a:has-text("Log in with a password")',
            'button:has-text("Log in with password")',
            'button:has-text("Log in with a password")',
            # Alternative text variations
            'a:has-text("Use password")',
            'a:has-text("Use password instead")',
            'button:has-text("Use password")',
            'button:has-text("Use password instead")',
            # Span/div based links
            'span:has-text("Log in with password")',
            '[role="link"]:has-text("password")',
            # Data-testid selectors
            '[data-testid="login-password-button"]',
            '[data-testid="login-password"]',
            '[data-testid*="password-login"]',
            # Generic clickable elements with password text
            '[class*="link"]:has-text("password")',
        ]
        
        password_option_clicked = False
        for selector in password_option_selectors:
            try:
                password_option = page.locator(selector)
                count = await password_option.count()
                if count > 0:
                    # Check if it's visible
                    is_visible = await password_option.first.is_visible()
                    if is_visible:
                        await password_option.first.click()
                        logger.info(f"  Found and clicked password option: {selector}")
                        password_option_clicked = True
                        await asyncio.sleep(3)
                        break
            except Exception as e:
                logger.debug(f"  Selector {selector} failed: {e}")
                continue
        
        if not password_option_clicked:
            logger.info(f"  Found {await password_option.count() if 'password_option' in dir() else 0} password option button(s)")
            logger.warning("  Could not find password option button!")
            
            # Take screenshot and log page state for debugging
            try:
                await page.screenshot(path='/root/arti-marketing-ops/spotify_scraper/logs/login_error_no_password_option.png')
                
                # Log all visible buttons
                buttons = await page.locator('button').all_text_contents()
                logger.info(f"  Visible buttons on page: {[b.strip() for b in buttons if b.strip()][:10]}")
                
                # Log all visible links
                links = await page.locator('a').all_text_contents()
                logger.info(f"  Visible links on page: {[l.strip() for l in links if l.strip()][:15]}")
                
                # Log any clickable elements with "password" text
                pwd_elements = page.locator('*:has-text("password")')
                pwd_count = await pwd_elements.count()
                logger.info(f"  Elements containing 'password' text: {pwd_count}")
                
            except Exception as e:
                logger.warning(f"  Debug info failed: {e}")
        
        # Re-check password visibility after clicking password option
        password_input = page.locator('input[type="password"]')
        if await password_input.count() > 0:
            password_input_visible = await password_input.first.is_visible()
        
        if not password_input_visible:
            # Try clicking Continue again in case password field appears after
            logger.info("  Password input not visible yet - trying Continue/Next...")
            method_continue = page.locator('button:has-text("Continue"), button:has-text("Next"), button[type="submit"], button[data-testid="login-button"]')
            if await method_continue.count() > 0:
                await method_continue.first.click()
                await asyncio.sleep(4)
            
            # Check again for password option after Continue
            for selector in password_option_selectors[:6]:  # Try top selectors again
                try:
                    password_option = page.locator(selector)
                    if await password_option.count() > 0 and await password_option.first.is_visible():
                        await password_option.first.click()
                        logger.info(f"  Clicked password option after Continue: {selector}")
                        await asyncio.sleep(3)
                        break
                except Exception:
                    continue

    # Fallback: if password input still not visible, go directly to accounts login
    password_input = page.locator('input[type="password"]')
    password_input_visible = False
    if await password_input.count() > 0:
        password_input_visible = await password_input.first.is_visible()
    if not password_input_visible:
        logger.warning("  No password input after method selection - trying direct accounts login...")
        try:
            await page.goto(
                'https://accounts.spotify.com/en/login?continue=https%3A%2F%2Fartists.spotify.com%2F',
                wait_until='domcontentloaded'
            )
            await asyncio.sleep(3)
            await page.screenshot(path='/root/arti-marketing-ops/spotify_scraper/logs/login_step_accounts.png')
            logger.info("  Screenshot saved: login_step_accounts.png")
            # Fill username if present on accounts page
            username_input = page.locator('input#login-username, input[name="username"], input[type="email"], input[type="text"]')
            username_count = await username_input.count()
            logger.info(f"  Accounts page username inputs found: {username_count}")
            if username_count > 0:
                await username_input.first.fill(SPOTIFY_EMAIL)
                logger.info("  Filled email on accounts page")
                await asyncio.sleep(1)
                # Some accounts flows require an extra Continue click before password
                password_input = page.locator(
                    'input[type="password"], input[name="password"], input#login-password, input[placeholder*="password" i]'
                )
                password_visible = False
                if await password_input.count() > 0:
                    password_visible = await password_input.first.is_visible()
                logger.info(f"  Password visible after email fill: {password_visible}")
                if not password_visible:
                    continue_btn = page.locator(
                        'button:has-text("Continue"), button:has-text("Next"), button[type="submit"], button[data-testid="login-button"]'
                    )
                    continue_count = await continue_btn.count()
                    logger.info(f"  Continue buttons found: {continue_count}")
                    if continue_count > 0:
                        await continue_btn.first.click()
                        logger.info("  Clicked Continue on accounts page")
                        await asyncio.sleep(5)
                        await page.screenshot(path='/root/arti-marketing-ops/spotify_scraper/logs/login_step_accounts_after_continue.png')
                        logger.info("  Screenshot saved: login_step_accounts_after_continue.png")
                        await asyncio.sleep(3)  # Let method selection render
                        # Try same password-option selectors as main flow (updated for 2025+ login code flow)
                        password_option_selectors = [
                            'a:has-text("Log in with password")',
                            'a:has-text("Log in with a password")',
                            'button:has-text("Log in with password")',
                            'button:has-text("Log in with a password")',
                            'a:has-text("Use password")',
                            'a:has-text("Use password instead")',
                            'button:has-text("Use password")',
                            'span:has-text("Log in with password")',
                            '[data-testid="login-password-button"]',
                            '[data-testid*="password-login"]',
                        ]
                        
                        password_option_clicked = False
                        for selector in password_option_selectors:
                            try:
                                password_option = page.locator(selector)
                                if await password_option.count() > 0:
                                    is_visible = await password_option.first.is_visible()
                                    if is_visible:
                                        await password_option.first.click()
                                        logger.info(f"  Clicked password option on accounts page: {selector}")
                                        password_option_clicked = True
                                        await asyncio.sleep(3)
                                        break
                            except Exception:
                                continue
                        
                        if not password_option_clicked:
                            # Broad fallback: any clickable with "password" but not "Forgot"
                            try:
                                clickable = page.locator('a, button, [role="button"], span').filter(
                                    has_text=re.compile(r'password', re.I)
                                ).filter(has_not_text=re.compile(r'forgot', re.I)).first
                                await clickable.click(timeout=5000)
                                logger.info("  Clicked password option (broad match)")
                                await asyncio.sleep(3)
                            except Exception as e:
                                logger.debug(f"  Broad password-option click: {e}")
                                
                        try:
                            buttons = await page.locator('button').all_text_contents()
                            logger.info(f"  Buttons after accounts Continue: {[b.strip() for b in buttons if b.strip()][:10]}")
                            links = await page.locator('a').all_text_contents()
                            logger.info(f"  Links after accounts Continue: {[l.strip() for l in links if l.strip()][:15]}")
                        except Exception as e:
                            logger.warning(f"  Debug info failed: {e}")
            else:
                logger.warning("  No username input found on accounts page")
        except Exception as e:
            logger.warning(f"  Could not navigate to accounts login: {e}")
    
    # Wait for password input and enter password
    logger.info("  Waiting for password input...")
    try:
        password_input = page.locator(
            'input[type="password"], input[name="password"], input#login-password, input[placeholder*="password" i]'
        )
        await password_input.first.wait_for(timeout=25000)
        logger.info("  Entering password...")
        await password_input.first.fill(SPOTIFY_PASSWORD)
        await asyncio.sleep(1)
    except Exception as e:
        logger.error(f"  Failed to find password input: {e}")
        await page.screenshot(path='/root/arti-marketing-ops/spotify_scraper/logs/login_error_password.png')
        return False
    
    # Click final Log in button
    logger.info("  Clicking Log in button...")
    login_submit = page.locator('button[data-testid="login-button"], button#login-button, button:has-text("Log in")')
    if await login_submit.count() > 0:
        await login_submit.first.click()
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
        
        for time_range in ['24hour', '7day', '12months']:
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
        stats_12m = song_data['time_ranges']['12months']['stats']
        
        now_iso = datetime.now(timezone.utc).isoformat()
        return {
            'streams_24h': stats_24h.get('streams', 0),
            'streams_7d': stats_7d.get('streams', 0),
            'streams_12m': stats_12m.get('streams', 0),
            'playlists_24h_count': len(stats_24h.get('playlists', [])),
            'playlists_7d_count': len(stats_7d.get('playlists', [])),
            'playlists_12m_count': len(stats_12m.get('playlists', [])),
            'last_scraped_at': now_iso,
            'updated_at': now_iso,  # Also update this so frontend shows correct "last updated" 
            'scrape_data': song_data
        }
        
    except Exception as e:
        logger.error(f"[{campaign_id}] Error: {e}")
        import traceback
        traceback.print_exc()
        return None


async def wait_for_manual_login(page, timeout_seconds=600):
    """Wait for manual login via VNC to complete."""
    logger.warning(f"Waiting up to {timeout_seconds // 60} minutes for manual login via VNC...")
    start_time = asyncio.get_event_loop().time()
    last_log = 0
    while True:
        elapsed = asyncio.get_event_loop().time() - start_time
        if elapsed > timeout_seconds:
            return False
        try:
            current_url = page.url
            if 'accounts.spotify.com' in current_url or 'login' in current_url.lower():
                if elapsed - last_log > 15:
                    logger.info("Still on login page - waiting for manual login...")
                    last_log = elapsed
            elif 'artists.spotify.com' in current_url:
                logger.info(f"Login complete - current URL: {current_url}")
                return True
            else:
                # Nudge to artists.spotify.com to confirm session
                await page.goto('https://artists.spotify.com', timeout=15000, wait_until='domcontentloaded')
                await asyncio.sleep(2)
        except Exception:
            pass
        await asyncio.sleep(5)


async def handle_session_expired(page):
    """Handle session expiry with a manual login wait."""
    logger.error("❌ Session expired - redirected to login")
    logger.error("⚠️  Automated re-login is DISABLED. Please login via VNC to continue.")
    logger.error(f"Waiting for manual login (timeout: {MANUAL_LOGIN_TIMEOUT_MINUTES} minutes)...")
    return await wait_for_manual_login(page, timeout_seconds=MANUAL_LOGIN_TIMEOUT_MINUTES * 60)


async def update_campaign_in_database(campaign_id, data):
    """Update campaign data in spotify_campaigns table (raw data storage)
    
    IMPORTANT: This function now includes safeguards against overwriting
    valid data with zeros when the scraper fails to extract data.
    """
    headers = {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json'
    }
    
    # First, fetch the previous values for trend calculation AND zero-protection
    get_url = f"{SUPABASE_URL}/rest/v1/spotify_campaigns"
    get_params = {'id': f'eq.{campaign_id}', 'select': 'streams_24h,streams_7d,streams_12m'}
    previous_values = {'streams_24h': 0, 'streams_7d': 0, 'streams_12m': 0}
    
    try:
        previous_response = requests.get(get_url, headers=headers, params=get_params)
        if previous_response.status_code == 200 and previous_response.json():
            prev_data = previous_response.json()[0]
            previous_values = {
                'streams_24h': prev_data.get('streams_24h') or 0,
                'streams_7d': prev_data.get('streams_7d') or 0,
                'streams_12m': prev_data.get('streams_12m') or 0
            }
            # Add previous values to scrape_data for trend calculation
            if 'scrape_data' in data and isinstance(data['scrape_data'], dict):
                data['scrape_data']['previous'] = previous_values
                logger.info(f"[{campaign_id}] Stored previous values: 24h={previous_values['streams_24h']}, 7d={previous_values['streams_7d']}, 12m={previous_values['streams_12m']}")
    except Exception as e:
        logger.warning(f"[{campaign_id}] Could not fetch previous values: {e}")
    
    # SAFEGUARD: Don't overwrite non-zero values with zeros
    # This prevents failed scrapes from erasing good data
    data_protected = False
    
    # Check 24h streams
    if data.get('streams_24h') == 0 and previous_values['streams_24h'] > 0:
        logger.warning(f"[{campaign_id}] PROTECTED: Keeping previous 24h streams ({previous_values['streams_24h']}) instead of 0")
        data['streams_24h'] = previous_values['streams_24h']
        data_protected = True
    
    # Check 7d streams
    if data.get('streams_7d') == 0 and previous_values['streams_7d'] > 0:
        logger.warning(f"[{campaign_id}] PROTECTED: Keeping previous 7d streams ({previous_values['streams_7d']}) instead of 0")
        data['streams_7d'] = previous_values['streams_7d']
        data_protected = True
    
    # Check 12m streams
    if data.get('streams_12m') == 0 and previous_values['streams_12m'] > 0:
        logger.warning(f"[{campaign_id}] PROTECTED: Keeping previous 12m streams ({previous_values['streams_12m']}) instead of 0")
        data['streams_12m'] = previous_values['streams_12m']
        data_protected = True
    
    if data_protected:
        logger.warning(f"[{campaign_id}] ⚠️  Zero-protection triggered - this indicates a potential scraping failure")
    
    url = f"{SUPABASE_URL}/rest/v1/spotify_campaigns"
    params = {'id': f'eq.{campaign_id}'}
    
    response = requests.patch(url, headers=headers, params=params, json=data)
    
    if response.status_code not in [200, 204]:
        logger.error(f"[{campaign_id}] Database update failed: {response.status_code} - {response.text}")
        return False
    
    logger.info(f"[{campaign_id}] ✓ Raw data updated in spotify_campaigns (with trend history){' [PROTECTED]' if data_protected else ''}")
    return True


def is_algorithmic_playlist(playlist_name):
    """
    Detect if a playlist is a Spotify algorithmic playlist.
    These are automatically generated by Spotify for users.
    
    IMPORTANT: Uses STRICT EXACT matching ONLY - NO PATTERNS.
    This prevents false positives like "2026 Carnival Soca Mix" being marked algorithmic.
    
    The ONLY 12 algorithmic playlist types (EXACT names):
    1. Radio
    2. Discover Weekly
    3. Your DJ
    4. Mixes
    5. On Repeat
    6. Daylist
    7. Repeat Rewind
    8. Your Top Songs 2025 (and other years)
    9. Smart Shuffle
    10. Blend
    11. Your Daily Drive
    12. Release Radar
    """
    # EXACT matches only (case-insensitive) - NO PATTERNS
    ALGORITHMIC_NAMES = [
        'radio',
        'discover weekly',
        'your dj',
        'mixes',
        'on repeat',
        'daylist',
        'repeat rewind',
        'smart shuffle',
        'blend',
        'your daily drive',
        'release radar',
        # Year variations for Your Top Songs
        'your top songs 2020',
        'your top songs 2021',
        'your top songs 2022',
        'your top songs 2023',
        'your top songs 2024',
        'your top songs 2025',
        'your top songs 2026',
    ]
    
    name = playlist_name.lower().strip()
    return name in ALGORITHMIC_NAMES


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


async def fetch_vendor_playlists_cache():
    """
    Fetch all vendor playlists from the vendor_playlists table for auto-matching.
    Returns a dict mapping normalized playlist names to vendor_id.
    """
    headers = {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json'
    }
    
    try:
        url = f"{SUPABASE_URL}/rest/v1/vendor_playlists"
        params = {'select': 'playlist_name_normalized,vendor_id'}
        
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code != 200:
            logger.warning(f"Could not fetch vendor_playlists: {response.status_code}")
            return {}
        
        data = response.json()
        # Build dict: normalized_name -> vendor_id
        vendor_map = {}
        for row in data:
            if row.get('playlist_name_normalized') and row.get('vendor_id'):
                vendor_map[row['playlist_name_normalized']] = row['vendor_id']
        
        logger.info(f"Loaded {len(vendor_map)} vendor playlists for auto-matching")
        return vendor_map
        
    except Exception as e:
        logger.warning(f"Error fetching vendor_playlists: {e}")
        return {}


# Global cache for vendor playlists (loaded once per scraper run)
_vendor_playlists_cache = None

async def get_vendor_playlists_cache():
    """Get or initialize the vendor playlists cache."""
    global _vendor_playlists_cache
    if _vendor_playlists_cache is None:
        _vendor_playlists_cache = await fetch_vendor_playlists_cache()
    return _vendor_playlists_cache


async def sync_to_campaign_playlists(campaign_id, scrape_data):
    """
    Bridge function: Sync scraped playlist data to campaign_playlists table
    This keeps the UI working with existing queries while storing raw data in spotify_campaigns
    
    FIX #2: Now preserves is_algorithmic flags by auto-detecting algorithmic playlists
    FIX #3: Auto-assigns vendor_id from vendor_playlists cache
    """
    headers = {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json'
    }
    
    try:
        # Get vendor playlists cache for auto-matching
        vendor_cache = await get_vendor_playlists_cache()
        
        # Helper function to normalize playlist names for deduplication
        def normalize_playlist_name(name):
            """Normalize playlist name for consistent deduplication"""
            if not name:
                return "unknown"
            # Convert to lowercase, strip whitespace, normalize unicode
            import unicodedata
            normalized = unicodedata.normalize('NFKD', str(name).lower().strip())
            # Remove extra whitespace
            normalized = ' '.join(normalized.split())
            return normalized
        
        # Extract unique playlists across all time ranges
        # Use normalized name as key, but keep original name for display
        playlists_by_normalized = {}
        
        for time_range, time_data in scrape_data.get('time_ranges', {}).items():
            stats = time_data.get('stats', {})
            playlists = stats.get('playlists', [])
            
            for playlist in playlists:
                playlist_name = playlist.get('name', 'Unknown')
                normalized_key = normalize_playlist_name(playlist_name)
                
                # Use normalized name as key for deduplication
                if normalized_key not in playlists_by_normalized:
                    playlists_by_normalized[normalized_key] = {
                        'playlist_name': playlist_name,  # Keep original name for display
                        'streams_24h': 0,
                        'streams_7d': 0,
                        'streams_12m': 0,
                    }
                
                # Map time range to field name
                # Remove commas from stream counts before converting to int
                streams_str = str(playlist.get('streams', 0)).replace(',', '')
                streams = int(streams_str) if streams_str.isdigit() else 0
                
                if time_range == '24hour':
                    playlists_by_normalized[normalized_key]['streams_24h'] = streams
                elif time_range == '7day':
                    playlists_by_normalized[normalized_key]['streams_7d'] = streams
                elif time_range == '12months':
                    playlists_by_normalized[normalized_key]['streams_12m'] = streams
        
        # Convert back to list (playlists_by_id for compatibility with rest of code)
        playlists_by_id = playlists_by_normalized
        
        if not playlists_by_id:
            # SAFEGUARD: Don't delete existing playlists if we didn't scrape any
            # This indicates a scraping failure, not that the song has no playlists
            logger.warning(f"[{campaign_id}] No playlists scraped - SKIPPING sync to preserve existing data")
            return True
        
        # SAFEGUARD: Check if ALL playlists have 0 streams across ALL time ranges
        # This indicates a scraping failure (e.g., page didn't load properly)
        total_streams = sum(
            p.get('streams_24h', 0) + p.get('streams_7d', 0) + p.get('streams_12m', 0)
            for p in playlists_by_id.values()
        )
        
        if total_streams == 0 and len(playlists_by_id) > 0:
            # Check if we have existing data that we would be destroying
            check_url = f"{SUPABASE_URL}/rest/v1/campaign_playlists"
            check_params = {'campaign_id': f'eq.{campaign_id}', 'select': 'streams_24h,streams_7d,streams_12m'}
            check_response = requests.get(check_url, headers=headers, params=check_params)
            
            if check_response.status_code == 200:
                existing_playlists = check_response.json()
                existing_total = sum(
                    (p.get('streams_24h') or 0) + (p.get('streams_7d') or 0) + (p.get('streams_12m') or 0)
                    for p in existing_playlists
                )
                
                if existing_total > 0:
                    logger.warning(f"[{campaign_id}] ⚠️  ZERO-PROTECTION: All scraped streams are 0 but existing data has {existing_total} streams - SKIPPING sync")
                    return True
        
        # Delete existing campaign_playlists entries for this campaign
        # Only do this if we have valid new data to replace it with
        delete_url = f"{SUPABASE_URL}/rest/v1/campaign_playlists"
        delete_params = {'campaign_id': f'eq.{campaign_id}'}
        
        delete_response = requests.delete(delete_url, headers=headers, params=delete_params)
        if delete_response.status_code not in [200, 204]:
            logger.warning(f"[{campaign_id}] Could not delete old playlists: {delete_response.status_code} - {delete_response.text}")
        else:
            logger.debug(f"[{campaign_id}] Cleared existing playlist records before sync")
        
        # Insert new playlist data with auto-detected is_algorithmic flag and vendor_id
        playlist_records = []
        algorithmic_count = 0
        vendor_count = 0
        vendor_matched_count = 0
        
        for playlist_data in playlists_by_id.values():
            playlist_name = playlist_data['playlist_name']
            is_algo = is_algorithmic_playlist(playlist_name)
            
            # Auto-match vendor from vendor_playlists cache
            normalized_name = playlist_name.lower().strip()
            vendor_id = vendor_cache.get(normalized_name)
            
            if is_algo:
                algorithmic_count += 1
            else:
                vendor_count += 1
                if vendor_id:
                    vendor_matched_count += 1
            
            record = {
                'campaign_id': campaign_id,
                'playlist_name': playlist_name,
                'streams_24h': playlist_data['streams_24h'],
                'streams_7d': playlist_data['streams_7d'],
                'streams_12m': playlist_data['streams_12m'],
                'is_algorithmic': is_algo,  # FIX #2: Auto-detect and preserve algorithmic flag
                'vendor_id': vendor_id,  # FIX #4: Always include vendor_id (None if not matched) for consistent keys
            }
            
            playlist_records.append(record)
        
        # Batch insert
        insert_url = f"{SUPABASE_URL}/rest/v1/campaign_playlists"
        insert_response = requests.post(insert_url, headers=headers, json=playlist_records)
        
        if insert_response.status_code not in [200, 201]:
            logger.error(f"[{campaign_id}] Failed to sync playlists: {insert_response.status_code} - {insert_response.text}")
            return False
        
        vendor_match_info = f", {vendor_matched_count} vendor-matched" if vendor_matched_count > 0 else ""
        logger.info(f"[{campaign_id}] ✓ Synced {len(playlist_records)} playlists ({algorithmic_count} algorithmic, {vendor_count} vendor{vendor_match_info})")
        
        # After successful sync, save performance entries for historical tracking
        await save_performance_entries(campaign_id, playlist_records, headers)
        
        return True
        
    except Exception as e:
        logger.error(f"[{campaign_id}] Error syncing playlists: {e}")
        import traceback
        traceback.print_exc()
        return False


async def save_performance_entries(campaign_id, playlist_records, headers):
    """
    Save daily performance entries for historical tracking.
    This allows us to show streaming performance history over time.
    """
    try:
        # First, get the campaign_playlists IDs we just created
        get_url = f"{SUPABASE_URL}/rest/v1/campaign_playlists"
        get_params = {'campaign_id': f'eq.{campaign_id}', 'select': 'id,playlist_name,streams_24h'}
        
        response = requests.get(get_url, headers=headers, params=get_params)
        if response.status_code != 200:
            logger.warning(f"[{campaign_id}] Could not fetch playlist IDs for performance entries")
            return
        
        playlists = response.json()
        if not playlists:
            return
        
        # Get today's date
        today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        
        # Create performance entries for each playlist
        performance_entries = []
        for playlist in playlists:
            if playlist['streams_24h'] and playlist['streams_24h'] > 0:
                performance_entries.append({
                    'campaign_id': None,  # campaign_playlists.campaign_id is integer, but performance_entries expects UUID - leaving null for now
                    'playlist_id': playlist['id'],  # This is the UUID from campaign_playlists
                    'daily_streams': playlist['streams_24h'],
                    'date_recorded': today
                })
        
        if not performance_entries:
            return
        
        # Use upsert to avoid duplicates if run multiple times in a day
        insert_url = f"{SUPABASE_URL}/rest/v1/performance_entries"
        # Add Prefer header for upsert on conflict
        upsert_headers = {**headers, 'Prefer': 'resolution=merge-duplicates'}
        
        insert_response = requests.post(insert_url, headers=upsert_headers, json=performance_entries)
        
        if insert_response.status_code in [200, 201]:
            logger.info(f"[{campaign_id}] ✓ Saved {len(performance_entries)} performance entries for {today}")
        else:
            logger.warning(f"[{campaign_id}] Could not save performance entries: {insert_response.status_code}")
            
    except Exception as e:
        logger.warning(f"[{campaign_id}] Error saving performance entries: {e}")


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


def clear_browser_profile_locks(user_data_dir):
    """Remove stale Chromium singleton lock files if present"""
    lock_files = [
        os.path.join(user_data_dir, 'SingletonLock'),
        os.path.join(user_data_dir, 'SingletonSocket'),
        os.path.join(user_data_dir, 'SingletonCookie'),
    ]
    removed = False
    for lock_path in lock_files:
        try:
            if os.path.exists(lock_path):
                os.remove(lock_path)
                removed = True
        except Exception as e:
            logger.warning(f"⚠️  Could not remove lock file {lock_path}: {e}")
    if removed:
        logger.info("🧹 Removed stale Chromium profile lock files")


async def launch_browser_context(playwright, user_data_dir, headless):
    """Launch a fresh browser context with all stability and stealth args"""
    clear_browser_profile_locks(user_data_dir)
    
    # STEALTH MODE: Enhanced args to hide automation detection
    # This prevents "Chrome is being controlled by automated test software" detection
    stealth_args = [
        # Core automation hiding
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',  # Removes the automation info bar
        '--disable-automation',  # Disables automation extension
        '--disable-browser-side-navigation',
        '--disable-web-security',
        
        # Memory/stability args
        '--disable-dev-shm-usage',
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
        '--disable-hang-monitor',
        '--single-process',
        '--disable-features=site-per-process',
        
        # Additional stealth flags
        '--excludeSwitches=enable-automation',
        '--useAutomationExtension=false',
    ]
    
    # Launch with persistent context (maintains session across runs)
    context = await playwright.chromium.launch_persistent_context(
        user_data_dir=user_data_dir,
        headless=headless,
        args=stealth_args,
        # Add timeout to prevent hanging
        timeout=60000,
        # Additional stealth: Set realistic viewport and user agent
        viewport={'width': 1920, 'height': 1080},
        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        # Ignore HTTPS errors to avoid SSL issues
        ignore_https_errors=True,
    )
    
    # CRITICAL: Inject stealth scripts to hide webdriver property
    for page in context.pages:
        await apply_stealth_scripts(page)
    
    # Hook into new pages to apply stealth scripts
    context.on('page', lambda page: asyncio.create_task(apply_stealth_scripts(page)))
    
    return context


async def apply_stealth_scripts(page):
    """Apply JavaScript patches to hide automation detection"""
    try:
        # Remove webdriver property
        await page.add_init_script("""
            // Overwrite navigator.webdriver
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            
            // Remove automation indicators from window
            delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
            delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
            delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
            
            // Overwrite chrome runtime to hide automation
            if (window.chrome) {
                window.chrome.runtime = {
                    connect: () => {},
                    sendMessage: () => {},
                    onMessage: { addListener: () => {} }
                };
            }
            
            // Override permissions query to always return 'granted' for notifications
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
            
            // Make plugins array look realistic
            Object.defineProperty(navigator, 'plugins', {
                get: () => [
                    { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer' },
                    { name: 'Chrome PDF Plugin', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
                    { name: 'Native Client', filename: 'internal-nacl-plugin' }
                ]
            });
            
            // Make languages array realistic
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en']
            });
        """)
        logger.debug("Applied stealth scripts to page")
    except Exception as e:
        logger.warning(f"Could not apply stealth scripts: {e}")


async def process_batch(campaigns, batch_num, total_batches, user_data_dir, headless):
    """Process a batch of campaigns with a fresh browser instance.
    
    IMPORTANT: This function now operates in SESSION-ONLY mode.
    It requires a valid session established via manual VNC login.
    Automated login is disabled because it triggers bot detection.
    """
    logger.info("")
    logger.info("="*60)
    logger.info(f"BATCH {batch_num}/{total_batches} - Processing {len(campaigns)} campaigns")
    logger.info("="*60)
    
    success_count = 0
    failure_count = 0
    session_expired = False
    
    # Launch fresh browser for this batch
    playwright = await async_playwright().start()
    
    try:
        context = await launch_browser_context(playwright, user_data_dir, headless)
        page = context.pages[0] if context.pages else await context.new_page()
        
        # Apply stealth scripts to the page
        await apply_stealth_scripts(page)
        
        # Check if we already have a valid session
        already_logged_in = await check_if_logged_in(page)
        
        if not already_logged_in:
            # SESSION-ONLY MODE: Do not attempt automated login
            # Automated login triggers bot detection every time
            logger.error("="*60)
            logger.error("❌ NO VALID SESSION FOUND")
            logger.error("="*60)
            logger.error("Automated login is DISABLED because it triggers bot detection.")
            logger.error("Please log in manually via VNC and run the scraper again:")
            logger.error("  1. Connect to VNC: artistinfluence:99")
            logger.error("  2. Run: cd /root/arti-marketing-ops/spotify_scraper && python3 manual_login_prod.py")
            logger.error("  3. Complete the login manually (including CAPTCHA if needed)")
            logger.error("  4. Run the scraper again")
            logger.error("="*60)
            return 0, len(campaigns)  # All campaigns in batch failed
        
        logger.info("✓ Valid session found - proceeding with scraping")
        logger.info("  (Automated re-login is disabled to avoid bot detection)")
        
        # Create Spotify page helper
        spotify_page = SpotifyArtistsPage(page)
        
        # Scrape each campaign in this batch
        for i, campaign in enumerate(campaigns, 1):
            # Skip remaining campaigns if session expired
            if session_expired:
                failure_count += 1
                continue
                
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
                failure_count += len(campaigns) - i + 1
                break
            
            # Scrape data - NO re-login attempts
            data = None
            try:
                data = await scrape_campaign(page, spotify_page, campaign)
                
                if not data:
                    # Check if we got redirected to login
                    current_url = page.url
                    if 'login' in current_url.lower() or 'accounts.spotify.com' in current_url:
                        if await handle_session_expired(page):
                            # Retry once after manual login
                            try:
                                data = await scrape_campaign(page, spotify_page, campaign)
                            except Exception as retry_error:
                                logger.error(f"[{campaign['id']}] Retry failed: {retry_error}")
                                session_expired = True
                                failure_count += 1
                                continue
                        else:
                            session_expired = True
                            failure_count += 1
                            continue
                    elif 'challenge' in current_url.lower():
                        logger.error(f"[{campaign['id']}] ❌ CAPTCHA challenge detected")
                        logger.error("⚠️  Please solve CAPTCHA via VNC and restart scraper.")
                        session_expired = True
                        failure_count += 1
                        continue
                        
            except SessionExpiredError as e:
                logger.error(f"[{campaign['id']}] Error during scrape: {e}")
                if await handle_session_expired(page):
                    # Retry once after manual login
                    try:
                        data = await scrape_campaign(page, spotify_page, campaign)
                    except Exception as retry_error:
                        logger.error(f"[{campaign['id']}] Retry failed: {retry_error}")
                        session_expired = True
                        failure_count += 1
                        continue
                else:
                    session_expired = True
                    failure_count += 1
                    continue
            except Exception as e:
                error_msg = str(e)
                logger.error(f"[{campaign['id']}] Error during scrape: {e}")
                
                # Check if this is a session expiry error
                if 'SESSION_EXPIRED' in error_msg or 'login' in error_msg.lower():
                    if await handle_session_expired(page):
                        # Retry once after manual login
                        try:
                            data = await scrape_campaign(page, spotify_page, campaign)
                        except Exception as retry_error:
                            logger.error(f"[{campaign['id']}] Retry failed: {retry_error}")
                            session_expired = True
                            failure_count += 1
                            continue
                    else:
                        session_expired = True
                        failure_count += 1
                        continue
                else:
                    # Other error - try to continue with next campaign
                    failure_count += 1
                    await asyncio.sleep(3)
                    continue
            
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
    
    if session_expired:
        logger.warning("="*60)
        logger.warning("⚠️  BATCH INCOMPLETE - Session expired during scraping")
        logger.warning("Please login via VNC and run the scraper again to continue.")
        logger.warning("="*60)
    
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
    # Default to headless=true on servers without a display
    display = os.getenv('DISPLAY')
    default_headless = 'true' if not display else 'false'
    headless = os.getenv('HEADLESS', default_headless).lower() == 'true'
    logger.info(f"DISPLAY={display}, headless={headless}")
    
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
