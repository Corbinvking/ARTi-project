#!/usr/bin/env python3
"""Check scrape_data detail for mismatched campaigns."""
import os, json, requests
from dotenv import load_dotenv
load_dotenv()

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
h = {'apikey': key, 'Authorization': f'Bearer {key}'}

# Check campaigns with P.24h=0 but C.24h>0 (the most suspicious pattern)
for cid in [10197, 10227, 10257, 10319, 10330]:  # BGZ, Disgo, illadelph, Madwen, Mirko
    r = requests.get(f'{url}/rest/v1/spotify_campaigns', headers=h, params={
        'id': f'eq.{cid}',
        'select': 'id,campaign,streams_24h,streams_7d,streams_12m,scrape_data'
    })
    c = r.json()[0]
    sd = c.get('scrape_data') or {}
    
    print(f"\n{'='*60}")
    print(f"Campaign {cid}: {c['campaign']}")
    print(f"  DB: 24h={c['streams_24h']}, 7d={c['streams_7d']}, 12m={c['streams_12m']}")
    
    for tr in ['7day', '28day', '12months']:
        td = (sd.get('time_ranges') or {}).get(tr, {})
        stats = td.get('stats', {})
        pls = stats.get('playlists', [])
        total = stats.get('streams', 0)
        print(f"  scrape_data[{tr}]: total={total}, playlists={len(pls)}")
        for p in pls[:3]:
            print(f"    - {p.get('name','?')[:40]:40s} streams={p.get('streams','0')}")

    # Check what's in campaign_playlists  
    r2 = requests.get(f'{url}/rest/v1/campaign_playlists', headers=h, params={
        'campaign_id': f'eq.{cid}',
        'select': 'playlist_name,streams_24h,streams_7d,streams_12m',
        'order': 'streams_12m.desc',
        'limit': '5'
    })
    pls = r2.json()
    print(f"  campaign_playlists ({len(pls)} shown):")
    for p in pls:
        print(f"    {p['playlist_name'][:40]:40s} 24h={p.get('streams_24h',0):>6} 7d={p.get('streams_7d',0):>6} 12m={p.get('streams_12m',0):>6}")
