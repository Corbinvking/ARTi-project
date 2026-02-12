#!/usr/bin/env python3
"""Check ALL campaigns for data inconsistencies between spotify_campaigns and campaign_playlists."""
import os, json, requests
from dotenv import load_dotenv
load_dotenv()

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
h = {'apikey': key, 'Authorization': f'Bearer {key}'}

# Get all campaigns with stream data
r = requests.get(f'{url}/rest/v1/spotify_campaigns', headers=h, params={
    'select': 'id,campaign,streams_24h,streams_7d,streams_12m,last_scraped_at',
    'streams_24h': 'gt.0',
    'order': 'id.asc',
    'limit': '300'
})
campaigns = r.json()
print(f"Checking {len(campaigns)} campaigns with non-zero streams...\n")

mismatches = []
for c in campaigns:
    cid = c['id']
    # Get sum of campaign_playlists for this campaign
    r2 = requests.get(f'{url}/rest/v1/campaign_playlists', headers=h, params={
        'campaign_id': f'eq.{cid}',
        'select': 'streams_24h,streams_7d,streams_12m'
    })
    playlists = r2.json()
    if not playlists:
        continue
    
    pl_24h = sum(p.get('streams_24h') or 0 for p in playlists)
    pl_7d = sum(p.get('streams_7d') or 0 for p in playlists)
    pl_12m = sum(p.get('streams_12m') or 0 for p in playlists)
    
    c_24h = c.get('streams_24h') or 0
    c_7d = c.get('streams_7d') or 0
    c_12m = c.get('streams_12m') or 0
    
    # Check for mismatches (allow some tolerance for zero-protection)
    if c_24h != pl_24h or c_7d != pl_7d:
        mismatch = {
            'id': cid,
            'name': c['campaign'][:50],
            'scraped': c.get('last_scraped_at', '')[:19],
            'campaign_24h': c_24h, 'playlist_24h': pl_24h, 'diff_24h': c_24h - pl_24h,
            'campaign_7d': c_7d, 'playlist_7d': pl_7d, 'diff_7d': c_7d - pl_7d,
        }
        mismatches.append(mismatch)

print(f"Found {len(mismatches)} mismatches out of {len(campaigns)} campaigns\n")

if mismatches:
    print(f"{'ID':>6} {'Campaign':<50} {'C.24h':>7} {'P.24h':>7} {'Diff':>7} | {'C.7d':>7} {'P.7d':>7} {'Diff':>7} | Scraped")
    print("-" * 130)
    for m in mismatches[:20]:
        print(f"{m['id']:>6} {m['name']:<50} {m['campaign_24h']:>7} {m['playlist_24h']:>7} {m['diff_24h']:>7} | {m['campaign_7d']:>7} {m['playlist_7d']:>7} {m['diff_7d']:>7} | {m['scraped']}")
else:
    print("All campaigns are consistent!")
