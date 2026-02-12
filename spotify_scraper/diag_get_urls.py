#!/usr/bin/env python3
"""Quick diagnostic: fetch sample SFA URLs from the database."""
import json, os, sys
from dotenv import load_dotenv
load_dotenv()

from supabase import create_client
url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
sb = create_client(url, key)

result = sb.table('spotify_campaigns').select(
    'id, campaign, sfa, streams_24h, streams_7d'
).not_.is_('sfa', 'null').order('streams_7d', desc=True).limit(5).execute()

for r in result.data:
    print(json.dumps(r))
