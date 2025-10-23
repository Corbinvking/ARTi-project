#!/usr/bin/env python3
"""
Scrape songs from roster scraper URLs
Reads the simple URL list created by roster scraper
"""
import asyncio
import os
import re
from datetime import datetime
from pathlib import Path
from runner.app.scraper import SpotifyArtistsScraper

def parse_roster_urls_file():
    """Parse the roster URLs file and extract SFA links"""
    # Find the most recent simple URLs file
    roster_data_dir = Path(__file__).parent.parent / 'roster_scraper' / 'data'
    
    if not roster_data_dir.exists():
        print(f"❌ Directory not found: {roster_data_dir}")
        return []
    
    # Find the most recent sfa-urls-simple file
    url_files = list(roster_data_dir.glob('sfa-urls-simple_*.txt'))
    
    if not url_files:
        print(f"❌ No URL files found in: {roster_data_dir}")
        return []
    
    # Sort by modification time and get the most recent
    latest_file = sorted(url_files, key=lambda p: p.stat().st_mtime)[-1]
    
    print(f"📁 Reading URLs from: {latest_file.name}")
    print()
    
    songs = []
    
    with open(latest_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            
            # Skip empty lines
            if not line:
                continue
            
            # Check if this is an SFA link
            if line.startswith('https://artists.spotify.com'):
                # Extract artist/song name from URL if possible
                match = re.search(r'/song/([a-zA-Z0-9]+)/', line)
                song_id = match.group(1) if match else 'unknown'
                
                songs.append({
                    'song_id': song_id,
                    'url': line
                })
    
    return songs

async def main():
    print("🎵 Roster URLs Stream Data Scraper")
    print("=" * 60)
    
    # Parse the roster URLs file
    songs = parse_roster_urls_file()
    
    if not songs:
        print("❌ No songs found in roster URLs file")
        return
    
    print(f"📋 Found {len(songs)} songs to scrape")
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
            
            for i, song_info in enumerate(songs, 1):
                try:
                    print(f"\n🎵 [{i}/{len(songs)}] Processing song ID: {song_info['song_id']}")
                    print(f"   URL: {song_info['url']}")
                    
                    # Scrape the song
                    data = await scraper.scrape_song_data(song_info['url'])
                    
                    # Save to file
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    filename = f"roster_{song_info['song_id']}_{timestamp}.json"
                    filepath = data_dir / filename
                    
                    with open(filepath, 'w', encoding='utf-8') as f:
                        import json
                        json.dump(data, f, indent=2, ensure_ascii=False)
                    
                    print(f"   ✅ Success! Saved to: {filename}")
                    successful += 1
                    
                    # Small delay between requests
                    await asyncio.sleep(2)
                    
                except Exception as e:
                    print(f"   ❌ Error: {str(e)}")
                    failed += 1
            
            print("\n" + "=" * 60)
            print(f"✅ Successful: {successful}")
            print(f"❌ Failed: {failed}")
            print(f"📁 Data saved to: {data_dir}/")
            print("=" * 60)
            
    except Exception as e:
        print(f"\n❌ Fatal error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(main())

