#!/usr/bin/env python3
"""Quick page inspection - leaves browser open for manual inspection"""
import asyncio
import os
from dotenv import load_dotenv
from runner.app.scraper import SpotifyArtistsScraper

load_dotenv()

async def inspect():
    test_url = "https://artists.spotify.com/c/artist/4F8JGeO6bJO7Z309mxHlP0/song/1n2dTO7KKWztAQyCDaGmAm/stats"
    
    async with SpotifyArtistsScraper(headless=False) as scraper:
        # Login if needed
        if not await scraper.verify_login():
            email = os.getenv('SPOTIFY_EMAIL', 'tribe@artistinfluence.com')
            password = os.getenv('SPOTIFY_PASSWORD', 'UE_n7C*8wgxe9!P4abtK')
            await scraper.auto_login(email, password)
        
        # Navigate to playlists page
        playlist_url = test_url.replace('/stats', '/playlists')
        print(f"\n[*] Navigating to: {playlist_url}")
        await scraper.page.goto(playlist_url, wait_until='networkidle')
        await asyncio.sleep(3)
        
        print("\n" + "="*70)
        print("BROWSER IS OPEN - INSPECT THE PAGE")
        print("="*70)
        print("\nInstructions:")
        print("1. Look at the open browser window")
        print("2. Press F12 to open DevTools")
        print("3. Use the element picker (top-left icon in DevTools)")
        print("4. Click on:")
        print("   - The time range dropdown (e.g., 'Last 7 days')")
        print("   - A stream count number")
        print("   - A playlist name in the table")
        print("5. Note the HTML structure and attributes")
        print("\n[*] Browser will stay open for 5 minutes...")
        print("    Press Ctrl+C to close when done.\n")
        
        try:
            await asyncio.sleep(300)  # 5 minutes
        except KeyboardInterrupt:
            print("\n[OK] Closing...")

if __name__ == "__main__":
    asyncio.run(inspect())

