#!/usr/bin/env python3
"""
Scrape songs from s4alist.md file
Automatically extracts SFA links and runs the scraper
"""
import asyncio
import os
import re
from datetime import datetime
from pathlib import Path
from runner.app.scraper import SpotifyArtistsScraper

def parse_roster_scraped_urls():
    """Parse roster scraping results and extract SFA URLs"""
    # Look for the most recent roster results file
    roster_data_dir = Path(__file__).parent.parent / 'roster_scraper' / 'data'
    
    if not roster_data_dir.exists():
        print(f"❌ Directory not found: {roster_data_dir}")
        return []
    
    # Find all roster_scraping_results_*.json files
    import json
    import glob
    
    result_files = sorted(
        glob.glob(str(roster_data_dir / 'roster_scraping_results_*.json')),
        reverse=True  # Most recent first
    )
    
    if not result_files:
        print(f"❌ No roster scraping results found in: {roster_data_dir}")
        print(f"   Run the roster scraper first: cd roster_scraper && python run_roster_scraper.py")
        return []
    
    latest_file = result_files[0]
    print(f"📁 Reading URLs from: {Path(latest_file).name}")
    
    songs = []
    
    try:
        with open(latest_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Extract songs from the data structure
        if 'clients' in data:
            for client_name, client_data in data['clients'].items():
                if 'songs' in client_data and client_data['songs']:
                    for song in client_data['songs']:
                        if song.get('sfa_url'):
                            songs.append({
                                'artist': client_data.get('artist_name', client_name),
                                'song_name': song.get('song_name', 'Unknown'),
                                'url': song['sfa_url']
                            })
        
        print(f"✅ Found {len(songs)} URLs from roster scraping results")
        
    except Exception as e:
        print(f"❌ Error reading roster results: {e}")
        return []
    
    return songs

async def main():
    print("🎵 S4A List Scraper")
    print("=" * 60)
    
    # Parse the roster scraping results
    songs = parse_roster_scraped_urls()
    
    if not songs:
        print("❌ No songs found in s4alist.md")
        return
    
    print(f"📋 Found {len(songs)} songs to scrape")
    for i, song in enumerate(songs, 1):
        print(f"  {i}. {song['artist']}")
    print()
    
    # Create data directory
    data_dir = Path('data')
    data_dir.mkdir(exist_ok=True)
    
    try:
        async with SpotifyArtistsScraper() as scraper:
            # Verify login with wait time
            print("🔐 Checking login status...")
            print()
            
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
                print("   (The browser will stay open and logged in for future runs)")
                print()
                
                # Wait 60 seconds for user to log in
                for i in range(60, 0, -10):
                    print(f"   ⏰ {i} seconds remaining...")
                    await asyncio.sleep(10)
                
                # Check login again
                print("\n🔄 Checking login status again...")
                is_logged_in = await scraper.verify_login()
                
                if not is_logged_in:
                    print("\n❌ Still not logged in!")
                    print("   Please log in and run the script again.")
                    print("   The browser session will persist, so you won't need to log in next time.")
                    return
            
            print("✅ Login verified! You are logged into Spotify for Artists.")
            print("   (Your session is saved - you won't need to log in again)")
            print()
            
            successful = 0
            failed = 0
            skipped = 0
            
            for i, song_info in enumerate(songs, 1):
                try:
                    # Extract song ID from URL first to check if already scraped
                    match = re.search(r'/song/([a-zA-Z0-9]+)/', song_info['url'])
                    if match:
                        song_id = match.group(1)
                    else:
                        song_id = f"unknown_{datetime.now().strftime('%H%M%S')}"
                    
                    # Check if this song was already scraped
                    timestamp = datetime.now().strftime('%Y%m%d')
                    expected_filename = f"song_{song_id}_{timestamp}_*.json"
                    existing_files = list(data_dir.glob(f"song_{song_id}_*.json"))
                    
                    if existing_files:
                        print(f"\n⏭️  [{i}/{len(songs)}] Skipping: {song_info['artist']} (already scraped)")
                        print(f"   File: {existing_files[0].name}")
                        skipped += 1
                        continue
                    
                    print(f"\n🎵 [{i}/{len(songs)}] Processing: {song_info['artist']}")
                    print(f"   URL: {song_info['url']}")
                    
                    # Scrape the song
                    data = await scraper.scrape_song_data(song_info['url'])
                    
                    # Save to file
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    filename = f"song_{song_id}_{timestamp}.json"
                    filepath = data_dir / filename
                    
                    import json
                    with open(filepath, 'w', encoding='utf-8') as f:
                        json.dump(data, f, indent=2, ensure_ascii=False)
                    
                    # Get song title
                    first_range = list(data['time_ranges'].keys())[0]
                    title = data['time_ranges'][first_range]['stats'].get('title', 'Unknown')
                    
                    print(f"   ✅ Completed: {title}")
                    print(f"   📊 Saved to: {filepath}")
                    
                    successful += 1
                    
                    # Wait between songs
                    if i < len(songs):
                        print("   ⏳ Waiting 3 seconds...")
                        await asyncio.sleep(3)
                        
                except Exception as e:
                    print(f"   ❌ Failed: {e}")
                    failed += 1
            
            # Summary
            print("\n" + "=" * 60)
            print("📊 SCRAPING SUMMARY")
            print("=" * 60)
            print(f"✅ Successful: {successful}")
            print(f"⏭️  Skipped (already scraped): {skipped}")
            print(f"❌ Failed: {failed}")
            print(f"📁 Data files in: ./data/")
            print()
            
            if successful > 0:
                print("🎉 Scraping completed!")
                print("\n💡 Next step: Run the populate script to import this data:")
                print("   node scripts/populate-playlist-vendor-data-v2.js")
                
    except Exception as e:
        print(f"❌ Critical error: {e}")

if __name__ == "__main__":
    asyncio.run(main())

