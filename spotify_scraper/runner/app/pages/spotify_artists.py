from playwright.async_api import Page
from typing import Dict, Any, List
import re
import asyncio


class SessionExpiredError(Exception):
    """Raised when Spotify session is no longer valid."""
    pass


class PageNotFoundError(Exception):
    """Raised when the song/artist page doesn't exist (404)."""
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
        
        # Check for 404 "page not found" error
        try:
            not_found = self.page.locator('text="We couldn\'t find that page"')
            if await not_found.count() > 0:
                print(f"⚠️ Page not found (404): {url}")
                raise PageNotFoundError(f"PAGE_NOT_FOUND: {url}")
        except PageNotFoundError:
            raise
        except:
            pass
        
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
            
            # First, scroll to top to ensure dropdown is visible
            await self.page.evaluate("window.scrollTo(0, 0)")
            await asyncio.sleep(0.5)
            
            # Take a debug screenshot before attempting
            try:
                await self.page.screenshot(path='./logs/debug_before_dropdown.png')
            except:
                pass
            
            # 2026 UI Update: Spotify may have moved time range to a filter panel
            # First check if there's a Filter button we need to click
            filter_clicked = False
            filter_selectors = [
                'button:has-text("Filter")',
                '[aria-label*="filter" i]',
                '[data-testid*="filter"]',
                'button:has([aria-label="Filter Icon"])',
            ]
            
            for selector in filter_selectors:
                try:
                    locator = self.page.locator(selector).first
                    if await locator.count() > 0 and await locator.is_visible():
                        await locator.click(force=True, timeout=3000)
                        print(f"Clicked filter button with: {selector}")
                        filter_clicked = True
                        await asyncio.sleep(1)
                        break
                except:
                    continue
            
            # Look for the dropdown button - multiple strategies
            dropdown_selectors = [
                # Text-based selectors for current time range display
                'button:has-text("Last 28 days")',
                'button:has-text("Last 7 days")',
                'button:has-text("24 hours")',
                'button:has-text("12 months")',
                'button:has-text("Last")',
                # Spotify-specific selectors (2026 UI)
                '[data-testid="time-filter"]',
                '[data-testid="date-range-picker"]',
                '[data-testid="timeframe-selector"]',
                '[data-encore-id="dropdownTrigger"]',
                '[data-encore-id="buttonSecondary"]:has-text("Last")',
                '[data-encore-id="buttonSecondary"]:has-text("days")',
                '[data-encore-id="buttonSecondary"]:has-text("months")',
                # Generic dropdown selectors
                '[aria-haspopup="listbox"]',
                '[aria-haspopup="menu"]',
                '[role="combobox"]',
                # Look for select-like elements
                'select',
                '[class*="TimeRange"]',
                '[class*="DateRange"]',
                '[class*="timerange"]',
                '[class*="daterange"]',
            ]
            
            dropdown_clicked = False
            for selector in dropdown_selectors:
                try:
                    locator = self.page.locator(selector).first
                    if await locator.count() > 0:
                        # Check if visible before clicking
                        if await locator.is_visible():
                            await locator.click(force=True, timeout=5000)
                            print(f"Clicked dropdown with selector: {selector}")
                            dropdown_clicked = True
                            break
                except Exception as e:
                    continue
            
            if not dropdown_clicked:
                # Try JavaScript-based detection - look for any time-related dropdown
                try:
                    result = await self.page.evaluate('''() => {
                        // Strategy 1: Find by text content
                        const allElements = document.querySelectorAll('button, [role="button"], [class*="dropdown"], [class*="select"]');
                        for (const el of allElements) {
                            const text = (el.textContent || '').toLowerCase();
                            if ((text.includes('last') || text.includes('24') || text.includes('7 day') || text.includes('28') || text.includes('12 month')) 
                                && el.offsetParent !== null) {
                                el.click();
                                return 'text-match: ' + el.textContent.trim().substring(0, 30);
                            }
                        }
                        
                        // Strategy 2: Find dropdowns near the table/data area
                        const dataArea = document.querySelector('[class*="playlist"], [class*="table"], main');
                        if (dataArea) {
                            const dropdowns = dataArea.querySelectorAll('button, [role="combobox"], [aria-haspopup]');
                            for (const dd of dropdowns) {
                                if (dd.offsetParent !== null && dd.querySelector('svg')) {
                                    dd.click();
                                    return 'svg-dropdown: ' + (dd.textContent || '').trim().substring(0, 30);
                                }
                            }
                        }
                        
                        // Strategy 3: Look in any open filter panel
                        const filterPanel = document.querySelector('[class*="filter"], [class*="Filter"], [role="dialog"]');
                        if (filterPanel) {
                            const options = filterPanel.querySelectorAll('button, [role="option"], [role="menuitem"]');
                            return 'filter-panel-found: ' + options.length + ' options';
                        }
                        
                        return null;
                    }''')
                    if result:
                        print(f"Dropdown interaction via JavaScript: {result}")
                        if not result.startswith('filter-panel-found'):
                            dropdown_clicked = True
                        await asyncio.sleep(1.5)
                except Exception as e:
                    print(f"JavaScript dropdown detection failed: {e}")
            
            if not dropdown_clicked:
                print("Could not find dropdown button")
                # Debug: list all visible interactive elements
                try:
                    debug_info = await self.page.evaluate('''() => {
                        const buttons = Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent !== null);
                        return buttons.slice(0, 20).map(b => ({
                            text: (b.textContent || '').trim().substring(0, 40),
                            class: b.className.substring(0, 50),
                            testid: b.getAttribute('data-testid')
                        }));
                    }''')
                    print(f"  Visible buttons: {debug_info}")
                except:
                    pass
                
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
                '24hour': ['24 hours', 'Latest 24 hours', 'Last 24 hours', 'Last day', '1 day'],
                '7day': ['7 days', 'Last 7 days', '1 week'],
                '28day': ['28 days', 'Last 28 days', '4 weeks', '1 month'],
                'all': ['12 months', 'Last 12 months', 'All time', '1 year'],
                '12months': ['12 months', 'Last 12 months', '1 year']
            }
            
            range_options = range_mapping.get(range_type, [range_type])
            
            # Try to click the desired option
            option_clicked = False
            for option_text in range_options:
                option_selectors = [
                    f'[role="option"]:has-text("{option_text}")',
                    f'[role="menuitem"]:has-text("{option_text}")',
                    f'[role="menuitemradio"]:has-text("{option_text}")',
                    f'li:has-text("{option_text}")',
                    f'div[class*="option"]:has-text("{option_text}")',
                    f'button:has-text("{option_text}")',
                    f'text="{option_text}"',
                ]
                
                for selector in option_selectors:
                    try:
                        locator = self.page.locator(selector).first
                        if await locator.count() > 0 and await locator.is_visible():
                            await locator.click(force=True, timeout=5000)
                            print(f"Selected option: {option_text}")
                            option_clicked = True
                            break
                    except Exception as e:
                        continue
                        
                if option_clicked:
                    break
            
            # If still not clicked, try JavaScript approach
            if not option_clicked:
                try:
                    for option_text in range_options:
                        result = await self.page.evaluate(f'''(targetText) => {{
                            const options = document.querySelectorAll('[role="option"], [role="menuitem"], li, [class*="option"]');
                            for (const opt of options) {{
                                if (opt.textContent && opt.textContent.toLowerCase().includes(targetText.toLowerCase()) && opt.offsetParent !== null) {{
                                    opt.click();
                                    return opt.textContent.trim();
                                }}
                            }}
                            return null;
                        }}''', option_text)
                        if result:
                            print(f"Selected option via JavaScript: {result}")
                            option_clicked = True
                            break
                except Exception as e:
                    print(f"JavaScript option selection failed: {e}")
            
            if not option_clicked:
                print(f"Could not find option for {range_type}")
                # If we clicked a filter button, we might need to click Apply
                if filter_clicked:
                    try:
                        apply_btn = self.page.locator('button:has-text("Apply")').first
                        if await apply_btn.count() > 0:
                            await apply_btn.click()
                            print("Clicked Apply button")
                    except:
                        pass
                return
            
            # Wait for page to update with human-like delay
            print("Waiting for data to refresh...")
            await asyncio.sleep(2.5 + (0.5 * asyncio.get_event_loop().time()) % 1.5)
            
            # Wait for loading indicators to disappear
            try:
                await self.page.wait_for_selector('.loading, [data-testid="loading"], [class*="spinner"]', state='detached', timeout=5000)
            except:
                pass  # Loading indicator might not be present
            
            # Additional wait for table data to refresh
            await asyncio.sleep(1)
            
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