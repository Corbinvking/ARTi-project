# 🎯 Spotify for Artists Roster Scraper - Master Plan

## 📋 Executive Summary

Build an automated scraper that:
1. Reads active campaigns from `Spotify Playlisting-Active Campaigns.csv`
2. Extracts artist names and song names
3. Navigates to Spotify for Artists → Roster section
4. Finds and scrapes stream data for each song
5. Saves data in a unified format for dashboard integration

---

## 🎨 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    ROSTER SCRAPER WORKFLOW                       │
└─────────────────────────────────────────────────────────────────┘

1. CSV INPUT                           2. ROSTER NAVIGATION
   ┌──────────────────┐                  ┌──────────────────┐
   │ Active Campaigns │─────Parse───────▶│ Artist Names     │
   │ CSV File         │                  │ + Song Names     │
   └──────────────────┘                  └──────────────────┘
                                                  │
                                                  ▼
3. SPOTIFY FOR ARTISTS                 4. DATA EXTRACTION
   ┌──────────────────┐                  ┌──────────────────┐
   │ Roster Page      │◀────Navigate─────│ Find Each Song   │
   │ Per Artist       │                  │ Get Stream Data  │
   └──────────────────┘                  └──────────────────┘
                                                  │
                                                  ▼
5. DATA STORAGE                        6. DATABASE SYNC
   ┌──────────────────┐                  ┌──────────────────┐
   │ JSON Files       │────Import────────▶│ Supabase DB     │
   │ Structured Data  │                  │ Campaign Updates │
   └──────────────────┘                  └──────────────────┘
```

---

## 🗂️ Project Structure

```
roster_scraper/
├── README.md                          # Documentation
├── requirements.txt                   # Python dependencies
├── run_roster_scraper.py             # Main entry point
├── config.py                         # Configuration settings
│
├── runner/
│   ├── __init__.py
│   ├── app/
│   │   ├── __init__.py
│   │   ├── scraper.py               # Core scraper class
│   │   ├── csv_parser.py            # CSV parsing logic
│   │   └── pages/
│   │       ├── __init__.py
│   │       ├── roster_page.py       # Roster page interactions
│   │       └── song_page.py         # Song data extraction
│   │
│   └── utils/
│       ├── __init__.py
│       ├── data_formatter.py        # Format scraped data
│       └── browser_utils.py         # Browser automation helpers
│
├── data/
│   ├── browser_data/                # Persistent browser session
│   ├── raw/                         # Raw scraped JSON
│   ├── processed/                   # Processed/validated data
│   └── logs/                        # Scraping logs
│
└── scripts/
    ├── import-roster-data.js        # Import to Supabase
    ├── validate-roster-data.js      # Data validation
    └── sync-with-campaigns.js       # Sync with existing campaigns
```

---

## 🔧 Technical Implementation

### Phase 1: CSV Parser & Campaign Extraction

**File**: `runner/app/csv_parser.py`

```python
import csv
import re
from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class CampaignSong:
    """Represents a song from an active campaign"""
    campaign_name: str          # e.g., "Segan - DNBMF"
    artist_name: str            # e.g., "Segan"
    song_name: str              # e.g., "DNBMF"
    client_name: str            # e.g., "Majed"
    spotify_url: str            # Track URL (if available)
    sfa_url: str                # SFA URL (if available)
    goal: int                   # Stream goal
    remaining: int              # Remaining streams
    daily: int                  # Daily streams
    weekly: int                 # Weekly streams
    vendor: str                 # Vendor name
    status: str                 # Campaign status
    start_date: str             # Start date

