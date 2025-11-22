import asyncio
from playwright.async_api import async_playwright, Browser, BrowserContext, Page
import os
from datetime import datetime
import json
from typing import Optional, Dict, Any, List
from pathlib import Path

from .pages.spotify_artists import SpotifyArtistsPage

class SpotifyArtistsScraper:
    def __init__(self, headless: bool = False):
        self.user_data_dir = os.getenv('USER_DATA_DIR', './data/browser_data')
        self.download_dir = os.getenv('DOWNLOAD_DIR', './data/downloads')
        self.artifacts_dir = os.getenv('ARTIFACTS_DIR', './data/artifacts')
        self.headless = headless
        self.playwright = None
        self.context = None
        self.page = None
        
    async def __aenter__(self):
        await self.start()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.stop()
        
    async def start(self):
        """Initialize browser with persistent context"""
        print(f"Starting browser (headless={self.headless})...")
        self.playwright = await async_playwright().start()
        
        # Additional args for headless stability
        browser_args = []
        if self.headless:
            browser_args = [
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu'
            ]
        
        # Use persistent context to maintain login state
        self.context = await self.playwright.chromium.launch_persistent_context(
            user_data_dir=self.user_data_dir,
            headless=self.headless,
            downloads_path=self.download_dir,
            args=browser_args
        )
        self.page = await self.context.new_page()
        
    async def stop(self):
        """Clean up resources"""
        if self.context:
            await self.context.close()
        if self.playwright:
            await self.playwright.stop()
            
    async def auto_login(self, email: str, password: str) -> bool:
        """Automatically log in to Spotify for Artists (two-step process)"""
        try:
            print("Starting automatic login...")
            
            # First check if already logged in by navigating to the home page
            print("Checking if already logged in...")
            await self.page.goto('https://artists.spotify.com/home', wait_until='domcontentloaded', timeout=30000)
            await asyncio.sleep(3)
            
            # If we're on the home page and not redirected to login, check cookies
            current_url = self.page.url
            if 'artists.spotify.com' in current_url and 'login' not in current_url:
                # Verify we have the critical sp_dc cookie
                cookies = await self.context.cookies()
                has_sp_dc = any(c['name'] == 'sp_dc' for c in cookies)
                
                if has_sp_dc:
                    print("[OK] Already logged in! Session is valid (sp_dc cookie found).")
                    return True
                else:
                    print("[WARNING] On home page but missing sp_dc cookie - login incomplete!")
                    print("          Will attempt full login...")
            
            print("Not logged in, proceeding with login flow...")
            
            # Navigate to login page
            await self.page.goto('https://accounts.spotify.com/login', wait_until='domcontentloaded', timeout=30000)
            await asyncio.sleep(3)
            
            # Step 1: Enter email and click Continue
            print("Step 1: Entering email...")
            
            # Debug: List all input fields on the page
            try:
                all_inputs = await self.page.locator('input').all()
                print(f"  Found {len(all_inputs)} input fields on page")
                for i, inp in enumerate(all_inputs[:5]):  # Show first 5
                    inp_type = await inp.get_attribute('type')
                    inp_id = await inp.get_attribute('id')
                    inp_name = await inp.get_attribute('name')
                    inp_placeholder = await inp.get_attribute('placeholder')
                    print(f"    Input {i+1}: type={inp_type}, id={inp_id}, name={inp_name}, placeholder={inp_placeholder}")
            except Exception as e:
                print(f"  Debug info failed: {e}")
            
            email_selectors = [
                'input[id="login-username"]',
                'input[name="username"]',
                'input[type="email"]',
                'input[type="text"]',  # Try plain text input
                'input[placeholder*="email" i]',
                'input[placeholder*="username" i]',
                'input[data-testid*="username"]',
                'input[data-testid*="email"]',
                '#login-username',  # ID selector
                '[name="username"]'  # Attribute selector
            ]
            
            email_filled = False
            for selector in email_selectors:
                try:
                    email_input = self.page.locator(selector)
                    if await email_input.count() > 0:
                        await email_input.fill(email)
                        print(f"  Email entered using selector: {selector}")
                        email_filled = True
                        break
                except:
                    continue
            
            if not email_filled:
                print("  ERROR: Could not find email input field!")
                print("  Please check the browser window to see what page loaded")
                return False
            
            await asyncio.sleep(1)
            
            # Click Continue button
            print("Step 2: Clicking Continue...")
            continue_selectors = [
                'button:has-text("Continue")',
                'button[data-testid="login-button"]',
                'button[id="login-button"]',
                'button[type="submit"]'
            ]
            
            continue_clicked = False
            for selector in continue_selectors:
                try:
                    continue_btn = self.page.locator(selector)
                    if await continue_btn.count() > 0:
                        await continue_btn.click()
                        print(f"  Continue clicked using selector: {selector}")
                        continue_clicked = True
                        break
                except:
                    continue
            
            if not continue_clicked:
                print("  ERROR: Could not find Continue button!")
                return False
            
            await asyncio.sleep(3)
            
            # Step 3: Click "Log in with password" or similar
            print("Step 3: Looking for password login option...")
            password_option_selectors = [
                'button:has-text("Password")',
                'button:has-text("password")',
                'a:has-text("password")',
                'div:has-text("Password") button',
                '[data-testid="login-password-button"]'
            ]
            
            password_option_clicked = False
            for selector in password_option_selectors:
                try:
                    password_option = self.page.locator(selector)
                    if await password_option.count() > 0:
                        await password_option.click()
                        print(f"  Password option clicked using selector: {selector}")
                        password_option_clicked = True
                        await asyncio.sleep(2)
                        break
                except:
                    continue
            
            # If no password option found, maybe we're already on password page
            if not password_option_clicked:
                print("  No explicit password option found, proceeding...")
            
            # Step 4: Enter password
            print("Step 4: Entering password...")
            password_selectors = [
                'input[id="login-password"]',
                'input[name="password"]',
                'input[type="password"]',
                'input[placeholder*="password" i]'
            ]
            
            password_filled = False
            for selector in password_selectors:
                try:
                    password_input = self.page.locator(selector)
                    if await password_input.count() > 0:
                        await password_input.fill(password)
                        print(f"  Password entered using selector: {selector}")
                        password_filled = True
                        break
                except:
                    continue
            
            if not password_filled:
                print("  ERROR: Could not find password input field!")
                return False
            
            await asyncio.sleep(1)
            
            # Check for any error messages before submitting
            try:
                error_selectors = [
                    '[data-testid="error-message"]',
                    '.error-message',
                    '[role="alert"]',
                    '.alert-error'
                ]
                for selector in error_selectors:
                    error_elem = self.page.locator(selector)
                    if await error_elem.count() > 0:
                        error_text = await error_elem.text_content()
                        print(f"  WARNING: Error message found: {error_text}")
            except:
                pass
            
            # Step 5: Click final login button
            print("Step 5: Clicking login button...")
            
            # Take screenshot before clicking
            try:
                await self.page.screenshot(path='data/artifacts/before_login_click.png')
                print("  Screenshot saved: before_login_click.png")
            except:
                pass
            
            login_selectors = [
                'button[id="login-button"]',
                'button[data-testid="login-button"]',
                'button[type="submit"]',
                'button:has-text("Log in")',
                'button:has-text("Sign in")'
            ]
            
            login_clicked = False
            for selector in login_selectors:
                try:
                    login_btn = self.page.locator(selector)
                    if await login_btn.count() > 0:
                        # Check if button is disabled
                        is_disabled = await login_btn.get_attribute('disabled')
                        if is_disabled:
                            print(f"  WARNING: Login button is disabled!")
                        
                        await login_btn.click()
                        print(f"  Login button clicked using selector: {selector}")
                        login_clicked = True
                        break
                except Exception as e:
                    print(f"  Failed to click with {selector}: {e}")
                    continue
            
            if not login_clicked:
                print("  ERROR: Could not find login button!")
                # Take screenshot
                try:
                    await self.page.screenshot(path='data/artifacts/login_button_not_found.png')
                except:
                    pass
                return False
            
            # Small wait after clicking
            await asyncio.sleep(2)
            
            # Check for error messages after clicking
            try:
                for selector in error_selectors:
                    error_elem = self.page.locator(selector)
                    if await error_elem.count() > 0:
                        error_text = await error_elem.text_content()
                        print(f"  ERROR AFTER LOGIN: {error_text}")
                        await self.page.screenshot(path='data/artifacts/login_error.png')
                        return False
            except:
                pass
            
            # Wait for navigation
            print("Step 6: Waiting for login to complete...")
            
            # Wait for redirect to Spotify for Artists (may take a few seconds)
            max_wait = 15  # Wait up to 15 seconds for redirect
            for i in range(max_wait):
                await asyncio.sleep(1)
                current_url = self.page.url
                
                # Check if we've been redirected to artists.spotify.com
                if 'artists.spotify.com' in current_url and 'login' not in current_url.lower():
                    print(f"  Redirected successfully after {i+1} seconds")
                    break
                    
                if i % 3 == 0:  # Log every 3 seconds
                    print(f"  Waiting for redirect... ({i+1}s) Current: {current_url[:50]}...")
            
            # Handle "I'll explore on my own" popup if it appears
            try:
                explore_button = self.page.locator('text="I\'ll explore on my own"')
                if await explore_button.count() > 0:
                    print("Dismissing onboarding popup...")
                    await explore_button.click()
                    await asyncio.sleep(2)
            except:
                pass
            
            # Also try closing any welcome modals
            try:
                close_selectors = [
                    'button[aria-label="Close"]',
                    'button:has-text("Close")',
                    'button:has-text("Got it")',
                    'button:has-text("Dismiss")'
                ]
                for selector in close_selectors:
                    close_btn = self.page.locator(selector)
                    if await close_btn.count() > 0:
                        await close_btn.click()
                        print(f"Closed modal/popup")
                        await asyncio.sleep(1)
                        break
            except:
                pass
            
            # Check if we landed on artists.spotify.com
            current_url = self.page.url
            if 'artists.spotify.com' in current_url and 'login' not in current_url.lower():
                # Verify we got the sp_dc cookie
                cookies = await self.context.cookies()
                has_sp_dc = any(c['name'] == 'sp_dc' for c in cookies)
                
                if has_sp_dc:
                    print("[OK] Login successful! (sp_dc cookie verified)")
                    return True
                else:
                    print("[WARNING] Reached artists.spotify.com but sp_dc cookie missing!")
                    print("          Login may be incomplete. Trying again...")
                    # Fall through to retry logic
            
            # If we're on regular Spotify, navigate to Spotify for Artists
            if 'spotify.com' in current_url and 'artists' not in current_url:
                print("  Logged into regular Spotify, redirecting to Spotify for Artists...")
                await self.page.goto('https://artists.spotify.com/home', wait_until='networkidle', timeout=60000)
                await asyncio.sleep(3)
                
                # Check final URL
                final_url = self.page.url
                if 'artists.spotify.com' in final_url and 'login' not in final_url.lower():
                    print("[OK] Successfully redirected to Spotify for Artists!")
                    return True
                else:
                    print(f"[!] Redirect failed. Current URL: {final_url}")
                    return False
            
            print(f"[!] Login may have failed. Current URL: {current_url}")
            print("    The browser window should still be open - please check what page it's on")
            return False
                
        except Exception as e:
            print(f"[ERROR] Auto-login failed: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    async def verify_login(self) -> bool:
        """Verify we have an active login session"""
        try:
            print("Verifying login status...")
            
            # Try to navigate to home page with longer timeout
            try:
                await self.page.goto('https://artists.spotify.com/home', wait_until='networkidle', timeout=60000)
            except Exception as e:
                print(f"Navigation to home failed: {e}")
                # Try direct login page instead
                await self.page.goto('https://artists.spotify.com/', wait_until='networkidle', timeout=60000)
            
            await asyncio.sleep(3)  # Give more time for page to fully load
            
            # Debug: Print current URL and page title
            current_url = self.page.url
            try:
                page_title = await self.page.title()
                print(f"Current URL: {current_url}")
                print(f"Page title: {page_title}")
            except:
                pass
            
            # Check if we're redirected to login page
            if 'login' in current_url.lower() or 'accounts.spotify.com' in current_url:
                print("Redirected to login page - not logged in")
                return False
            
            # Check for dashboard element or any indicator we're logged in
            try:
                await self.page.wait_for_selector('[data-testid="dashboard-header"]', timeout=5000)
                print("Login session verified!")
                return True
            except:
                # Try alternative selectors for logged in state
                alt_selectors = [
                    'text=Home', 
                    'text=Music', 
                    'text=Audience', 
                    '.artist-name',
                    '[data-testid="menu-item"]',
                    'nav[role="navigation"]',
                    'a[href*="/home"]',
                    'a[href*="/music"]'
                ]
                
                for selector in alt_selectors:
                    try:
                        if await self.page.locator(selector).count() > 0:
                            print(f"Login session verified (found: {selector})!")
                            return True
                    except:
                        continue
                
                # Last resort: check for any navigation elements that indicate we're logged in
                try:
                    # Look for common Spotify for Artists navigation
                    page_content = await self.page.content()
                    if any(text in page_content.lower() for text in ['home', 'music', 'audience', 'dashboard']):
                        print("Login session verified (content check)!")
                        return True
                except:
                    pass
                
                print("No login indicators found")
                return False
                
        except Exception as e:
            print(f"Login verification failed: {e}")
            return False
            
    async def scrape_song_data(self, song_url: str, time_ranges: List[str] = ['7day', '24hour']) -> Dict[str, Any]:
        """
        Scrape comprehensive song data for multiple time ranges
        
        Args:
            song_url: URL of the song to scrape
            time_ranges: List of time ranges to collect data for
            
        Returns:
            Dictionary containing all collected song data
        """
        try:
            # First verify we're logged in
            if not await self.verify_login():
                raise Exception("Not logged in - please ensure you have a valid session")
                
            # Initialize page object
            artists_page = SpotifyArtistsPage(self.page)
            
            # Navigate to song
            await artists_page.navigate_to_song(song_url)
            
            # Collect data for each time range
            all_data = {
                'url': song_url,
                'scraped_at': datetime.now().isoformat(),
                'time_ranges': {}
            }
            
            for time_range in time_ranges:
                print(f"Collecting data for {time_range} time range...")
                
                # Switch time range if needed
                if time_range != 'all':
                    await artists_page.switch_time_range(time_range)
                
                # Get stats and insights
                stats = await artists_page.get_song_stats()
                insights = await artists_page.get_song_insights()
                
                all_data['time_ranges'][time_range] = {
                    'stats': stats,
                    'insights': insights
                }
                
                # Small delay between time ranges
                await asyncio.sleep(2)
            
            return all_data
            
        except Exception as e:
            print(f"Error scraping song data: {e}")
            # Save screenshot for debugging
            await self.save_error_artifacts()
            raise
            
    async def save_error_artifacts(self):
        """Save debug artifacts on error"""
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            artifacts_dir = Path(self.artifacts_dir)
            artifacts_dir.mkdir(parents=True, exist_ok=True)
            
            # Save screenshot
            await self.page.screenshot(path=str(artifacts_dir / f'error_{timestamp}.png'))
            
            # Save page HTML
            html_content = await self.page.content()
            with open(artifacts_dir / f'error_{timestamp}.html', 'w', encoding='utf-8') as f:
                f.write(html_content)
                
        except Exception as e:
            print(f"Failed to save error artifacts: {e}")
            
    async def save_screenshot(self, name: str):
        """Save a screenshot with the given name"""
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            artifacts_dir = Path(self.artifacts_dir)
            artifacts_dir.mkdir(parents=True, exist_ok=True)
            
            await self.page.screenshot(path=str(artifacts_dir / f'{name}_{timestamp}.png'))
            print(f"Screenshot saved: {name}_{timestamp}.png")
        except Exception as e:
            print(f"Failed to save screenshot: {e}")