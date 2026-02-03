from playwright.async_api import Page
from typing import Dict, Any, List
import re
import asyncio


class SessionExpiredError(Exception):
    """Raised when Spotify session is no longer valid."""
    pass

class SpotifyArtistsPage:
    def __init__(self, page: Page):
        self.page = page
    
    async def navigate_to_song(self, url: str) -> None:
        """Navigate to a song's page and wait for data to load"""
        # Convert /stats URL to /playlists URL if needed
        if '/stats' in url:
            url = url.replace('/stats', '/playlists')
            print(f"Converted to playlists URL: {url}")
        
        print(f"Navigating to song: {url}")
        
        # Human-like navigation delay
        await asyncio.sleep(1 + (0.5 * asyncio.get_event_loop().time()) % 1)
        
        await self.page.goto(url, wait_until='networkidle')
        
        # Human-like delay after navigation
        await asyncio.sleep(2.5 + (0.5 * asyncio.get_event_loop().time()) % 1.5)
        
        # CRITICAL: Check if we were redirected to login page
        current_url = self.page.url
        if 'accounts.spotify.com' in current_url or 'login' in current_url.lower():
            print(f"⚠️ Redirected to login page: {current_url}")
            # Raise a specific exception that the caller can catch
            raise SessionExpiredError("SESSION_EXPIRED: Redirected to login page when accessing song")
        
        # Check for error messages first
        await self.check_for_errors()
        
        # Wait for key elements that indicate the page is loaded
        try:
            await self.page.wait_for_selector('[data-testid="song-header"]', timeout=10000)
        except:
            # Fallback selectors if the first one doesn't work
            try:
                await self.page.wait_for_selector('h1', timeout=10000)
            except:
                # Final check - if we're still on login page, raise session expired
                current_url = self.page.url
                if 'accounts.spotify.com' in current_url or 'login' in current_url.lower():
                    raise SessionExpiredError("SESSION_EXPIRED: Still on login page")
                await self.page.wait_for_selector('.song-title, [class*="title"]', timeout=10000)
        
        # Ensure we're on the Playlists tab to see the data
        await self.navigate_to_playlists_tab()
        
    async def check_for_errors(self) -> None:
        """Check for error messages on the page"""
        try:
            # Look for common error messages - only text-based selectors to avoid false positives
            error_selectors = [
                'text="Something went wrong"',
                'text="There\'s a problem on our end"',
                'text="You can\'t see stats for this"',
                'text="This song is not part of your catalog"',
                'text="Access denied"',
            ]
            
            for selector in error_selectors:
                try:
                    if await self.page.locator(selector).count() > 0:
                        error_text = await self.page.locator(selector).text_content()
                        # Only log if we actually have error text
                        if error_text and error_text.strip():
                            print(f"⚠️  Warning: Error detected on page: {error_text}")
                            
                            # If it's a "not part of catalog" error, try to continue anyway
                            if "not part of your catalog" in error_text.lower():
                                print("   Continuing anyway, might be able to get some data...")
                                return
                            
                            # For other errors, raise an exception
                            raise Exception(f"Page error: {error_text}")
                except Exception as e:
                    # Don't let individual selector errors stop the process
                    continue
        except Exception as e:
            print(f"Error checking for page errors: {e}")
            # Don't let error checking stop the scraping process
        
    async def navigate_to_playlists_tab(self) -> None:
        """Navigate to the Playlists tab if not already there"""
        try:
            print("Ensuring we're on the Playlists tab...")
            
            # Check if we're already on the playlists tab via URL
            current_url = self.page.url
            if '/playlists' in current_url:
                print(f"Already on Playlists tab (URL: {current_url})")
                return
            
            # Human-like delay before interaction
            await asyncio.sleep(1 + (0.3 * asyncio.get_event_loop().time()) % 0.7)
            
            # First, scroll down a bit to get past the sticky header
            await self.page.evaluate("window.scrollBy(0, 100)")
            await asyncio.sleep(0.5)
            
            # Look for the Playlists tab - prioritize the data-testid selector
            playlist_tab_selectors = [
                '[data-testid="tab-playlists"]',  # Most specific selector
                'a[href*="/playlists"]',  # Link to playlists URL
                '[role="tab"]:has-text("Playlists")',
                'button:has-text("Playlists")',
                'a:has-text("Playlists")',
                'text="Playlists"',  # Move to end as it's more generic
            ]
            
            for selector in playlist_tab_selectors:
                try:
                    locator = self.page.locator(selector).first
                    if await locator.count() > 0:
                        # Use force click to bypass sticky header interception
                        # This is necessary because Spotify's top nav bar intercepts pointer events
                        await locator.click(force=True, timeout=5000)
                        print(f"Clicked Playlists tab with {selector}")
                        
                        # Wait for content to load
                        await asyncio.sleep(2 + (0.5 * asyncio.get_event_loop().time()) % 1)
                        return
                except Exception as e:
                    print(f"Failed to click Playlists tab with {selector}: {e}")
                    continue
            
            # If click methods fail, try JavaScript click as last resort
            try:
                result = await self.page.evaluate('''() => {
                    // Look for any tab-like element with Playlists text
                    const tabs = document.querySelectorAll('[role="tab"], a, button');
                    for (const tab of tabs) {
                        if (tab.textContent && tab.textContent.trim() === 'Playlists') {
                            tab.click();
                            return tab.textContent;
                        }
                    }
                    // Also try finding by href
                    const playlistLink = document.querySelector('a[href*="/playlists"]');
                    if (playlistLink) {
                        playlistLink.click();
                        return 'href-based';
                    }
                    return null;
                }''')
                if result:
                    print(f"Clicked Playlists tab via JavaScript: {result}")
                    await asyncio.sleep(2)
                    return
            except Exception as e:
                print(f"JavaScript click failed: {e}")
            
            # Debug: show what tabs are available
            try:
                visible_tabs = await self.page.evaluate('''() => {
                    const tabs = document.querySelectorAll('[role="tab"], nav a, [class*="tab"]');
                    return Array.from(tabs).map(t => t.textContent?.trim()).filter(t => t);
                }''')
                print(f"  Available tabs on page: {visible_tabs}")
            except:
                pass
            
            print("Could not find Playlists tab, might already be there")
            
        except Exception as e:
            print(f"Error navigating to Playlists tab: {e}")
    
    async def get_song_stats(self) -> Dict[str, Any]:
        """Extract all available song statistics"""
        stats = {}
        
        # Get song title
        try:
            title_selectors = ['[data-testid="song-title"]', 'h1', '.song-title']
            for selector in title_selectors:
                title_element = await self.page.query_selector(selector)
                if title_element:
                    stats['title'] = await title_element.text_content()
                    break
            if 'title' not in stats:
                stats['title'] = 'Unknown'
        except:
            stats['title'] = 'Unknown'
        
        # Get stream count from playlist table (sum of all playlist streams)
        # The Playlists tab doesn't show time-filtered total streams at the top,
        # but we can calculate it by summing the streams from each playlist
        try:
            stats['streams'] = 0  # Will be calculated from playlist table below
        except:
            stats['streams'] = 0
            
        # Get listener count
        try:
            listener_selectors = [
                '[data-testid="listeners-count"]',
                '.listeners-count',
                'text=listeners'
            ]
            for selector in listener_selectors:
                listeners_element = await self.page.query_selector(selector)
                if listeners_element:
                    listeners_text = await listeners_element.text_content()
                    numbers = re.findall(r'[\d,]+', listeners_text)
                    if numbers:
                        stats['listeners'] = int(numbers[0].replace(',', ''))
                        break
            if 'listeners' not in stats:
                stats['listeners'] = 0
        except:
            stats['listeners'] = 0
            
        # Get playlist data from the table
        try:
            playlists = []
            
            # Debug: Check current URL and page state
            current_url = self.page.url
            if 'accounts.spotify.com' in current_url or 'login' in current_url:
                print(f"  WARNING: Page redirected to login: {current_url}")
                stats['playlists'] = []
                return stats
            
            # Look for table rows with playlist data
            table_selectors = [
                'tbody tr',  # Most specific for table body rows
                'table tr',
                '[role="row"]',
                '.playlist-table tr',
                '[data-testid*="playlist"] tr',
            ]
            
            rows = []
            for selector in table_selectors:
                try:
                    found_rows = await self.page.query_selector_all(selector)
                    if found_rows:
                        print(f"  Table selector '{selector}': found {len(found_rows)} rows")
                        if len(found_rows) > 1:  # Skip header row
                            rows = found_rows[1:]  # Skip the first row (header)
                            break
                except Exception as e:
                    print(f"  Table selector '{selector}': error - {e}")
                    continue
            
            if not rows:
                print("  No table rows found, attempting fallback detection...")
                # Try to find any table-like structure
                try:
                    html_tables = await self.page.query_selector_all('table')
                    print(f"  Found {len(html_tables)} <table> elements")
                except:
                    pass
            
            for row in rows:
                try:
                    # Get all cells in the row
                    cells = await row.query_selector_all('td, [role="cell"]')
                    
                    if len(cells) >= 4:  # Ensure we have enough cells
                        # Table structure confirmed from testing
                        
                        # Based on the current JSON data, it seems like:
                        # Cell 0: Rank (1, 2, 3...)
                        # Cell 1: Playlist name (but getting just the rank number somehow)
                        # Cell 2: Made by / Creator (but this contains the actual playlist name)
                        # Cell 3: Streams (but showing as date added in output)
                        # Cell 4: Date added (if exists)
                        
                        # Now we know the correct structure from debug output:
                        # Cell 0: Rank (1, 2, 3...)
                        # Cell 1: Playlist Name (Radio, Release Radar, etc.)
                        # Cell 2: Made by (Spotify, user names, etc.)
                        # Cell 3: Streams count (25,614, 11,195, etc.)
                        # Cell 4: Date added ("—" when not available)
                        
                        rank = await cells[0].text_content() if cells[0] else 'Unknown'
                        playlist_name = await cells[1].text_content() if cells[1] else 'Unknown'
                        made_by = await cells[2].text_content() if cells[2] else 'Unknown'
                        streams = await cells[3].text_content() if cells[3] else '0'
                        
                        # Date added from cell 4 if available
                        date_added = 'Unknown'
                        if len(cells) > 4:
                            date_added = await cells[4].text_content()
                            # Convert "—" to a more readable format
                            if date_added == '—':
                                date_added = 'Not available'
                        
                        # Clean up the data
                        rank = rank.strip() if rank else 'Unknown'
                        playlist_name = playlist_name.strip() if playlist_name else 'Unknown'
                        made_by = made_by.strip() if made_by else 'Unknown'
                        streams = streams.strip() if streams else '0'
                        date_added = date_added.strip() if date_added else 'Unknown'
                        
                        # Clean streams - keep only digits and commas
                        streams_cleaned = re.sub(r'[^\d,]', '', streams) if streams else '0'
                        
                        playlists.append({
                            'rank': rank,
                            'name': playlist_name,
                            'made_by': made_by,
                            'streams': streams_cleaned,
                            'date_added': date_added
                        })
                except Exception as e:
                    print(f"Error extracting playlist row: {e}")
                    continue
            
            stats['playlists'] = playlists
            
            # Calculate total streams from playlists (sum of all playlist streams)
            total_playlist_streams = 0
            for playlist in playlists:
                try:
                    # Remove commas and convert to int
                    stream_count = int(playlist['streams'].replace(',', ''))
                    total_playlist_streams += stream_count
                except:
                    pass
            
            stats['streams'] = total_playlist_streams
            print(f"  Total streams from {len(playlists)} playlists: {total_playlist_streams:,}")
            
            # Also get the total playlist count from the heading
            try:
                heading_selectors = [
                    'h3:has-text("of")',
                    'h2:has-text("of")',
                    '.playlist-count',
                    'text=playlists for this song'
                ]
                
                for selector in heading_selectors:
                    try:
                        heading = await self.page.query_selector(selector)
                        if heading:
                            heading_text = await heading.text_content()
                            # Extract numbers like "Top 25 of 1,570 playlists"
                            numbers = re.findall(r'[\d,]+', heading_text)
                            if len(numbers) >= 2:
                                stats['playlist_stats'] = {
                                    'showing': numbers[0],
                                    'total': numbers[1]
                                }
                                break
                    except:
                        continue
            except:
                pass
                
        except Exception as e:
            print(f"Error getting playlist data: {e}")
            stats['playlists'] = []
            
        # Get time range info
        try:
            time_range_selectors = ['[data-testid="time-range"]', '.time-range', '.date-range']
            for selector in time_range_selectors:
                time_range = await self.page.query_selector(selector)
                if time_range:
                    stats['time_range'] = await time_range.text_content()
                    break
            if 'time_range' not in stats:
                stats['time_range'] = 'All Time'
        except:
            stats['time_range'] = 'All Time'
            
        return stats
    
    async def switch_time_range(self, range_type: str) -> None:
        """Switch between different time ranges using the dropdown (human-like behavior)"""
        try:
            print(f"Switching to {range_type} time range...")
            
            # Human-like delay before starting
            await asyncio.sleep(1.5 + (0.5 * asyncio.get_event_loop().time()) % 1)
            
            # Take a debug screenshot if dropdown not found (will be overwritten on success)
            try:
                await self.page.screenshot(path='./logs/debug_before_dropdown.png')
            except:
                pass
            
            # Look for the dropdown button - it shows current selection like "Last 7 days", "Last 28 days"
            # From the screenshot, we can see there's a dropdown in the top right showing "Last 28 days ∨"
            dropdown_selectors = [
                'button:has-text("Last 28 days")',  # Current selection in screenshot
                'button:has-text("Last 7 days")',
                'button:has-text("Last 24 hours")',
                'button:has-text("Last 12 months")',
                'button:has-text("Last")',  # Generic "Last" text
                # Try various attribute-based selectors
                '[data-testid*="time"]',
                '[data-testid*="dropdown"]',
                '[data-testid*="range"]',
                '[aria-haspopup="listbox"]',
                '[aria-haspopup="menu"]',
                # Role-based selectors
                '[role="button"]:has-text("days")',
                '[role="button"]:has-text("months")',
                '[role="combobox"]',
                # Look for SVG chevron inside button (dropdown indicator)
                'button:has(svg)',
            ]
            
            dropdown_clicked = False
            for selector in dropdown_selectors:
                try:
                    locator = self.page.locator(selector).first
                    if await locator.count() > 0:
                        # Use force click to bypass sticky header interception
                        await locator.click(force=True, timeout=5000)
                        print(f"Clicked dropdown with selector: {selector}")
                        dropdown_clicked = True
                        break
                except Exception as e:
                    print(f"Failed selector {selector}: {e}")
                    continue
            
            if not dropdown_clicked:
                print("Could not find dropdown button")
                # Debug: list all buttons on page
                try:
                    all_buttons = await self.page.locator('button').all_text_contents()
                    print(f"  Available buttons: {all_buttons[:15]}")  # First 15 buttons
                except:
                    pass
                
                # Try JavaScript-based approach as last resort
                try:
                    result = await self.page.evaluate('''() => {
                        // Look for any element that might be a time dropdown
                        const possibleDropdowns = document.querySelectorAll('[class*="dropdown"], [class*="select"], button');
                        for (const el of possibleDropdowns) {
                            const text = el.textContent || '';
                            if (text.includes('Last') && (text.includes('days') || text.includes('months'))) {
                                el.click();
                                return el.textContent;
                            }
                        }
                        return null;
                    }''')
                    if result:
                        print(f"Clicked dropdown via JavaScript: {result}")
                        dropdown_clicked = True
                        await asyncio.sleep(1.5)
                except Exception as e:
                    print(f"JavaScript dropdown click failed: {e}")
                
                if not dropdown_clicked:
                    # Take debug screenshot
                    try:
                        await self.page.screenshot(path='./logs/debug_dropdown_not_found.png')
                        print("  Debug screenshot saved to ./logs/debug_dropdown_not_found.png")
                    except:
                        pass
                    return
            
            # Wait for dropdown to open with human-like delay
            await asyncio.sleep(1.2 + (0.3 * asyncio.get_event_loop().time()) % 0.8)
            
            # Map range types to display text
            range_mapping = {
                '24hour': ['Latest 24 hours', '24 hours', 'Last 24 hours', 'Last day'],
                '7day': ['Last 7 days', '7 days'],
                '28day': ['Last 28 days', '28 days'],
                'all': ['Last 12 months', '12 months', 'All time'],
                '12months': ['Last 12 months', '12 months']
            }
            
            range_options = range_mapping.get(range_type, [range_type])
            
            # Try to click the desired option
            option_clicked = False
            for option_text in range_options:
                option_selectors = [
                    f'text="{option_text}"',
                    f'[role="option"]:has-text("{option_text}")',
                    f'li:has-text("{option_text}")',
                    f'div:has-text("{option_text}")'
                ]
                
                for selector in option_selectors:
                    try:
                        locator = self.page.locator(selector).first
                        if await locator.count() > 0:
                            # Use force click to bypass any interception
                            await locator.click(force=True, timeout=5000)
                            print(f"Selected option: {option_text}")
                            option_clicked = True
                            break
                    except Exception as e:
                        print(f"Failed to click option {option_text} with {selector}: {e}")
                        continue
                        
                if option_clicked:
                    break
            
            if not option_clicked:
                print(f"Could not find option for {range_type}")
                return
            
            # Wait for page to update with human-like delay
            print("Waiting for data to refresh...")
            await asyncio.sleep(2.5 + (0.5 * asyncio.get_event_loop().time()) % 1.5)
            
            # Wait for loading indicators to disappear
            try:
                await self.page.wait_for_selector('.loading, [data-testid="loading"]', state='detached', timeout=5000)
            except:
                pass  # Loading indicator might not be present
            
            print(f"Successfully switched to {range_type}")
                    
        except Exception as e:
            print(f"Failed to switch time range: {e}")
            
    async def get_song_insights(self) -> Dict[str, Any]:
        """Get additional song insights and performance metrics"""
        insights = {}
        
        try:
            # Get source of streams
            sources = await self.page.query_selector_all('[data-testid="stream-source"], .stream-source')
            stream_sources = []
            for source in sources:
                name = await source.query_selector('[data-testid="source-name"], .source-name')
                percentage = await source.query_selector('[data-testid="source-percentage"], .source-percentage')
                stream_sources.append({
                    'name': await name.text_content() if name else 'Unknown',
                    'percentage': await percentage.text_content() if percentage else '0%'
                })
            insights['stream_sources'] = stream_sources
        except:
            insights['stream_sources'] = []
            
        try:
            # Get geographical data
            regions = await self.page.query_selector_all('[data-testid="region-row"], .region-row')
            geographical_data = []
            for region in regions:
                name = await region.query_selector('[data-testid="region-name"], .region-name')
                listeners = await region.query_selector('[data-testid="region-listeners"], .region-listeners')
                geographical_data.append({
                    'region': await name.text_content() if name else 'Unknown',
                    'listeners': await listeners.text_content() if listeners else '0'
                })
            insights['geographical_data'] = geographical_data
        except:
            insights['geographical_data'] = []
            
        return insights