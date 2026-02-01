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
            
            # Check current URL - we might already be on the login page
            current_url = self.page.url
            print(f"Current URL before login: {current_url}")
            
            # If already on login page, skip navigation and go straight to email entry
            if 'accounts.spotify.com' in current_url or 'login' in current_url.lower():
                print("Already on login page - proceeding directly to email entry...")
            else:
                # First check if already logged in by navigating to the home page
                print("Checking if already logged in...")
                await self.page.goto('https://artists.spotify.com/home', wait_until='domcontentloaded', timeout=30000)
                await asyncio.sleep(3)
                
                # If we're on the home page and not redirected to login, check cookies
                current_url = self.page.url
                if 'artists.spotify.com' in current_url and 'login' not in current_url and 'accounts.spotify.com' not in current_url:
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
                
                # Navigate to Spotify for Artists (not generic login page)
                await self.page.goto('https://artists.spotify.com', wait_until='domcontentloaded', timeout=30000)
                await asyncio.sleep(3)
            
            # Get current URL after navigation
            current_url = self.page.url
            print(f"Landed on: {current_url}")
            
            if 'artists.spotify.com/home' in current_url or ('artists.spotify.com' in current_url and 'login' not in current_url):
                print("On landing page, looking for Login button...")
                login_button_selectors = [
                    'button:has-text("Log in")',
                    'a:has-text("Log in")',
                    'button:has-text("Login")',
                    'a:has-text("Login")'
                ]
                
                login_clicked = False
                for selector in login_button_selectors:
                    try:
                        login_btn = self.page.locator(selector)
                        if await login_btn.count() > 0:
                            await login_btn.click()
                            print(f"  Login button clicked using selector: {selector}")
                            login_clicked = True
                            await asyncio.sleep(3)
                            break
                    except:
                        continue
                
                if not login_clicked:
                    print("  WARNING: Could not find Login button on landing page")
            
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
            
            # Wait longer for page to navigate/load
            print("  Waiting for page to load...")
            await asyncio.sleep(5)  # Increased from 3 to 5 seconds
            
            # Check current URL
            current_url = self.page.url
            print(f"  Current URL: {current_url}")
            
            # Check if password field is already visible (single-page login)
            password_input = self.page.locator('input[type="password"]')
            password_input_exists = False
            if await password_input.count() > 0:
                password_input_exists = await password_input.first.is_visible()
            if password_input_exists:
                print("  Password field found on same page - single-page login flow")
            
            # Step 3: Click "Log in with password" or similar
            print("Step 3: Looking for password login option...")
            
            # Debug: List all buttons on the page
            try:
                all_buttons = await self.page.locator('button, a[role="button"]').all()
                print(f"  Found {len(all_buttons)} buttons/links on page:")
                for i, btn in enumerate(all_buttons[:10]):  # Show first 10
                    text = await btn.text_content()
                    data_testid = await btn.get_attribute('data-testid')
                    print(f"    Button {i+1}: text='{text.strip() if text else ''}' data-testid='{data_testid}'")
            except Exception as e:
                print(f"  Debug info failed: {e}")
            
            # Updated for Spotify's 2025+ login flow - now defaults to "login code" with password as link below
            password_option_selectors = [
                # Primary: links that appear below the login code section
                'a:has-text("Log in with password")',
                'a:has-text("Log in with a password")',
                'a:has-text("Use password")',
                'a:has-text("Use password instead")',
                # Button variants
                'button:has-text("Log in with password")',
                'button:has-text("Log in with a password")',
                'button:has-text("Use password instead")',
                'button:has-text("Continue with password")',
                'button:has-text("Use password")',
                # Span-based links
                'span:has-text("Log in with password")',
                '[role="link"]:has-text("password")',
                # Data-testid selectors
                '[data-testid="login-password-button"]',
                '[data-testid="login-password"]',
                '[data-testid*="password-login"]',
                'button[data-testid*="password"]',
                # Legacy selectors
                '[role="button"]:has-text("password")',
                '[class*="link"]:has-text("password")',
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

            # If password input is still not visible, try clicking a secondary Continue/Next
            password_input = self.page.locator('input[type="password"]')
            password_input_visible = False
            if await password_input.count() > 0:
                password_input_visible = await password_input.first.is_visible()
            if not password_input_visible:
                print("  Password input not visible yet - trying Continue/Next...")
                method_continue_selectors = [
                    'button:has-text("Continue")',
                    'button:has-text("Next")',
                    'button[type="submit"]'
                ]
                for selector in method_continue_selectors:
                    try:
                        method_continue = self.page.locator(selector)
                        if await method_continue.count() > 0:
                            await method_continue.first.click()
                            print(f"  Method Continue clicked using selector: {selector}")
                            await asyncio.sleep(3)
                            break
                    except:
                        continue

            # Fallback: go directly to Spotify accounts login if still no password input
            password_input = self.page.locator('input[type="password"]')
            password_input_visible = False
            if await password_input.count() > 0:
                password_input_visible = await password_input.first.is_visible()
            if not password_input_visible:
                print("  No password input after method selection - trying direct accounts login...")
                try:
                    await self.page.goto(
                        'https://accounts.spotify.com/en/login?continue=https%3A%2F%2Fartists.spotify.com%2F',
                        wait_until='domcontentloaded'
                    )
                    await asyncio.sleep(3)
                    # Fill username and advance if needed
                    username_input = self.page.locator(
                        'input#login-username, input[name="username"], input[type="email"], input[type="text"]'
                    )
                    username_count = await username_input.count()
                    print(f"  Accounts page username inputs found: {username_count}")
                    if username_count > 0:
                        await username_input.first.fill(email)
                        print("  Filled email on accounts page")
                        await asyncio.sleep(1)
                        password_input = self.page.locator(
                            'input[type="password"], input[name="password"], input[id="login-password"], input[placeholder*="password" i]'
                        )
                        password_visible = False
                        if await password_input.count() > 0:
                            password_visible = await password_input.first.is_visible()
                        print(f"  Password visible after email fill: {password_visible}")
                        if not password_visible:
                            method_continue_selectors = [
                                'button:has-text("Continue")',
                                'button:has-text("Next")',
                                'button[type="submit"]',
                                'button[data-testid="login-button"]'
                            ]
                            for selector in method_continue_selectors:
                                try:
                                    method_continue = self.page.locator(selector)
                                    if await method_continue.count() > 0:
                                        await method_continue.first.click()
                                        print(f"  Accounts Continue clicked using selector: {selector}")
                                        await asyncio.sleep(5)
                                        break
                                except:
                                    continue
                    else:
                        print("  No username input found on accounts page")
                except Exception as e:
                    print(f"  Could not navigate to accounts login: {e}")
            
            # Step 4: Enter password
            print("Step 4: Entering password...")
            password_input = self.page.locator(
                'input[type="password"], input[name="password"], input[id="login-password"], input[placeholder*="password" i]'
            )
            try:
                await password_input.first.wait_for(timeout=15000)
                await password_input.first.fill(password)
                print("  Password entered")
            except Exception:
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
            
            # Try to navigate to home page with shorter timeout (don't wait for networkidle)
            try:
                await self.page.goto('https://artists.spotify.com/home', wait_until='domcontentloaded', timeout=30000)
            except Exception as e:
                print(f"Navigation to home failed: {e}")
            
            await asyncio.sleep(5)  # Give time for redirects to complete
            
            # Get current URL after any redirects
            current_url = self.page.url
            try:
                page_title = await self.page.title()
                print(f"Current URL: {current_url}")
                print(f"Page title: {page_title}")
            except:
                pass
            
            # FIRST: Check if we're on the login page (most important check)
            if 'login' in current_url.lower() or 'accounts.spotify.com' in current_url:
                print("Redirected to login page - not logged in")
                return False
            
            # SECOND: Check for login form elements (email input = not logged in)
            try:
                email_input = self.page.locator('input[type="text"], input[type="email"], input[name="username"], input#login-username')
                if await email_input.count() > 0:
                    is_visible = await email_input.first.is_visible()
                    if is_visible:
                        print("Login form detected - not logged in")
                        return False
            except:
                pass
            
            # THIRD: Check for "Welcome back" or "Log in" text which indicates login page
            try:
                login_indicators = self.page.locator('text="Welcome back", text="Log in to Spotify", text="Email or username"')
                if await login_indicators.count() > 0:
                    print("Login page text detected - not logged in")
                    return False
            except:
                pass
            
            # Check if we're on a valid S4A path (indicates logged in)
            if 'artists.spotify.com' in current_url:
                # Check for sp_dc cookie as definitive login proof
                try:
                    cookies = await self.context.cookies()
                    has_sp_dc = any(c['name'] == 'sp_dc' for c in cookies)
                    if has_sp_dc:
                        print("Login session verified (sp_dc cookie found)!")
                        return True
                except:
                    pass
                
                # Check if we're on the dashboard path
                if '/c/' in current_url or '/home' in current_url or '/roster' in current_url:
                    # Additional check - make sure we're not on login page
                    if 'login' not in current_url.lower():
                        print(f"Login session verified (on S4A path: {current_url})!")
                        return True
            
            # Check for dashboard elements that confirm we're logged in
            try:
                await self.page.wait_for_selector('[data-testid="dashboard-header"]', timeout=5000)
                print("Login session verified!")
                return True
            except:
                # Try alternative selectors for logged in state (more specific ones)
                alt_selectors = [
                    '[data-testid="menu-item"]',
                    'nav[role="navigation"]',
                    '[id="navigation"]',
                    'a[href*="/music/releases"]',
                    'a[href*="/audience"]',
                    '[data-testid="artists-list"]',
                    '[data-testid="app-chrome-navigation"]',
                ]
                
                for selector in alt_selectors:
                    try:
                        if await self.page.locator(selector).count() > 0:
                            print(f"Login session verified (found: {selector})!")
                            return True
                    except:
                        continue
                
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