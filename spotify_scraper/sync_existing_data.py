#!/usr/bin/env python3
"""
One-time sync: Populate campaign_playlists from existing spotify_campaigns data
This extracts playlist data from the scrape_data JSON field and syncs to campaign_playlists
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import requests

# Load environment
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://api.artistinfluence.com')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json'
}

def sync_campaign_playlists(campaign_id, scrape_data):
    """Extract and sync playlist data from scrape_data JSON"""
    try:
        # Extract unique playlists across all time ranges
        playlists_by_name = {}
        
        for time_range, time_data in scrape_data.get('time_ranges', {}).items():
            stats = time_data.get('stats', {})
            playlists = stats.get('playlists', [])
            
            for playlist in playlists:
                playlist_name = playlist.get('name', 'Unknown')
                if playlist_name not in playlists_by_name:
                    playlists_by_name[playlist_name] = {
                        'playlist_name': playlist_name,
                        'streams_24h': 0,
                        'streams_7d': 0,
                        'streams_28d': 0,
                    }
                
                # Remove commas and convert to int
                streams_str = str(playlist.get('streams', 0)).replace(',', '')
                streams = int(streams_str) if streams_str.isdigit() else 0
                
                if time_range == '24hour':
                    playlists_by_name[playlist_name]['streams_24h'] = streams
                elif time_range == '7day':
                    playlists_by_name[playlist_name]['streams_7d'] = streams
                elif time_range == '28day':
                    playlists_by_name[playlist_name]['streams_28d'] = streams
        
        if not playlists_by_name:
            return 0
        
        # Delete old entries for this campaign
        delete_url = f"{SUPABASE_URL}/rest/v1/campaign_playlists"
        delete_params = {'campaign_id': f'eq.{campaign_id}'}
        requests.delete(delete_url, headers=headers, params=delete_params)
        
        # Insert new playlist data
        playlist_records = []
        for playlist_data in playlists_by_name.values():
            record = {
                'campaign_id': campaign_id,
                'playlist_name': playlist_data['playlist_name'],
                'streams_24h': playlist_data['streams_24h'],
                'streams_7d': playlist_data['streams_7d'],
                'streams_28d': playlist_data['streams_28d'],
            }
            playlist_records.append(record)
        
        # Batch insert
        insert_url = f"{SUPABASE_URL}/rest/v1/campaign_playlists"
        response = requests.post(insert_url, headers=headers, json=playlist_records)
        
        if response.status_code in [200, 201]:
            return len(playlist_records)
        else:
            print(f"  ❌ Campaign {campaign_id} failed: {response.status_code}")
            return 0
            
    except Exception as e:
        print(f"  ❌ Campaign {campaign_id} error: {e}")
        return 0


def main():
    print("="*60)
    print(" SYNC EXISTING SCRAPE DATA TO campaign_playlists")
    print("="*60)
    print()
    
    # Fetch all campaigns with scrape_data
    url = f"{SUPABASE_URL}/rest/v1/spotify_campaigns"
    params = {
        'select': 'id,campaign,scrape_data',
        'scrape_data': 'not.is.null',
        'order': 'id.asc'
    }
    
    response = requests.get(url, headers=headers, params=params)
    
    if response.status_code != 200:
        print(f"❌ Failed to fetch campaigns: {response.status_code}")
        return
    
    campaigns = response.json()
    print(f"Found {len(campaigns)} campaigns with scraped data")
    print()
    
    total_playlists = 0
    success_count = 0
    
    for i, campaign in enumerate(campaigns, 1):
        campaign_id = campaign['id']
        campaign_name = campaign.get('campaign', 'Unknown')
        scrape_data = campaign.get('scrape_data', {})
        
        if not scrape_data:
            continue
        
        print(f"[{i}/{len(campaigns)}] {campaign_name}...", end=' ')
        
        playlist_count = sync_campaign_playlists(campaign_id, scrape_data)
        
        if playlist_count > 0:
            print(f"✓ {playlist_count} playlists")
            total_playlists += playlist_count
            success_count += 1
        else:
            print("⚠️  No playlists")
    
    print()
    print("="*60)
    print(f"✅ Synced {success_count}/{len(campaigns)} campaigns")
    print(f"✅ Total playlists: {total_playlists}")
    print("="*60)


if __name__ == '__main__':
    main()

