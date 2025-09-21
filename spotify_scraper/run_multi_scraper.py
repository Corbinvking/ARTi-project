#!/usr/bin/env python3
"""
Multi-song scraper for Spotify for Artists
Processes multiple songs and saves each to its own data file
"""
import asyncio
import os
import json
from datetime import datetime
from dotenv import load_dotenv
from runner.app.scraper import SpotifyArtistsScraper
from pathlib import Path

# Load environment variables
load_dotenv()

# List of song URLs to scrape
SONG_URLS = [
    # Add your song URLs here - you can modify this list
    "https://artists.spotify.com/c/artist/0NgWGGk9p04zLTeFbIdsVO/song/5cBGiXFf9S9RlAwQUv0g4g/playlists",  # Current test song
    # Add 4 more song URLs below:
    # "https://artists.spotify.com/c/artist/YOUR_ARTIST_ID/song/YOUR_SONG_ID_2/playlists",
    # "https://artists.spotify.com/c/artist/YOUR_ARTIST_ID/song/YOUR_SONG_ID_3/playlists",
    # "https://artists.spotify.com/c/artist/YOUR_ARTIST_ID/song/YOUR_SONG_ID_4/playlists",
    # "https://artists.spotify.com/c/artist/YOUR_ARTIST_ID/song/YOUR_SONG_ID_5/playlists",
]

async def scrape_single_song(scraper, song_url, song_index):
    """Scrape a single song and save its data"""
    try:
        print(f"\n🎵 [{song_index}/5] Processing song: {song_url}")
        
        # Scrape song data
        data = await scraper.scrape_song_data(song_url)
        
        # Extract song identifier from URL for filename
        song_id = extract_song_id_from_url(song_url)
        
        # Create filename with timestamp and song ID
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"song_{song_id}_{timestamp}.json"
        
        # Save to data directory
        data_dir = Path('data')
        data_dir.mkdir(exist_ok=True)
        filepath = data_dir / filename
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        # Get song title from the data
        first_time_range = list(data['time_ranges'].keys())[0]
        song_title = data['time_ranges'][first_time_range]['stats'].get('title', 'Unknown')
        
        print(f"✅ [{song_index}/5] Completed: {song_title}")
        print(f"   📊 Data saved to: {filepath}")
        
        # Show quick stats
        for time_range, range_data in data['time_ranges'].items():
            stats = range_data['stats']
            playlist_count = len(stats.get('playlists', []))
            total_playlists = stats.get('playlist_stats', {}).get('total', 'N/A')
            print(f"   📅 {time_range}: {playlist_count} playlists (of {total_playlists} total)")
        
        return True
        
    except Exception as e:
        print(f"❌ [{song_index}/5] Failed to process song: {e}")
        return False

def extract_song_id_from_url(url):
    """Extract song ID from Spotify Artists URL"""
    try:
        # URL format: https://artists.spotify.com/c/artist/ARTIST_ID/song/SONG_ID/playlists
        parts = url.split('/')
        if 'song' in parts:
            song_index = parts.index('song')
            if song_index + 1 < len(parts):
                song_id = parts[song_index + 1]
                # Remove any query parameters
                return song_id.split('?')[0]
        return f"unknown_{datetime.now().strftime('%H%M%S')}"
    except:
        return f"unknown_{datetime.now().strftime('%H%M%S')}"

async def main():
    """Main function to scrape multiple songs"""
    
    print("🎼 Multi-Song Spotify Scraper")
    print("=" * 50)
    
    # Check if we have song URLs
    valid_urls = [url for url in SONG_URLS if url and not url.startswith('#')]
    
    if not valid_urls:
        print("❌ No valid song URLs found!")
        print("Please edit SONG_URLS in run_multi_scraper.py and add your song URLs.")
        return
    
    if len(valid_urls) < 5:
        print(f"⚠️  Only {len(valid_urls)} song URLs found. Add more URLs to SONG_URLS list for full test.")
    
    print(f"📋 Found {len(valid_urls)} songs to process")
    
    try:
        async with SpotifyArtistsScraper() as scraper:
            # Verify login once at the start
            if not await scraper.verify_login():
                print("❌ Not logged in! Please log in manually first:")
                print("1. Run this script")
                print("2. A browser will open")
                print("3. Navigate to artists.spotify.com and log in")
                print("4. Keep the browser open and run the script again")
                return
            
            print("✅ Login verified!")
            
            # Process each song
            successful_songs = 0
            failed_songs = 0
            
            for i, song_url in enumerate(valid_urls, 1):
                # Add delay between songs to be more human-like
                if i > 1:
                    print(f"⏳ Waiting 3 seconds before next song...")
                    await asyncio.sleep(3)
                
                success = await scrape_single_song(scraper, song_url, i)
                if success:
                    successful_songs += 1
                else:
                    failed_songs += 1
            
            # Summary
            print("\n" + "=" * 50)
            print("📊 SCRAPING SUMMARY")
            print("=" * 50)
            print(f"✅ Successfully processed: {successful_songs} songs")
            print(f"❌ Failed: {failed_songs} songs")
            print(f"📁 Data files saved in: ./data/")
            
            if successful_songs > 0:
                print(f"\n🎉 Multi-song scraping completed successfully!")
                print(f"Check the data/ directory for individual song files.")
            
    except Exception as e:
        print(f"❌ Critical error: {e}")
        print("Check the artifacts folder for screenshots and debug info.")

if __name__ == "__main__":
    asyncio.run(main())

