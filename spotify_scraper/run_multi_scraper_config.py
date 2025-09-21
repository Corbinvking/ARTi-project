#!/usr/bin/env python3
"""
Multi-song scraper for Spotify for Artists (Config-based)
Reads songs from songs_config.json and processes each one
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

def load_songs_config():
    """Load songs configuration from JSON file"""
    try:
        with open('songs_config.json', 'r', encoding='utf-8') as f:
            config = json.load(f)
            return config.get('songs', [])
    except FileNotFoundError:
        print("❌ songs_config.json not found!")
        print("Please create the file with your song URLs.")
        return []
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing songs_config.json: {e}")
        return []

async def scrape_single_song(scraper, song_config, song_index, total_songs):
    """Scrape a single song and save its data"""
    try:
        song_url = song_config['url']
        song_name = song_config.get('name', 'Unknown Song')
        
        print(f"\n🎵 [{song_index}/{total_songs}] Processing: {song_name}")
        print(f"   🔗 URL: {song_url}")
        
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
        
        # Add metadata to the data
        data['song_metadata'] = {
            'config_name': song_name,
            'scrape_order': song_index,
            'filename': filename
        }
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        # Get song title from the scraped data
        first_time_range = list(data['time_ranges'].keys())[0]
        scraped_title = data['time_ranges'][first_time_range]['stats'].get('title', 'Unknown')
        
        print(f"✅ [{song_index}/{total_songs}] Completed: {scraped_title}")
        print(f"   📊 Data saved to: {filepath}")
        
        # Show quick stats for each time range
        for time_range, range_data in data['time_ranges'].items():
            stats = range_data['stats']
            playlist_count = len(stats.get('playlists', []))
            playlist_stats = stats.get('playlist_stats', {})
            total_playlists = playlist_stats.get('total', 'N/A')
            showing = playlist_stats.get('showing', playlist_count)
            print(f"   📅 {time_range.upper()}: {showing} of {total_playlists} playlists")
        
        return True, filepath
        
    except Exception as e:
        print(f"❌ [{song_index}/{total_songs}] Failed to process {song_name}: {e}")
        return False, None

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

def create_summary_report(results):
    """Create a summary report of all scraped songs"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    summary_file = f"data/scraping_summary_{timestamp}.json"
    
    summary = {
        "scraping_session": {
            "timestamp": datetime.now().isoformat(),
            "total_songs": len(results),
            "successful": len([r for r in results if r['success']]),
            "failed": len([r for r in results if not r['success']])
        },
        "songs": results
    }
    
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    
    print(f"📋 Summary report saved to: {summary_file}")
    return summary_file

async def main():
    """Main function to scrape multiple songs"""
    
    print("🎼 Multi-Song Spotify Scraper (Config-based)")
    print("=" * 60)
    
    # Load songs from config
    songs_config = load_songs_config()
    if not songs_config:
        return
    
    # Filter active songs
    active_songs = [song for song in songs_config if song.get('active', False)]
    
    if not active_songs:
        print("❌ No active songs found in config!")
        print("Set 'active': true for songs you want to scrape in songs_config.json")
        return
    
    print(f"📋 Found {len(active_songs)} active songs to process")
    for i, song in enumerate(active_songs, 1):
        print(f"   {i}. {song.get('name', 'Unknown')}")
    
    try:
        async with SpotifyArtistsScraper() as scraper:
            # Verify login once at the start
            if not await scraper.verify_login():
                print("\n❌ Not logged in! Please log in manually first:")
                print("1. Run this script")
                print("2. A browser will open")  
                print("3. Navigate to artists.spotify.com and log in")
                print("4. Keep the browser open and run the script again")
                return
            
            print("\n✅ Login verified! Starting scraping process...\n")
            
            # Process each song
            results = []
            
            for i, song_config in enumerate(active_songs, 1):
                # Add delay between songs to be more human-like
                if i > 1:
                    delay = 3 + (i * 0.5)  # Increasing delay for each song
                    print(f"⏳ Waiting {delay:.1f} seconds before next song...")
                    await asyncio.sleep(delay)
                
                success, filepath = await scrape_single_song(scraper, song_config, i, len(active_songs))
                
                results.append({
                    'song_name': song_config.get('name', 'Unknown'),
                    'song_url': song_config['url'],
                    'success': success,
                    'filepath': str(filepath) if filepath else None,
                    'timestamp': datetime.now().isoformat()
                })
            
            # Create summary report
            print("\n" + "=" * 60)
            print("📊 SCRAPING SUMMARY")
            print("=" * 60)
            
            successful_songs = len([r for r in results if r['success']])
            failed_songs = len([r for r in results if not r['success']])
            
            print(f"✅ Successfully processed: {successful_songs} songs")
            print(f"❌ Failed: {failed_songs} songs")
            print(f"📁 Data files saved in: ./data/")
            
            # List successful songs
            if successful_songs > 0:
                print(f"\n🎵 Successfully scraped songs:")
                for result in results:
                    if result['success']:
                        print(f"   ✅ {result['song_name']} → {result['filepath']}")
            
            # List failed songs
            if failed_songs > 0:
                print(f"\n❌ Failed songs:")
                for result in results:
                    if not result['success']:
                        print(f"   ❌ {result['song_name']}")
            
            # Create and save summary report
            summary_file = create_summary_report(results)
            
            if successful_songs > 0:
                print(f"\n🎉 Multi-song scraping completed!")
                print(f"💾 {successful_songs} song data files + 1 summary report saved")
            
    except Exception as e:
        print(f"❌ Critical error: {e}")
        print("Check the artifacts folder for screenshots and debug info.")

if __name__ == "__main__":
    asyncio.run(main())

