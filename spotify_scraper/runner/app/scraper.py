import asyncio
from playwright.async_api import async_playwright, Browser, BrowserContext, Page
import os
from datetime import datetime
import json
from typing import Optional, Dict, Any, List
from pathlib import Path

from .pages.spotify_artists import SpotifyArtistsPage

class SpotifyArtistsScraper:
    def __init__(self):
        self.user_data_dir = os.getenv('USER_DATA_DIR', './data/browser_data')
        self.download_dir = os.getenv('DOWNLOAD_DIR', './data/downloads')
        self.artifacts_dir = os.getenv('ARTIFACTS_DIR', './data/artifacts')
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
        print("Starting browser with persistent context...")
        self.playwright = await async_playwright().start()
        
        # Use persistent context to maintain login state
        self.context = await self.playwright.chromium.launch_persistent_context(
            user_data_dir=self.user_data_dir,
            headless=False,  # Run in headed mode for debugging
            downloads_path=self.download_dir
        )
        self.page = await self.context.new_page()
        
    async def stop(self):
        """Clean up resources"""
        if self.context:
            await self.context.close()
        if self.playwright:
            await self.playwright.stop()
            
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
            if 'login' in current_url.lower():
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
            
    async def scrape_song_data(self, song_url: str, time_ranges: List[str] = ['28day', '7day', '12months']) -> Dict[str, Any]:
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