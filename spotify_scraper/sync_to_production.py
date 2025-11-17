#!/usr/bin/env python3
"""
Sync locally scraped data to production database
Run after scraping: python sync_to_production.py
"""
import asyncio
import json
import os
import re
from pathlib import Path
from datetime import datetime
import aiohttp
from dotenv import load_dotenv

load_dotenv()

PRODUCTION_API = os.getenv('PRODUCTION_API_URL', 'https://api.artistinfluence.com')
API_KEY = os.getenv('PRODUCTION_API_KEY', '')  # Optional

# Cache for song_id to campaign_id mapping
CAMPAIGN_MAPPING_CACHE = {}

async def load_campaign_mapping(session: aiohttp.ClientSession):
    """Load campaign mapping from production API"""
    try:
        url = f'{PRODUCTION_API}/api/campaigns/song-mapping'
        headers = {}
        if API_KEY:
            headers['Authorization'] = f'Bearer {API_KEY}'
        
        async with session.get(url, headers=headers) as response:
            if response.status == 200:
                data = await response.json()
                # Expected format: {song_spotify_id: campaign_id}
                CAMPAIGN_MAPPING_CACHE.update(data)
                print(f"📥 Loaded {len(data)} campaign mappings from API")
                return True
            else:
                print(f"⚠️  Could not load campaign mapping (status {response.status})")
                return False
    except Exception as e:
        print(f"⚠️  Could not load campaign mapping: {e}")
        return False

async def lookup_campaign_id(song_spotify_id: str, session: aiohttp.ClientSession) -> int | None:
    """
    Lookup campaign ID from Spotify song ID
    
    First checks cache, then queries production API
    """
    # Check cache first
    if song_spotify_id in CAMPAIGN_MAPPING_CACHE:
        return CAMPAIGN_MAPPING_CACHE[song_spotify_id]
    
    # Query API
    try:
        url = f'{PRODUCTION_API}/api/campaigns/lookup-by-song/{song_spotify_id}'
        headers = {}
        if API_KEY:
            headers['Authorization'] = f'Bearer {API_KEY}'
        
        async with session.get(url, headers=headers) as response:
            if response.status == 200:
                data = await response.json()
                campaign_id = data.get('campaign_id')
                if campaign_id:
                    CAMPAIGN_MAPPING_CACHE[song_spotify_id] = campaign_id
                    return campaign_id
            elif response.status == 404:
                print(f"   ⚠️  No campaign found for song {song_spotify_id}")
            else:
                print(f"   ⚠️  API error (status {response.status})")
    except Exception as e:
        print(f"   ⚠️  Lookup error: {e}")
    
    return None

def extract_song_id_from_url(url: str) -> str | None:
    """Extract Spotify song ID from S4A URL"""
    # URL format: artists.spotify.com/c/artist/ARTIST_ID/song/SONG_ID/playlists
    match = re.search(r'/song/([a-zA-Z0-9]+)/', url)
    if match:
        return match.group(1)
    return None

async def sync_file(filepath: Path, session: aiohttp.ClientSession) -> bool:
    """Sync a single scraped file to production"""
    try:
        # Load scraped data
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Extract song ID
        url = data.get('url', '')
        song_id = extract_song_id_from_url(url)
        
        if not song_id:
            print(f"⚠️  Could not extract song ID from {filepath.name}")
            return False
        
        # Look up campaign_id
        campaign_id = await lookup_campaign_id(song_id, session)
        
        if not campaign_id:
            print(f"⚠️  No campaign found for {filepath.name} (song_id: {song_id})")
            return False
        
        # Prepare payload
        payload = {
            'campaign_id': campaign_id,
            'scraped_data': data,
            'scraper_version': '1.0',
            'timestamp': datetime.now().isoformat()
        }
        
        # Send to production
        headers = {'Content-Type': 'application/json'}
        if API_KEY:
            headers['Authorization'] = f'Bearer {API_KEY}'
        
        async with session.post(
            f'{PRODUCTION_API}/api/ingest/s4a',
            json=payload,
            headers=headers,
            timeout=aiohttp.ClientTimeout(total=30)
        ) as response:
            if response.status == 200:
                result = await response.json()
                print(f"✅ Synced: {filepath.name} → campaign {campaign_id}")
                return True
            else:
                error_text = await response.text()
                print(f"❌ Failed to sync {filepath.name} (status {response.status})")
                print(f"   Error: {error_text[:100]}")
                return False
                
    except Exception as e:
        print(f"❌ Error syncing {filepath.name}: {e}")
        return False

async def sync_all_files(files: list[Path]):
    """Sync all files to production"""
    print(f"📦 Found {len(files)} files to sync")
    print()
    
    async with aiohttp.ClientSession() as session:
        # Load campaign mapping first
        await load_campaign_mapping(session)
        print()
        
        successful = 0
        failed = 0
        skipped = 0
        
        for i, filepath in enumerate(files, 1):
            print(f"[{i}/{len(files)}] Processing: {filepath.name}")
            
            success = await sync_file(filepath, session)
            
            if success:
                successful += 1
            else:
                failed += 1
            
            # Rate limiting
            await asyncio.sleep(1)
            print()
        
        # Summary
        print("=" * 60)
        print("📊 SYNC SUMMARY")
        print("=" * 60)
        print(f"✅ Successful: {successful}")
        print(f"❌ Failed: {failed}")
        print(f"📁 Total files: {len(files)}")
        print()
        
        if failed > 0:
            print("⚠️  Some files failed to sync. Check errors above.")
        else:
            print("🎉 All files synced successfully!")

async def main():
    """Main sync function"""
    print("=" * 60)
    print("🔄 S4A Data Sync to Production")
    print("=" * 60)
    print(f"API: {PRODUCTION_API}")
    print(f"Auth: {'Enabled' if API_KEY else 'Disabled'}")
    print()
    
    # Check data directory
    data_dir = Path('data')
    if not data_dir.exists():
        print("❌ No data directory found!")
        print(f"   Expected: {data_dir.absolute()}")
        return
    
    # Get sync mode
    import sys
    if len(sys.argv) > 1:
        if sys.argv[1] == '--today':
            # Sync only today's files
            today = datetime.now().strftime('%Y%m%d')
            files = list(data_dir.glob(f'song_*_{today}_*.json'))
            print(f"📅 Mode: Today only ({today})")
        elif sys.argv[1] == '--all':
            # Sync all files
            files = list(data_dir.glob('song_*.json'))
            print(f"📅 Mode: All files")
        else:
            print("❌ Unknown option. Usage:")
            print("   python sync_to_production.py          # Today's files (default)")
            print("   python sync_to_production.py --today  # Today's files")
            print("   python sync_to_production.py --all    # All files")
            return
    else:
        # Default: today's files
        today = datetime.now().strftime('%Y%m%d')
        files = list(data_dir.glob(f'song_*_{today}_*.json'))
        print(f"📅 Mode: Today only ({today})")
    
    print()
    
    if not files:
        print("📭 No files to sync")
        print()
        print("Run the scraper first:")
        print("   python run_s4a_list.py")
        return
    
    # Confirm before syncing
    print(f"Ready to sync {len(files)} files to production")
    response = input("Continue? (y/N): ")
    
    if response.lower() != 'y':
        print("❌ Cancelled")
        return
    
    print()
    
    # Sync files
    await sync_all_files(files)

if __name__ == "__main__":
    asyncio.run(main())