class CampaignCSVParser:
    """Parse Spotify Playlisting-Active Campaigns.csv"""
    
    def __init__(self, csv_path: str):
        self.csv_path = csv_path
        self.campaigns: List[CampaignSong] = []
    
    def parse(self) -> List[CampaignSong]:
        """Parse CSV and extract all campaign songs"""
        
        with open(self.csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                # Skip if not Active status
                if row.get('Status', '').lower() != 'active':
                    continue
                
                # Parse campaign name to extract artist and song
                campaign_name = row.get('Campaign', '').strip()
                if not campaign_name:
                    continue
                
                # Split "Artist - Song" format
                artist_name, song_name = self.parse_campaign_name(campaign_name)
                
                # Create CampaignSong object
                song = CampaignSong(
                    campaign_name=campaign_name,
                    artist_name=artist_name,
                    song_name=song_name,
                    client_name=row.get('Client', '').strip(),
                    spotify_url=row.get('URL', '').strip(),
                    sfa_url=row.get('SFA', '').strip(),
                    goal=self.parse_int(row.get('Goal', '0')),
                    remaining=self.parse_int(row.get('Remaining', '0')),
                    daily=self.parse_int(row.get('Daily', '0')),
                    weekly=self.parse_int(row.get('Weekly', '0')),
                    vendor=row.get('Vendor', '').strip(),
                    status=row.get('Status', '').strip(),
                    start_date=row.get('Start Date', '').strip()
                )
                
                self.campaigns.append(song)
        
        return self.campaigns
    
    def parse_campaign_name(self, campaign_name: str) -> tuple[str, str]:
        """Parse 'Artist - Song' format"""
        if ' - ' in campaign_name:
            parts = campaign_name.split(' - ', 1)
            return parts[0].strip(), parts[1].strip()
        else:
            # If no separator, use campaign name as both
            return campaign_name, campaign_name
    
    def parse_int(self, value: str) -> int:
        """Safely parse integer from string"""
        try:
            # Remove commas and convert
            return int(value.replace(',', '').strip())
        except (ValueError, AttributeError):
            return 0
    
    def get_unique_artists(self) -> List[str]:
        """Get list of unique artist names"""
        return sorted(list(set(song.artist_name for song in self.campaigns)))
    
    def get_songs_by_artist(self, artist_name: str) -> List[CampaignSong]:
        """Get all songs for a specific artist"""
        return [song for song in self.campaigns if song.artist_name == artist_name]
```

---

### Phase 2: Roster Page Navigation

**File**: `runner/app/pages/roster_page.py`

```python
from playwright.async_api import Page
from typing import List, Dict, Any
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
        
        await self.page.goto(self.base_url, wait_until='networkidle')
        await asyncio.sleep(2)
        
        # Wait for roster content to load
        try:
            await self.page.wait_for_selector('[data-testid="roster-artist"]', timeout=10000)
        except:
            # Fallback selectors
            await self.page.wait_for_selector('.artist-card, [class*="artist"]', timeout=10000)
    
    async def get_all_artists(self) -> List[Dict[str, str]]:
        """
        Get list of all artists in roster
        
        Returns:
            List of dicts with 'name' and 'url' for each artist
        """
        print("🎤 Fetching all artists from roster...")
        
        artists = []
        
        # Scroll to load all artists (lazy loading)
        await self.scroll_to_bottom()
        
        # Get all artist elements
        artist_elements = await self.page.query_selector_all('[data-testid="roster-artist"]')
        
        if not artist_elements:
            # Fallback: Try alternative selectors
            artist_elements = await self.page.query_selector_all('.artist-card, [class*="artist-item"]')
        
        for element in artist_elements:
            try:
                # Extract artist name
                name_element = await element.query_selector('h2, h3, .artist-name')
                artist_name = await name_element.text_content() if name_element else None
                
                # Extract artist link/ID
                link_element = await element.query_selector('a[href*="/artist/"]')
                artist_url = await link_element.get_attribute('href') if link_element else None
                
                if artist_name:
                    artists.append({
                        'name': artist_name.strip(),
                        'url': artist_url or '',
                        'element': element
                    })
            except Exception as e:
                print(f"Failed to extract artist: {e}")
                continue
        
        print(f"✅ Found {len(artists)} artists in roster")
        return artists
    
    async def find_artist(self, artist_name: str) -> Dict[str, Any]:
        """
        Find a specific artist in the roster
        
        Args:
            artist_name: Name of the artist to find
            
        Returns:
            Dict with artist info or None if not found
        """
        print(f"🔍 Searching for artist: {artist_name}")
        
        # Get all artists
        artists = await self.get_all_artists()
        
        # Fuzzy match (case-insensitive, handle variations)
        for artist in artists:
            if self.names_match(artist_name, artist['name']):
                print(f"✅ Found: {artist['name']}")
                return artist
        
        print(f"❌ Artist not found: {artist_name}")
        return None
    
    def names_match(self, name1: str, name2: str) -> bool:
        """Check if two artist names match (fuzzy)"""
        # Normalize names
        n1 = name1.lower().strip()
        n2 = name2.lower().strip()
        
        # Exact match
        if n1 == n2:
            return True
        
        # Remove special characters and compare
        n1_clean = re.sub(r'[^a-z0-9]', '', n1)
        n2_clean = re.sub(r'[^a-z0-9]', '', n2)
        
        return n1_clean == n2_clean
    
    async def navigate_to_artist(self, artist_info: Dict[str, Any]) -> None:
        """Navigate to a specific artist's page"""
        print(f"📂 Opening artist: {artist_info['name']}")
        
        if artist_info.get('url'):
            # Navigate directly via URL
            full_url = f"https://artists.spotify.com{artist_info['url']}"
            await self.page.goto(full_url, wait_until='networkidle')
        else:
            # Click on the artist element
            await artist_info['element'].click()
            await self.page.wait_for_load_state('networkidle')
        
        await asyncio.sleep(2)
    
    async def get_songs_for_artist(self, artist_name: str) -> List[Dict[str, Any]]:
        """
        Get all songs for an artist from their roster page
        
        Args:
            artist_name: Name of the artist
            
        Returns:
            List of song dicts with name, url, streams, etc.
        """
        # First find and navigate to the artist
        artist_info = await self.find_artist(artist_name)
        
        if not artist_info:
            print(f"⚠️  Artist not found: {artist_name}")
            return []
        
        await self.navigate_to_artist(artist_info)
        
        # Now scrape songs from the artist's page
        return await self.scrape_artist_songs()
    
    async def scrape_artist_songs(self) -> List[Dict[str, Any]]:
        """Scrape all songs from the current artist page"""
        print("🎵 Scraping songs from artist page...")
        
        songs = []
        
        # Scroll to load all songs
        await self.scroll_to_bottom()
        
        # Find song elements
        song_elements = await self.page.query_selector_all('[data-testid="song-row"], .song-item, [class*="track-row"]')
        
        for element in song_elements:
            try:
                # Extract song name
                name_element = await element.query_selector('.song-title, [data-testid="song-name"]')
                song_name = await name_element.text_content() if name_element else None
                
                # Extract song URL/ID
                link_element = await element.query_selector('a[href*="/song/"]')
                song_url = await link_element.get_attribute('href') if link_element else None
                
                # Extract stream count (if visible on roster page)
                streams_element = await element.query_selector('[data-testid="streams"], .stream-count')
                streams = await streams_element.text_content() if streams_element else '0'
                
                if song_name:
                    songs.append({
                        'name': song_name.strip(),
                        'url': song_url or '',
                        'streams': self.parse_stream_count(streams),
                        'element': element
                    })
            except Exception as e:
                print(f"Failed to extract song: {e}")
                continue
        
        print(f"✅ Found {len(songs)} songs")
        return songs
    
    def parse_stream_count(self, streams_text: str) -> int:
        """Parse stream count from text (e.g., '1.2M' -> 1200000)"""
        try:
            text = streams_text.strip().upper()
            text = text.replace(',', '')
            
            if 'M' in text:
                return int(float(text.replace('M', '')) * 1_000_000)
            elif 'K' in text:
                return int(float(text.replace('K', '')) * 1_000)
            else:
                return int(text)
        except:
            return 0
    
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
```

---

### Phase 3: Song Data Extraction

**File**: `runner/app/pages/song_page.py`

```python
from playwright.async_api import Page
from typing import Dict, Any, List
import asyncio
import re

class SongPage:
    """Handles individual song page data extraction"""
    
    def __init__(self, page: Page):
        self.page = page
    
    async def navigate_to_song(self, song_url: str) -> None:
        """Navigate to a song's stats page"""
        print(f"🎵 Navigating to song: {song_url}")
        
        # Ensure full URL
        if not song_url.startswith('http'):
            song_url = f"https://artists.spotify.com{song_url}"
        
        await self.page.goto(song_url, wait_until='networkidle')
        await asyncio.sleep(2)
        
        # Wait for song data to load
        try:
            await self.page.wait_for_selector('[data-testid="song-header"]', timeout=10000)
        except:
            await self.page.wait_for_selector('h1', timeout=10000)
    
    async def get_song_stats(self, time_range: str = '28day') -> Dict[str, Any]:
        """
        Get comprehensive stats for a song
        
        Args:
            time_range: '7day', '28day', or '12months'
            
        Returns:
            Dict with all song stats
        """
        # Switch to correct time range
        await self.switch_time_range(time_range)
        
        stats = {
            'time_range': time_range,
            'title': await self.get_song_title(),
            'artist': await self.get_artist_name(),
            'total_streams': await self.get_total_streams(),
            'listeners': await self.get_listeners(),
            'saves': await self.get_saves(),
            'playlist_adds': await self.get_playlist_adds(),
            'playlists': await self.get_playlists(),
            'demographics': await self.get_demographics(),
            'sources': await self.get_sources()
        }
        
        return stats
    
    async def switch_time_range(self, time_range: str) -> None:
        """Switch to a specific time range"""
        time_range_selectors = {
            '7day': 'button:has-text("7 days")',
            '28day': 'button:has-text("28 days")',
            '12months': 'button:has-text("12 months")'
        }
        
        selector = time_range_selectors.get(time_range)
        if selector:
            try:
                await self.page.click(selector)
                await asyncio.sleep(1.5)
            except:
                print(f"⚠️  Could not switch to {time_range}")
    
    async def get_song_title(self) -> str:
        """Extract song title"""
        try:
            title_element = await self.page.query_selector('h1, [data-testid="song-title"]')
            return await title_element.text_content() if title_element else 'Unknown'
        except:
            return 'Unknown'
    
    async def get_artist_name(self) -> str:
        """Extract artist name"""
        try:
            artist_element = await self.page.query_selector('[data-testid="artist-name"]')
            return await artist_element.text_content() if artist_element else 'Unknown'
        except:
            return 'Unknown'
    
    async def get_total_streams(self) -> int:
        """Extract total streams"""
        try:
            streams_element = await self.page.query_selector('[data-testid="total-streams"]')
            if streams_element:
                text = await streams_element.text_content()
                return self.parse_number(text)
        except:
            pass
        return 0
    
    async def get_listeners(self) -> int:
        """Extract listener count"""
        try:
            listeners_element = await self.page.query_selector('[data-testid="listeners"]')
            if listeners_element:
                text = await listeners_element.text_content()
                return self.parse_number(text)
        except:
            pass
        return 0
    
    async def get_saves(self) -> int:
        """Extract save count"""
        try:
            saves_element = await self.page.query_selector('[data-testid="saves"]')
            if saves_element:
                text = await saves_element.text_content()
                return self.parse_number(text)
        except:
            pass
        return 0
    
    async def get_playlist_adds(self) -> int:
        """Extract playlist add count"""
        try:
            adds_element = await self.page.query_selector('[data-testid="playlist-adds"]')
            if adds_element:
                text = await adds_element.text_content()
                return self.parse_number(text)
        except:
            pass
        return 0
    
    async def get_playlists(self) -> List[Dict[str, Any]]:
        """Extract playlist data (similar to existing scraper)"""
        # Navigate to Playlists tab
        await self.navigate_to_playlists_tab()
        
        playlists = []
        # ... (use existing playlist scraping logic from spotify_artists.py)
        
        return playlists
    
    async def get_demographics(self) -> Dict[str, Any]:
        """Extract demographic data"""
        # Navigate to Audience tab
        # ... extract age, gender, location data
        return {}
    
    async def get_sources(self) -> Dict[str, Any]:
        """Extract source breakdown (programmed, organic, etc.)"""
        # ... extract source data
        return {}
    
    def parse_number(self, text: str) -> int:
        """Parse number from text (handles K, M, B suffixes)"""
        try:
            text = text.strip().upper()
            text = re.sub(r'[^0-9.KMB]', '', text)
            
            if 'B' in text:
                return int(float(text.replace('B', '')) * 1_000_000_000)
            elif 'M' in text:
                return int(float(text.replace('M', '')) * 1_000_000)
            elif 'K' in text:
                return int(float(text.replace('K', '')) * 1_000)
            else:
                return int(float(text))
        except:
            return 0
    
    async def navigate_to_playlists_tab(self) -> None:
        """Navigate to Playlists tab"""
        try:
            await self.page.click('text="Playlists"')
            await asyncio.sleep(1.5)
        except:
            print("⚠️  Could not navigate to Playlists tab")
```

---

### Phase 4: Main Scraper Orchestration

**File**: `run_roster_scraper.py`

```python
#!/usr/bin/env python3
"""
Roster Scraper - Scrape all active campaign songs from Spotify for Artists Roster
"""
import asyncio
import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any

from runner.app.csv_parser import CampaignCSVParser, CampaignSong
from runner.app.scraper import RosterScraper

async def main():
    print("=" * 80)
    print("🎯 SPOTIFY FOR ARTISTS - ROSTER SCRAPER")
    print("=" * 80)
    print()
    
    # Configuration
    csv_path = Path('../Spotify Playlisting-Active Campaigns.csv')
    output_dir = Path('data/raw')
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Step 1: Parse CSV
    print("📋 Step 1: Parsing Active Campaigns CSV...")
    parser = CampaignCSVParser(csv_path)
    campaigns = parser.parse()
    
    print(f"✅ Found {len(campaigns)} active campaign songs")
    
    unique_artists = parser.get_unique_artists()
    print(f"✅ Found {len(unique_artists)} unique artists")
    print()
    
    # Show summary
    print("📊 CAMPAIGN SUMMARY")
    print("-" * 80)
    for artist in unique_artists[:10]:  # Show first 10
        songs = parser.get_songs_by_artist(artist)
        print(f"  {artist}: {len(songs)} song(s)")
    if len(unique_artists) > 10:
        print(f"  ... and {len(unique_artists) - 10} more artists")
    print()
    
    # Step 2: Initialize scraper
    print("🚀 Step 2: Initializing browser...")
    async with RosterScraper() as scraper:
        # Verify login
        print("🔐 Checking login status...")
        is_logged_in = await scraper.verify_login()
        
        if not is_logged_in:
            print("⚠️  Not logged in to Spotify for Artists!")
            print()
            print("📋 PLEASE LOG IN:")
            print("   1. A browser window should be open")
            print("   2. Navigate to: https://artists.spotify.com")
            print("   3. Log in with your Spotify account")
            print("   4. Wait for the dashboard to load")
            print()
            print("⏳ Waiting 60 seconds for you to log in...")
            
            for i in range(60, 0, -10):
                print(f"   ⏰ {i} seconds remaining...")
                await asyncio.sleep(10)
            
            is_logged_in = await scraper.verify_login()
            
            if not is_logged_in:
                print("\n❌ Still not logged in! Exiting...")
                return
        
        print("✅ Login verified!")
        print()
        
        # Step 3: Scrape by artist
        print("🎤 Step 3: Scraping songs from Roster...")
        print("-" * 80)
        
        results = {
            'scraped_at': datetime.now().isoformat(),
            'total_campaigns': len(campaigns),
            'total_artists': len(unique_artists),
            'artists': {}
        }
        
        successful = 0
        failed = 0
        
        for i, artist_name in enumerate(unique_artists, 1):
            print(f"\n[{i}/{len(unique_artists)}] Processing: {artist_name}")
            print("-" * 40)
            
            try:
                # Get campaign songs for this artist
                artist_campaigns = parser.get_songs_by_artist(artist_name)
                print(f"   📝 {len(artist_campaigns)} song(s) in campaigns")
                
                # Scrape all songs for this artist from Roster
                roster_songs = await scraper.scrape_artist_songs(artist_name)
                
                if not roster_songs:
                    print(f"   ⚠️  No songs found in Roster for {artist_name}")
                    failed += 1
                    continue
                
                print(f"   ✅ Found {len(roster_songs)} song(s) in Roster")
                
                # Match campaign songs with roster songs
                matched_songs = []
                for campaign in artist_campaigns:
                    roster_match = scraper.find_matching_song(
                        campaign.song_name,
                        roster_songs
                    )
                    
                    if roster_match:
                        print(f"      ✅ Matched: {campaign.song_name}")
                        
                        # Scrape detailed stats for this song
                        detailed_stats = await scraper.scrape_song_details(
                            roster_match['url']
                        )
                        
                        matched_songs.append({
                            'campaign': campaign.__dict__,
                            'roster_data': roster_match,
                            'detailed_stats': detailed_stats
                        })
                        
                        successful += 1
                    else:
                        print(f"      ⚠️  No match: {campaign.song_name}")
                        failed += 1
                
                # Store results for this artist
                results['artists'][artist_name] = {
                    'campaign_count': len(artist_campaigns),
                    'roster_count': len(roster_songs),
                    'matched_count': len(matched_songs),
                    'songs': matched_songs
                }
                
                # Save intermediate results
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                artist_filename = f"roster_{artist_name.replace(' ', '_')}_{timestamp}.json"
                artist_filepath = output_dir / artist_filename
                
                with open(artist_filepath, 'w', encoding='utf-8') as f:
                    json.dump(results['artists'][artist_name], f, indent=2, ensure_ascii=False)
                
                print(f"   💾 Saved to: {artist_filepath}")
                
                # Wait between artists to avoid rate limiting
                if i < len(unique_artists):
                    print("   ⏳ Waiting 3 seconds...")
                    await asyncio.sleep(3)
                
            except Exception as e:
                print(f"   ❌ Error scraping {artist_name}: {e}")
                failed += 1
                continue
        
        # Step 4: Save complete results
        print("\n" + "=" * 80)
        print("💾 Saving complete results...")
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        summary_filename = f"roster_scraping_summary_{timestamp}.json"
        summary_filepath = output_dir / summary_filename
        
        with open(summary_filepath, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Saved summary to: {summary_filepath}")
        
        # Final summary
        print("\n" + "=" * 80)
        print("📊 SCRAPING COMPLETE")
        print("=" * 80)
        print(f"✅ Successful: {successful}")
        print(f"❌ Failed: {failed}")
        print(f"📁 Data files in: {output_dir}/")
        print()
        
        if successful > 0:
            print("🎉 Scraping completed successfully!")
            print("\n💡 Next step: Import data to Supabase:")
            print("   node scripts/import-roster-data.js")
        
if __name__ == "__main__":
    asyncio.run(main())
```

---

## 📦 Data Format

### Raw Scraped Data Structure

```json
{
  "scraped_at": "2025-10-23T15:30:00",
  "artist": "Segan",
  "campaign_count": 3,
  "roster_count": 15,
  "matched_count": 3,
  "songs": [
    {
      "campaign": {
        "campaign_name": "Segan - DNBMF",
        "artist_name": "Segan",
        "song_name": "DNBMF",
        "client_name": "Majed",
        "spotify_url": "https://open.spotify.com/track/...",
        "goal": 50000,
        "remaining": 45000,
        "daily": 150,
        "weekly": 1050,
        "vendor": "Club Restricted",
        "status": "Active"
      },
      "roster_data": {
        "name": "DNBMF",
        "url": "/c/artist/.../song/...",
        "streams": 5000
      },
      "detailed_stats": {
        "28day": {
          "title": "DNBMF",
          "artist": "Segan",
          "total_streams": 5000,
          "listeners": 3200,
          "saves": 450,
          "playlist_adds": 12,
          "playlists": [
            {
              "name": "Discover Weekly",
              "curator": "Spotify",
              "streams": 1200,
              "date_added": "2025-10-15",
              "is_algorithmic": true
            },
            {
              "name": "DnB Vibes",
              "curator": "Club Restricted",
              "streams": 800,
              "date_added": "2025-10-10",
              "is_algorithmic": false
            }
          ],
          "demographics": {
            "age": {...},
            "gender": {...},
            "locations": [...]
          },
          "sources": {
            "programmed": 60,
            "organic": 25,
            "user": 15
          }
        },
        "7day": {...},
        "12months": {...}
      }
    }
  ]
}
```

---

## 🔄 Database Integration

### Import Script

**File**: `scripts/import-roster-data.js`

```javascript
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function importRosterData() {
  console.log('📦 Importing Roster Data to Supabase...\n');
  
  const dataDir = path.join(process.cwd(), 'roster_scraper', 'data', 'raw');
  const files = fs.readdirSync(dataDir).filter(f => f.startsWith('roster_') && f.endsWith('.json'));
  
  let updated = 0;
  let created = 0;
  
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf-8'));
    
    for (const song of data.songs) {
      // Find existing campaign in database
      const { data: existingCampaign } = await supabase
        .from('spotify_campaigns')
        .select('id')
        .eq('campaign', song.campaign.campaign_name)
        .single();
      
      if (existingCampaign) {
        // Update with roster data
        await supabase
          .from('spotify_campaigns')
          .update({
            daily: song.detailed_stats['28day'].total_streams / 28,
            weekly: song.detailed_stats['7day'].total_streams,
            remaining: song.campaign.goal - song.detailed_stats['28day'].total_streams,
            last_scraped: new Date().toISOString()
          })
          .eq('id', existingCampaign.id);
        
        updated++;
      }
      
      // Import playlist data
      for (const playlist of song.detailed_stats['28day'].playlists) {
        // Check if playlist already exists
        const { data: existingPlaylist } = await supabase
          .from('campaign_playlists')
          .select('id')
          .eq('campaign_id', existingCampaign.id)
          .eq('playlist_name', playlist.name)
          .single();
        
        if (existingPlaylist) {
          // Update
          await supabase
            .from('campaign_playlists')
            .update({
              streams_28d: playlist.streams,
              playlist_curator: playlist.curator,
              is_algorithmic: playlist.is_algorithmic,
              last_scraped: new Date().toISOString()
            })
            .eq('id', existingPlaylist.id);
        } else {
          // Create
          await supabase
            .from('campaign_playlists')
            .insert({
              campaign_id: existingCampaign.id,
              playlist_name: playlist.name,
              playlist_curator: playlist.curator,
              streams_28d: playlist.streams,
              date_added: playlist.date_added,
              is_algorithmic: playlist.is_algorithmic,
              org_id: defaultOrgId
            });
          
          created++;
        }
      }
    }
  }
  
  console.log(`\n✅ Import complete!`);
  console.log(`   Updated: ${updated} campaigns`);
  console.log(`   Created: ${created} playlists`);
}

importRosterData();
```

---

## 🎯 Execution Plan

### Week 1: Foundation
- [x] Create project structure
- [ ] Implement CSV parser
- [ ] Set up basic scraper skeleton
- [ ] Test roster page navigation

### Week 2: Core Scraping
- [ ] Implement roster page interactions
- [ ] Implement song matching logic
- [ ] Implement detailed stats extraction
- [ ] Test with 5 sample artists

### Week 3: Data Pipeline
- [ ] Implement data formatting
- [ ] Create import scripts
- [ ] Set up database sync
- [ ] Test full pipeline

### Week 4: Production & Polish
- [ ] Add error handling
- [ ] Add retry logic
- [ ] Add logging
- [ ] Create documentation
- [ ] Run full production scrape

---

## 🚨 Key Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| **Artist name variations** | Fuzzy matching algorithm |
| **Song name matching** | Levenshtein distance + manual mapping |
| **Rate limiting** | 3-5 second delays between requests |
| **Session persistence** | Persistent browser context |
| **Lazy loading** | Auto-scroll to trigger all content |
| **Dynamic selectors** | Multiple fallback selectors |
| **Error recovery** | Try-except blocks + logging |
| **Data validation** | Schema validation before import |

---

## 📈 Success Metrics

- ✅ **Coverage**: Scrape 100% of active campaigns from CSV
- ✅ **Accuracy**: >95% song matching accuracy
- ✅ **Speed**: ~30 seconds per artist (with delays)
- ✅ **Reliability**: <5% failure rate
- ✅ **Data Quality**: All required fields populated

---

## 🔮 Future Enhancements

1. **Automated Scheduling**: Run scraper daily via cron
2. **Change Detection**: Alert on significant stream changes
3. **Performance Tracking**: Track campaign progress over time
4. **Anomaly Detection**: Flag unusual patterns
5. **Multi-Account Support**: Handle multiple S4A accounts
6. **Parallel Processing**: Scrape multiple artists concurrently
7. **API Integration**: Direct API calls (if Spotify provides)

---

## 📝 Next Steps

1. **Review & Approve Plan** ✋ (You are here!)
2. **Create project structure**
3. **Implement CSV parser**
4. **Test with sample data**
5. **Build roster navigation**
6. **Implement scraping logic**
7. **Create import pipeline**
8. **Run production scrape**
9. **Integrate with dashboard**

---

**Ready to proceed? Let me know and I'll start building! 🚀**

