#!/usr/bin/env python3
"""
Roster Page Navigator for Spotify for Artists
Handles navigation, artist search, and SFA URL extraction
"""
from playwright.async_api import Page
from typing import List, Dict, Any, Optional
import asyncio
import re


class RosterPage:
    """Handles Spotify for Artists Roster page interactions"""
    
    def __init__(self, page: Page):
        self.page = page
        self.base_url = "https://artists.spotify.com/c/roster"
    
    async def navigate_to_roster(self) -> None:
        """Navigate to the main Roster page"""
        print("📋 Navigating to Roster page...")
        
        try:
            await self.page.goto(self.base_url, wait_until='networkidle', timeout=30000)
            await asyncio.sleep(2)
            
            # Wait for roster content to load
            try:
                # Try multiple selectors
                await self.page.wait_for_selector('text=Artist', timeout=5000)
            except:
                print("   ⚠️  Roster page may not have loaded completely")
            
            print("   ✅ Roster page loaded")
        except Exception as e:
            print(f"   ❌ Failed to navigate to Roster: {e}")
            raise
    
    async def get_all_artists(self) -> List[Dict[str, Any]]:
        """
        Get list of all artists in roster
        
        Returns:
            List of dicts with 'name' and 'element' for each artist
        """
        print("🎤 Fetching all artists from roster...")
        
        artists = []
        
        # Scroll to load all artists (lazy loading)
        await self.scroll_to_bottom()
        
        # Try to find artist elements
        # Spotify for Artists uses various selectors, try multiple approaches
        selectors_to_try = [
            '[data-testid="roster-artist"]',
            '[data-testid="artist-row"]',
            'tr[data-testid*="artist"]',
            'div[role="row"]',
            'a[href*="/artist/"]'
        ]
        
        artist_elements = []
        for selector in selectors_to_try:
            try:
                elements = await self.page.query_selector_all(selector)
                if elements:
                    artist_elements = elements
                    print(f"   Found {len(elements)} elements with selector: {selector}")
                    break
            except:
                continue
        
        if not artist_elements:
            print("   ⚠️  No artist elements found, trying alternative method...")
            # Try getting all links that contain /artist/
            artist_elements = await self.page.query_selector_all('a[href*="/artist/"]')
        
        for element in artist_elements:
            try:
                # Extract artist name (try multiple methods)
                artist_name = None
                
                # Method 1: Direct text content
                text = await element.text_content()
                if text and text.strip():
                    artist_name = text.strip()
                
                # Method 2: Look for specific text elements
                if not artist_name:
                    name_element = await element.query_selector('h3, h2, [class*="name"], [class*="artist"]')
                    if name_element:
                        artist_name = await name_element.text_content()
                
                # Extract artist URL/ID
                artist_url = await element.get_attribute('href')
                
                if artist_name and artist_name not in ['', 'Roster', 'Artist']:
                    # Clean up the name
                    artist_name = artist_name.strip()
                    
                    # Skip if it's a duplicate
                    if any(a['name'] == artist_name for a in artists):
                        continue
                    
                    artists.append({
                        'name': artist_name,
                        'url': artist_url or '',
                        'element': element
                    })
            except Exception as e:
                continue
        
        print(f"✅ Found {len(artists)} unique artists in roster")
        return artists
    
    async def find_artist(self, artist_name: str) -> Optional[Dict[str, Any]]:
        """
        Find a specific artist in the roster
        
        Args:
            artist_name: Name of the artist to find (e.g., "Segan")
            
        Returns:
            Dict with artist info or None if not found
        """
        print(f"🔍 Searching for artist: {artist_name}")
        
        # Get all artists
        artists = await self.get_all_artists()
        
        # Fuzzy match (case-insensitive, handle variations)
        for artist in artists:
            if self.names_match(artist_name, artist['name']):
                print(f"   ✅ Found: {artist['name']}")
                return artist
        
        print(f"   ❌ Artist not found: {artist_name}")
        return None
    
    def names_match(self, name1: str, name2: str) -> bool:
        """Check if two artist names match (fuzzy matching)"""
        # Normalize names
        n1 = name1.lower().strip()
        n2 = name2.lower().strip()
        
        # Exact match
        if n1 == n2:
            return True
        
        # Remove special characters and compare
        n1_clean = re.sub(r'[^a-z0-9]', '', n1)
        n2_clean = re.sub(r'[^a-z0-9]', '', n2)
        
        if n1_clean == n2_clean:
            return True
        
        # Check if one contains the other (for cases like "Reece Rose" vs "Reece Rosé")
        if n1_clean in n2_clean or n2_clean in n1_clean:
            return True
        
        return False
    
    async def navigate_to_artist(self, artist_info: Dict[str, Any]) -> None:
        """Navigate to a specific artist's page"""
        print(f"📂 Opening artist: {artist_info['name']}")
        
        try:
            if artist_info.get('url') and artist_info['url'].startswith('/'):
                # Navigate directly via URL
                full_url = f"https://artists.spotify.com{artist_info['url']}"
                await self.page.goto(full_url, wait_until='networkidle', timeout=30000)
            else:
                # Click on the artist element
                await artist_info['element'].click()
                await self.page.wait_for_load_state('networkidle', timeout=30000)
            
            await asyncio.sleep(2)
            print(f"   ✅ Loaded artist page")
        except Exception as e:
            print(f"   ❌ Failed to navigate to artist: {e}")
            raise
    
    async def get_artist_songs(self, artist_info: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Get all songs for an artist from their page
        
        Args:
            artist_info: Artist info dict from find_artist()
            
        Returns:
            List of song dicts with name, url, sfa_url, etc.
        """
        # Navigate to the artist's page first
        await self.navigate_to_artist(artist_info)
        
        print(f"🎵 Scraping songs for: {artist_info['name']}")
        
        songs = []
        
        # Scroll to load all songs
        await self.scroll_to_bottom()
        
        # Find song elements (try multiple selectors)
        selectors_to_try = [
            '[data-testid="song-row"]',
            '[data-testid*="track"]',
            'tr[data-testid*="song"]',
            'a[href*="/song/"]'
        ]
        
        song_elements = []
        for selector in selectors_to_try:
            try:
                elements = await self.page.query_selector_all(selector)
                if elements:
                    song_elements = elements
                    print(f"   Found {len(elements)} song elements with selector: {selector}")
                    break
            except:
                continue
        
        if not song_elements:
            # Fallback: find all links containing /song/
            song_elements = await self.page.query_selector_all('a[href*="/song/"]')
        
        for element in song_elements:
            try:
                # Extract song name
                song_name = None
                text = await element.text_content()
                if text and text.strip():
                    song_name = text.strip()
                
                if not song_name:
                    name_element = await element.query_selector('[class*="title"], [class*="name"], h3, h4')
                    if name_element:
                        song_name = await name_element.text_content()
                
                # Extract song SFA URL
                song_url = await element.get_attribute('href')
                
                if song_name and song_url:
                    # Construct full SFA URL
                    if song_url.startswith('/'):
                        sfa_url = f"https://artists.spotify.com{song_url}"
                    else:
                        sfa_url = song_url
                    
                    # Ensure it ends with /stats
                    if '/stats' not in sfa_url:
                        sfa_url = f"{sfa_url}/stats" if sfa_url.endswith('/') else f"{sfa_url}/stats"
                    
                    # Extract track ID from URL
                    track_id = self.extract_track_id_from_sfa_url(sfa_url)
                    
                    # Clean song name
                    song_name = song_name.strip()
                    
                    # Skip duplicates
                    if any(s['name'] == song_name for s in songs):
                        continue
                    
                    songs.append({
                        'name': song_name,
                        'sfa_url': sfa_url,
                        'track_id': track_id,
                        'element': element
                    })
            except Exception as e:
                continue
        
        print(f"   ✅ Found {len(songs)} songs")
        return songs
    
    def extract_track_id_from_sfa_url(self, sfa_url: str) -> Optional[str]:
        """
        Extract track ID from SFA URL
        
        Example:
            "https://artists.spotify.com/c/artist/.../song/0LfS8z5VUqkD9WlMLOZskY/stats"
            → "0LfS8z5VUqkD9WlMLOZskY"
        """
        match = re.search(r'/song/([a-zA-Z0-9]+)', sfa_url)
        return match.group(1) if match else None
    
    async def scroll_to_bottom(self) -> None:
        """Scroll to bottom of page to trigger lazy loading"""
        last_height = await self.page.evaluate('document.body.scrollHeight')
        
        while True:
            # Scroll down
            await self.page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
            await asyncio.sleep(1.5)
            
            # Calculate new height
            new_height = await self.page.evaluate('document.body.scrollHeight')
            
            if new_height == last_height:
                break
            
            last_height = new_height
    
    def find_song_match(self, target_song_name: str, roster_songs: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Find a song in the roster that matches the target song name
        
        Args:
            target_song_name: Song name to find (e.g., "DNBMF", "The Same")
            roster_songs: List of songs from get_artist_songs()
            
        Returns:
            Matching song dict or None
        """
        target_clean = target_song_name.lower().strip()
        target_alphanum = re.sub(r'[^a-z0-9]', '', target_clean)
        
        for song in roster_songs:
            song_clean = song['name'].lower().strip()
            song_alphanum = re.sub(r'[^a-z0-9]', '', song_clean)
            
            # Exact match
            if target_clean == song_clean:
                return song
            
            # Alphanumeric match
            if target_alphanum == song_alphanum:
                return song
            
            # Contains match (for partial names)
            if target_alphanum in song_alphanum or song_alphanum in target_alphanum:
                return song
        
        return None

