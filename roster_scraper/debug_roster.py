#!/usr/bin/env python3
"""
Debug script to see what artists are actually in the Roster
"""
import asyncio
from runner.app.roster_scraper import RosterScraper

async def main():
    print("🔍 Checking which artists are in the current Roster...")
    print()
    
    async with RosterScraper() as scraper:
        # Verify login
        is_logged_in = await scraper.verify_login()
        
        if not is_logged_in:
            print("❌ Not logged in. Please log in first.")
            return
        
        print("✅ Logged in")
        print()
        
        # Navigate to Roster
        await scraper.roster_page.navigate_to_roster()
        
        # Get all artists
        artists = await scraper.roster_page.get_all_artists()
        
        print(f"📊 Found {len(artists)} artists in Roster:")
        print("=" * 80)
        
        for i, artist in enumerate(artists, 1):
            print(f"{i:3d}. {artist['name']}")
            if artist.get('url'):
                print(f"      URL: {artist['url']}")
        
        print()
        print("=" * 80)
        print("\n💡 These are the artists managed by the currently logged-in account.")
        print("   If your campaign artists aren't here, you need to log in to a different account.")

if __name__ == "__main__":
    asyncio.run(main())

