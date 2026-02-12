#!/usr/bin/env python3
"""Check playlist data in database for a campaign."""
import os, json, requests
from dotenv import load_dotenv
load_dotenv()

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
headers = {'apikey': key, 'Authorization': f'Bearer {key}'}

r = requests.get(
    f'{url}/rest/v1/campaign_playlists',
    headers=headers,
    params={'campaign_id': 'eq.10180', 'select': 'playlist_name,streams_24h,streams_7d,streams_12m,is_algorithmic'}
)
for p in r.json():
    print(json.dumps(p))
