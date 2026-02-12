#!/usr/bin/env python3
"""Investigate SQISHI - CRIMINAL SLANG data inconsistency."""
import os, json, requests
from dotenv import load_dotenv
load_dotenv()

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
h = {'apikey': key, 'Authorization': f'Bearer {key}'}

# Find SQISHI campaign
r = requests.get(f'{url}/rest/v1/spotify_campaigns', headers=h, params={
    'campaign': 'ilike.%SQISHI%CRIMINAL%',
    'select': 'id,campaign,streams_24h,streams_7d,streams_12m,last_scraped_at,scrape_data'
})

for c in r.json():
    sd = c.pop('scrape_data', None) or {}
    print("=" * 70)
    print(f"CAMPAIGN: id={c['id']}, name={c['campaign']}")
    print(f"  streams_24h={c['streams_24h']}, streams_7d={c['streams_7d']}, streams_12m={c['streams_12m']}")
    print(f"  last_scraped_at={c['last_scraped_at']}")
    print(f"  alltime_streams={sd.get('alltime_streams', 'N/A')}")
    
    for tr, td in (sd.get('time_ranges') or {}).items():
        stats = td.get('stats', {})
        pcount = len(stats.get('playlists', []))
        print(f"  scrape_data.{tr}: streams={stats.get('streams', 0)}, playlists={pcount}")
    
    # Now get campaign_playlists
    cid = c['id']
    r2 = requests.get(f'{url}/rest/v1/campaign_playlists', headers=h, params={
        'campaign_id': f'eq.{cid}',
        'select': 'playlist_name,streams_24h,streams_7d,streams_12m,is_algorithmic',
        'order': 'streams_12m.desc'
    })
    playlists = r2.json()
    
    total_24h = sum(p.get('streams_24h') or 0 for p in playlists)
    total_7d = sum(p.get('streams_7d') or 0 for p in playlists)
    total_12m = sum(p.get('streams_12m') or 0 for p in playlists)
    algo_24h = sum(p.get('streams_24h') or 0 for p in playlists if p.get('is_algorithmic'))
    algo_7d = sum(p.get('streams_7d') or 0 for p in playlists if p.get('is_algorithmic'))
    algo_12m = sum(p.get('streams_12m') or 0 for p in playlists if p.get('is_algorithmic'))
    algo_count = sum(1 for p in playlists if p.get('is_algorithmic'))
    
    print(f"\nPLAYLISTS: {len(playlists)} total ({algo_count} algorithmic)")
    print(f"  SUM campaign_playlists: 24h={total_24h}, 7d={total_7d}, 12m={total_12m}")
    print(f"  SUM algorithmic only:   24h={algo_24h}, 7d={algo_7d}, 12m={algo_12m}")
    print(f"  CAMPAIGN TABLE values:  24h={c['streams_24h']}, 7d={c['streams_7d']}, 12m={c['streams_12m']}")
    print()
    
    # Check for mismatch
    if total_24h != c['streams_24h']:
        print(f"  *** MISMATCH 24h: playlists sum={total_24h} vs campaign={c['streams_24h']}")
    if total_7d != c['streams_7d']:
        print(f"  *** MISMATCH 7d: playlists sum={total_7d} vs campaign={c['streams_7d']}")
    if total_12m != c['streams_12m']:
        print(f"  *** MISMATCH 12m: playlists sum={total_12m} vs campaign={c['streams_12m']}")
    
    print(f"\nTOP 15 PLAYLISTS:")
    for p in playlists[:15]:
        tag = '[ALGO]' if p.get('is_algorithmic') else '      '
        name = (p['playlist_name'] or '')[:40]
        print(f"  {tag} {name:40s} 24h={str(p.get('streams_24h',0)):>6} 7d={str(p.get('streams_7d',0)):>6} 12m={str(p.get('streams_12m',0)):>6}")
