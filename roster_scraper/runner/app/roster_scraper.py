#!/usr/bin/env python3
"""
Roster Scraper - Extracts SFA URLs from Spotify for Artists Roster
"""
import asyncio
from playwright.async_api import async_playwright, Browser, BrowserContext, Page
import os
from typing import Optional, Dict, Any, List
from pathlib import Path

from .pages.roster_page import RosterPage


class RosterScraper:
    """Main scraper class for extracting SFA URLs from Roster"""
    
    def __init__(self):
        self.user_data_dir = os.getenv('USER_DATA_DIR', './data/browser_data')
        self.playwright = None
        self.context = None
        self.page = None
        self.roster_page = None
    
    async def __aenter__(self):
        await self.start()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.stop()
    
    async def start(self):
        """Initialize browser with persistent context"""
        print("🚀 Starting browser with persistent context...")
        self.playwright = await async_playwright().start()
        
        # Use persistent context to maintain login state
        self.context = await self.playwright.chromium.launch_persistent_context(
            user_data_dir=self.user_data_dir,
            headless=False,  # Run in headed mode so user can see progress
            viewport={'width': 1920, 'height': 1080}
        )
        self.page = await self.context.new_page()
        self.roster_page = RosterPage(self.page)
        
        print("✅ Browser started")
    
    async def stop(self):
        """Clean up resources"""
        if self.context:
            await self.context.close()
        if self.playwright:
            await self.playwright.stop()
    
    async def verify_login(self) -> bool:
        """Verify we have an active login session"""
        try:
            print("🔐 Verifying login status...")
            
            # Navigate to home page
            await self.page.goto('https://artists.spotify.com/home', wait_until='networkidle', timeout=60000)
            await asyncio.sleep(3)
            
            current_url = self.page.url
            
            # Check if we're redirected to login page
            if 'login' in current_url.lower():
                print("   ⚠️  Not logged in - redirected to login page")
                return False
            
            # Check for dashboard elements
            try:
                await self.page.wait_for_selector('text=Home, text=Music, text=Audience', timeout=5000)
                print("   ✅ Login verified!")
                return True
            except:
                # Try alternative check
                page_content = await self.page.content()
                if any(text in page_content.lower() for text in ['home', 'music', 'audience', 'roster']):
                    print("   ✅ Login verified!")
                    return True
                
                print("   ⚠️  Login status unclear")
                return False
        
        except Exception as e:
            print(f"   ❌ Login verification failed: {e}")
            return False
    
    async def get_artist_songs_from_roster(self, client_name: str) -> List[Dict[str, Any]]:
        """
        Get all songs for a client from the Roster
        
        Args:
            client_name: Client/artist name (e.g., "Segan")
            
        Returns:
            List of songs with SFA URLs
        """
        # Navigate to Roster
        await self.roster_page.navigate_to_roster()
        
        # Find the artist
        artist_info = await self.roster_page.find_artist(client_name)
        
        if not artist_info:
            return []
        
        # Get all songs for this artist
        songs = await self.roster_page.get_artist_songs(artist_info)
        
        return songs
    
    async def wait_for_login(self):
        """Wait for user to log in manually"""
        print("\n" + "=" * 80)
        print("⚠️  NOT LOGGED IN TO SPOTIFY FOR ARTISTS")
        print("=" * 80)
        print("\n📋 PLEASE LOG IN:")
        print("   1. A browser window should be open")
        print("   2. Navigate to: https://artists.spotify.com")
        print("   3. Log in with your Spotify account")
        print("   4. Wait for the dashboard to load")
        print("\n⏳ Waiting 60 seconds for you to log in...")
        print("   (The browser will stay open and logged in for future runs)")
        print()
        
        # Wait 60 seconds with countdown
        for i in range(60, 0, -10):
            print(f"   ⏰ {i} seconds remaining...")
            await asyncio.sleep(10)
        
        # Check login again
        print("\n🔄 Checking login status again...")
        is_logged_in = await self.verify_login()
        
        if not is_logged_in:
            print("\n❌ Still not logged in!")
            print("   Please log in and run the script again.")
            print("   The browser session will persist, so you won't need to log in next time.")
            return False
        
        print("✅ Login successful!")
        return True

