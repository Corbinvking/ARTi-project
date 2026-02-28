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
    
    async def navigate_to_song(self, url: str, target_tab: str = 'stats') -> None:
        """Navigate to a song's page and wait for data to load.
        
        Args:
            url: The S4A song URL (can end in /stats, /playlists, etc.)
            target_tab: Which tab to land on -- 'stats' for Overview, 'playlists' for Playlists
        """
        # Normalize the URL to the desired tab
        # Strip any existing tab suffix and append the target
        base_url = re.sub(r'/(stats|playlists|source-of-stream|location)$', '', url)
        if target_tab == 'playlists':
            url = base_url + '/playlists'
        elif target_tab == 'location':
            url = base_url + '/location'
        else:
            url = base_url + '/stats'
        
        print(f"Navigating to song ({target_tab}): {url}")
        
        # Human-like navigation delay
        await asyncio.sleep(1 + (0.5 * asyncio.get_event_loop().time()) % 1)
        
        await self.page.goto(url, wait_until='networkidle')
        
        # Human-like delay after navigation
        await asyncio.sleep(2.5 + (0.5 * asyncio.get_event_loop().time()) % 1.5)
        
        # CRITICAL: Check if we were redirected to login page
        current_url = self.page.url
        if 'accounts.spotify.com' in current_url or 'login' in current_url.lower():
            print(f"⚠️ Redirected to login page: {current_url}")
            raise SessionExpiredError("SESSION_EXPIRED: Redirected to login page when accessing song")
        
        # Check for 404 "page not found" error (hardened -- no bare except)
        try:
            not_found = self.page.locator('text="We couldn\'t find that page"')
            if await not_found.count() > 0:
                print(f"⚠️ Page not found (404): {url}")
                raise PageNotFoundError(f"PAGE_NOT_FOUND: {url}")
        except PageNotFoundError:
            raise
        except Exception:
            pass  # Locator error, not a 404
        
        # Secondary 404 check: scan body text
        try:
            body_text = await self.page.locator('body').text_content()
            if body_text and "couldn't find" in body_text.lower():
                print(f"⚠️ Page not found (404, body text): {url}")
                raise PageNotFoundError(f"PAGE_NOT_FOUND: {url}")
        except PageNotFoundError:
            raise
        except Exception:
            pass
        
        # Check for error messages
        await self.check_for_errors()
        
        # Wait for key elements that indicate the page is loaded
        try:
            await self.page.wait_for_selector('h1', timeout=10000)
        except Exception:
            # Final check - if we're still on login page, raise session expired
            current_url = self.page.url
            if 'accounts.spotify.com' in current_url or 'login' in current_url.lower():
                raise SessionExpiredError("SESSION_EXPIRED: Still on login page")
            # Try a broader selector
            try:
                await self.page.wait_for_selector('[class*="title"]', timeout=5000)
            except Exception:
                pass  # Page may still be usable
        
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
        
    async def get_alltime_streams(self) -> int:
        """Extract the all-time total streams from the song header on the Overview (/stats) page.
        
        This is the big number displayed under the song name, next to the release date.
        Must be called while on the /stats page (before navigating to /playlists).
        """
        try:
            print("Extracting all-time streams from song header...")
            
            # The hero stats button shows the total streams for the selected period.
            # data-testid="hero-stats-button-streams" contains text like "Streams689,138"
            # We need to extract the number from it.
            hero_btn = await self.page.query_selector('[data-testid="hero-stats-button-streams"]')
            if hero_btn:
                text = await hero_btn.text_content()
                # Text is like "Streams689,138" or "Streams1,234,567"
                # Remove the "Streams" prefix and extract numbers
                numbers = re.findall(r'[\d,]+', text or '')
                if numbers:
                    # Take the largest number (the stream count)
                    stream_values = [int(n.replace(',', '')) for n in numbers]
                    hero_streams = max(stream_values)
                    print(f"  Hero streams button: {hero_streams:,}")
                    # Note: this is period-specific, not all-time. But let's also check
                    # for an all-time number in the song header area.
            
            # Try to find the all-time total in the song header/metadata area.
            # Look for large numbers near the song title that aren't in the stats section.
            alltime = await self.page.evaluate('''() => {
                // Strategy 1: Look for elements with "streams" or "total" in their attributes
                const candidates = document.querySelectorAll(
                    '[data-testid*="total"], [data-testid*="alltime"], [data-testid*="all-time"]'
                );
                for (const el of candidates) {
                    const text = (el.textContent || '').replace(/[^\\d]/g, '');
                    if (text.length > 0) return parseInt(text);
                }
                
                // Strategy 2: Look in the song header area for a formatted number
                // The header typically contains: song name, artist name, release date, total streams
                const header = document.querySelector('[data-testid="song-header"], header, [class*="Header"]');
                if (header) {
                    // Find all text nodes with large formatted numbers (e.g., "1,234,567")
                    const walker = document.createTreeWalker(header, NodeFilter.SHOW_TEXT);
                    let maxNum = 0;
                    while (walker.nextNode()) {
                        const text = walker.currentNode.textContent.trim();
                        const match = text.match(/^[\\d,]+$/);
                        if (match) {
                            const num = parseInt(match[0].replace(/,/g, ''));
                            if (num > maxNum) maxNum = num;
                        }
                    }
                    if (maxNum > 0) return maxNum;
                }
                
                // Strategy 3: The hero stats button with the selected period's streams
                // When no explicit all-time is found, use the 12-month chip to get the longest range
                return null;
            }''')
            
            if alltime and alltime > 0:
                print(f"  All-time streams from header: {alltime:,}")
                return alltime
            
            # Fallback: click the "12 months" chip to get the longest available range
            # and read the hero streams value
            print("  No explicit all-time number found, trying 12-month chip...")
            try:
                chip_12m = self.page.locator('[data-encore-id="chipFilter"]:has-text("12 months")').first
                if await chip_12m.count() > 0:
                    await chip_12m.click(force=True, timeout=3000)
                    await asyncio.sleep(2)
                    
                    hero_btn = await self.page.query_selector('[data-testid="hero-stats-button-streams"]')
                    if hero_btn:
                        text = await hero_btn.text_content()
                        numbers = re.findall(r'[\d,]+', text or '')
                        if numbers:
                            stream_values = [int(n.replace(',', '')) for n in numbers]
                            result = max(stream_values)
                            print(f"  12-month streams (best available): {result:,}")
                            return result
            except Exception as e:
                print(f"  Error clicking 12-month chip: {e}")
            
            # Last resort: read whatever the hero button currently shows
            hero_btn = await self.page.query_selector('[data-testid="hero-stats-button-streams"]')
            if hero_btn:
                text = await hero_btn.text_content()
                numbers = re.findall(r'[\d,]+', text or '')
                if numbers:
                    stream_values = [int(n.replace(',', '')) for n in numbers]
                    result = max(stream_values)
                    print(f"  Hero streams (current period fallback): {result:,}")
                    return result
            
            print("  Could not extract all-time streams")
            return 0
            
        except Exception as e:
            print(f"Error extracting all-time streams: {e}")
            return 0

    async def get_period_streams(self, range_type: str) -> int:
        """Read total streams from the Overview (/stats) page for a specific time range.

        Clicks the chip filter for the requested period, then reads the hero
        stats button which shows the true total streams (not just playlist streams).

        Must be called while on the /stats page.
        """
        chip_labels = {
            '7day':     '7 days',
            '28day':    '28 days',
            '12months': '12 months',
        }
        label = chip_labels.get(range_type)
        if not label:
            print(f"  Unknown range type for period streams: {range_type}")
            return 0

        try:
            chip = self.page.locator(f'[data-encore-id="chipFilter"]:has-text("{label}")').first
            if await chip.count() == 0:
                print(f"  Chip filter '{label}' not found on page")
                return 0

            await chip.click(force=True, timeout=5000)
            await asyncio.sleep(2)

            hero_btn = await self.page.query_selector('[data-testid="hero-stats-button-streams"]')
            if hero_btn:
                text = await hero_btn.text_content()
                numbers = re.findall(r'[\d,]+', text or '')
                if numbers:
                    stream_values = [int(n.replace(',', '')) for n in numbers]
                    result = max(stream_values)
                    print(f"  {label} total streams (overview): {result:,}")
                    return result

            print(f"  Could not read hero streams for {label}")
            return 0

        except Exception as e:
            print(f"  Error reading period streams for {label}: {e}")
            return 0

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
        """Extract playlist data from the S4A Playlists tab.
        
        Uses the 2026 S4A UI structure:
          - Table: data-testid="sort-table"
          - Body rows: data-testid="sort-table-body-row"
          - Each row has cells: rank, playlist name, made by, streams, date added
        """
        stats: Dict[str, Any] = {'title': 'Unknown', 'streams': 0, 'listeners': 0, 'playlists': []}
        
        # Get song title
        try:
            h1 = await self.page.query_selector('h1')
            if h1:
                stats['title'] = (await h1.text_content() or 'Unknown').strip()
        except Exception:
            pass
        
        # Check we're not on a login page
        current_url = self.page.url
        if 'accounts.spotify.com' in current_url or 'login' in current_url:
            print(f"  WARNING: Page redirected to login: {current_url}")
            return stats
        
        # ----- Extract playlist rows from sort-table (2026 UI) -----
        playlists = []
        try:
            # Primary: use data-testid selectors
            rows = await self.page.query_selector_all('[data-testid="sort-table-body-row"]')
            
            # Fallback: generic table body rows
            if not rows:
                rows = await self.page.query_selector_all('tbody tr')
                if rows and len(rows) > 0:
                    rows = rows  # tbody tr already excludes the header in most cases
            
            if not rows:
                print("  No playlist table rows found")
            else:
                print(f"  Found {len(rows)} playlist rows")
            
            for row in rows:
                try:
                    # Get all cells -- the sort-table uses <td> elements
                    cells = await row.query_selector_all('td')
                    if not cells or len(cells) < 4:
                        # Try broader cell selector
                        cells = await row.query_selector_all('[role="cell"], > div')
                    
                    if len(cells) >= 4:
                        # 2026 S4A Playlists table structure (confirmed from diagnostic):
                        # Cell 0: Rank number (1, 2, 3...)
                        # Cell 1: Playlist name (Radio, Mixes, etc.)
                        # Cell 2: Made by (Spotify, user name, or "—")
                        # Cell 3: Streams count (78,360)
                        # Cell 4: Date added (Jan 7, 2026 or "—")
                        
                        rank = (await cells[0].text_content() or '').strip()
                        playlist_name = (await cells[1].text_content() or '').strip()
                        made_by = (await cells[2].text_content() or '').strip()
                        streams_text = (await cells[3].text_content() or '').strip()
                        
                        date_added = ''
                        if len(cells) > 4:
                            date_added = (await cells[4].text_content() or '').strip()
                            if date_added == '\u2014':  # em dash
                                date_added = ''
                        
                        # Clean streams: keep only digits
                        streams_cleaned = re.sub(r'[^\d]', '', streams_text) or '0'
                        
                        playlists.append({
                            'rank': rank,
                            'name': playlist_name,
                            'made_by': made_by,
                            'streams': streams_cleaned,
                            'date_added': date_added
                        })
                except Exception as e:
                    print(f"  Error extracting row: {e}")
                    continue
        except Exception as e:
            print(f"  Error reading playlist table: {e}")
        
        stats['playlists'] = playlists
        
        # Calculate total streams by summing all playlist streams
        total_streams = 0
        for p in playlists:
            try:
                total_streams += int(p['streams'])
            except (ValueError, TypeError):
                pass
        
        stats['streams'] = total_streams
        print(f"  Total streams from {len(playlists)} playlists: {total_streams:,}")
        
        return stats
    
    async def get_location_data(self) -> list:
        """Extract the 'Top countries for this song' table from the S4A Location tab.

        Returns a list of dicts: [{rank, country, streams}, ...]
        Must be called while on the /location page.
        """
        countries = []

        try:
            current_url = self.page.url
            if 'accounts.spotify.com' in current_url or 'login' in current_url:
                print(f"  WARNING: Page redirected to login: {current_url}")
                return countries

            # Ensure 28-day view is selected via dropdown if present
            try:
                dropdown = self.page.locator('button[aria-haspopup="listbox"]').first
                if await dropdown.count() > 0:
                    current_text = (await dropdown.text_content() or '').strip()
                    if '28' not in current_text:
                        await dropdown.click(force=True, timeout=3000)
                        await asyncio.sleep(1)
                        opt = self.page.locator('[role="option"]:has-text("Last 28 Days")').first
                        if await opt.count() > 0:
                            await opt.click(force=True, timeout=3000)
                            await asyncio.sleep(2)
                        else:
                            await self.page.keyboard.press('Escape')
                            await asyncio.sleep(0.5)
            except Exception as e:
                print(f"  Could not switch location dropdown to 28 days: {e}")

            # Scroll down to reveal the "Top countries" table
            await self.page.evaluate("window.scrollTo(0, document.body.scrollHeight / 2)")
            await asyncio.sleep(1)

            await asyncio.sleep(2)

            rows = await self.page.query_selector_all('[data-testid="sort-table-body-row"]')
            if not rows:
                rows = await self.page.query_selector_all('tbody tr')

            if not rows:
                print("  No country table rows found on Location tab")
                return countries

            print(f"  Found {len(rows)} country rows")

            # Diagnostic: log first row structure
            if rows:
                first_cells = await rows[0].query_selector_all('td')
                if not first_cells:
                    first_cells = await rows[0].query_selector_all('[role="cell"], > div')
                cell_texts = []
                for c in (first_cells or []):
                    cell_texts.append((await c.text_content() or '').strip())
                print(f"  First row cells ({len(first_cells or [])}): {cell_texts}")

            for row in rows:
                try:
                    cells = await row.query_selector_all('td')
                    if not cells or len(cells) < 2:
                        cells = await row.query_selector_all('[role="cell"], > div')

                    cell_values = []
                    for c in (cells or []):
                        cell_values.append((await c.text_content() or '').strip())

                    # Determine which cells are rank, country, and streams
                    # by analyzing content: numbers-only = rank or streams, text = country
                    rank_val = len(countries) + 1
                    country_val = ''
                    streams_val = 0

                    if len(cell_values) >= 3:
                        rank_val = int(cell_values[0]) if cell_values[0].isdigit() else len(countries) + 1
                        country_val = cell_values[1]
                        streams_val = int(re.sub(r'[^\d]', '', cell_values[2]) or '0')
                    elif len(cell_values) == 2:
                        # Two-column layout: country and streams
                        country_val = cell_values[0]
                        streams_val = int(re.sub(r'[^\d]', '', cell_values[1]) or '0')

                    # Skip if country looks like a number (wrong data) or is empty
                    if not country_val or country_val == '\u2014':
                        continue
                    # If country is purely numeric, it's not a country name
                    if re.match(r'^[\d,. ]+$', country_val):
                        continue

                    countries.append({
                        'rank': rank_val,
                        'country': country_val,
                        'streams': streams_val,
                    })
                except Exception as e:
                    print(f"  Error extracting country row: {e}")
                    continue

        except Exception as e:
            print(f"  Error reading location data: {e}")

        print(f"  Extracted {len(countries)} countries from Location tab")
        return countries

    async def _try_switch_dropdown(self, target_label: str) -> bool:
        """Attempt to switch the playlists page dropdown to the target time range.
        Returns True if the switch was confirmed, False otherwise."""
        
        # Scroll to top so dropdown is visible
        await self.page.evaluate("window.scrollTo(0, 0)")
        await asyncio.sleep(0.5)
        
        # Find the playlists page dropdown (aria-haspopup="listbox")
        dropdown_btn = self.page.locator('button[aria-haspopup="listbox"]').first
        
        if await dropdown_btn.count() == 0 or not await dropdown_btn.is_visible():
            print(f"  WARNING: No dropdown found on page -- cannot switch time range")
            print(f"  Current URL: {self.page.url}")
            return False
        
        current_text = (await dropdown_btn.text_content() or '').strip()
        
        # If already showing the desired range, confirm and return
        if target_label.lower() in current_text.lower():
            print(f"  Already on {target_label}")
            return True
        
        # Click to open the dropdown
        await dropdown_btn.click(force=True, timeout=5000)
        print(f"  Opened dropdown (was: {current_text})")
        await asyncio.sleep(1.5)
        
        # Try to select the desired option
        option_clicked = False
        
        for sel in [f'[role="option"]:has-text("{target_label}")', f'li:has-text("{target_label}")']:
            try:
                opt = self.page.locator(sel).first
                if await opt.count() > 0 and await opt.is_visible():
                    await opt.click(force=True, timeout=3000)
                    option_clicked = True
                    break
            except Exception:
                continue
        
        # JavaScript fallback
        if not option_clicked:
            target_lower = target_label.lower()
            result = await self.page.evaluate(f'''() => {{
                const opts = document.querySelectorAll('[role="option"], [role="listbox"] li, li');
                for (const o of opts) {{
                    const text = (o.textContent || '').toLowerCase().trim();
                    if (text.includes("{target_lower}") && o.offsetParent !== null) {{
                        o.click();
                        return true;
                    }}
                }}
                return false;
            }}''')
            option_clicked = bool(result)
        
        if not option_clicked:
            print(f"  WARNING: Could not find option '{target_label}' in dropdown")
            await self.page.keyboard.press('Escape')
            await asyncio.sleep(0.5)
            return False
        
        # Wait for table to refresh after selection
        await asyncio.sleep(2)
        
        # VERIFY: Re-read dropdown text to confirm the switch actually happened
        try:
            new_text = (await dropdown_btn.text_content() or '').strip()
            if target_label.lower() in new_text.lower():
                print(f"  Confirmed: dropdown now shows '{new_text}'")
            else:
                print(f"  WARNING: Dropdown still shows '{new_text}' (expected '{target_label}')")
                return False
        except Exception:
            pass  # Dropdown might have re-rendered, don't fail on verification read
        
        # Wait for sort-table rows to appear (confirms data loaded)
        try:
            await self.page.wait_for_selector('[data-testid="sort-table-body-row"]', timeout=8000)
        except Exception:
            print(f"  WARNING: Table rows did not appear after switching to {target_label}")
        
        return True

    async def switch_time_range(self, range_type: str) -> None:
        """Switch between different time ranges using the playlists page dropdown.
        
        Includes verification that the switch actually happened and a single retry.
        
        Args:
            range_type: One of '7day', '28day', '12months'
        """
        try:
            print(f"Switching to {range_type} time range...")
            await asyncio.sleep(1)
            
            range_labels = {
                '7day':     'Last 7 days',
                '28day':    'Last 28 days',
                '12months': 'Last 12 months',
            }
            
            target_label = range_labels.get(range_type)
            if not target_label:
                print(f"  Unknown range type: {range_type}, skipping")
                return
            
            # First attempt
            success = await self._try_switch_dropdown(target_label)
            
            if not success:
                # Retry once: scroll, wait, try again
                print(f"  Retrying dropdown switch for {target_label}...")
                await asyncio.sleep(2)
                success = await self._try_switch_dropdown(target_label)
                
                if not success:
                    print(f"  FAILED: Could not switch to {range_type} after retry")
                    
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