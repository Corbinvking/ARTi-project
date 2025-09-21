#!/usr/bin/env python3
"""
Simple script to test the Spotify scraper
"""
import asyncio
import os
from dotenv import load_dotenv
from runner.app.scraper import SpotifyArtistsScraper

# Load environment variables
load_dotenv()

async def main():
    """Main function to test the scraper"""
    
    # Get test song URL from environment or use a placeholder
    test_song_url = os.getenv('TEST_SONG_URL')
    
    if not test_song_url:
        # Use the URL from the screenshot if no env var is set
        test_song_url = "https://artists.spotify.com/c/artist/0NgWGGk9p04ZLTeFbIdsVO/song/5cBGiXFf9S9RlAwQUv0g4g/playlists?time-filter=28day"
        print(f"Using default test song URL: {test_song_url}")
    else:
        # Ensure we're on the playlists tab
        if "playlists" not in test_song_url:
            test_song_url = test_song_url.rstrip('/') + "/playlists"
    
    print(f"Testing scraper with song URL: {test_song_url}")
    
    try:
        async with SpotifyArtistsScraper() as scraper:
            # First verify login
            if not await scraper.verify_login():
                print("❌ Not logged in! Please log in manually first:")
                print("1. Run this script")
                print("2. A browser will open")
                print("3. Navigate to artists.spotify.com and log in")
                print("4. Keep the browser open and run the script again")
                return
            
            print("✅ Login verified!")
            
            # Scrape song data
            print("🎵 Scraping song data...")
            data = await scraper.scrape_song_data(test_song_url)
            
            print("\n📊 Results:")
            
            # Get the first time range for general song info
            first_time_range = list(data['time_ranges'].keys())[0]
            first_stats = data['time_ranges'][first_time_range]['stats']
            
            print(f"Song Title: {first_stats.get('title', 'Unknown')}")
            
            # Show data for each time range
            for time_range, range_data in data['time_ranges'].items():
                print(f"\n📅 {time_range.upper()} Stats:")
                stats = range_data['stats']
                print(f"  Title: {stats.get('title', 'Unknown')}")
                print(f"  Streams: {stats.get('streams', 0):,}")
                print(f"  Listeners: {stats.get('listeners', 0):,}")
                print(f"  Playlists Found: {len(stats.get('playlists', []))}")
                
                # Show playlist stats if available
                if 'playlist_stats' in stats:
                    playlist_stats = stats['playlist_stats']
                    print(f"  Playlist Stats: Showing {playlist_stats.get('showing', 'N/A')} of {playlist_stats.get('total', 'N/A')} total playlists")
                
                # Show top playlists
                playlists = stats.get('playlists', [])
                if playlists:
                    print(f"  Top 3 Playlists:")
                    for i, playlist in enumerate(playlists[:3], 1):
                        print(f"    {i}. {playlist.get('name', 'Unknown')} - {playlist.get('streams', '0')} streams")
            
            # Save the data to a JSON file
            import json
            from datetime import datetime
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            data_file = f"data/scraped_data_{timestamp}.json"
            
            os.makedirs('data', exist_ok=True)
            with open(data_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            print(f"\n✅ Scraping completed! Data saved to {data_file}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        print("Check the artifacts folder for screenshots and debug info.")

if __name__ == "__main__":
    asyncio.run(main())
