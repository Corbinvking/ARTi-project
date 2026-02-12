#!/usr/bin/env python3
"""Add streams_alltime column to spotify_campaigns table."""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

# Try direct SQL via the database connection
# Supabase exposes postgresql, so we can use psycopg2 or the SQL editor
# But for the REST API, we'll try creating via rpc
sql = "ALTER TABLE spotify_campaigns ADD COLUMN IF NOT EXISTS streams_alltime bigint DEFAULT 0;"

# Try the rpc/exec_sql endpoint (if available)
r = requests.post(
    f'{url}/rest/v1/rpc/exec_sql',
    headers=headers,
    json={'query': sql}
)
print(f'exec_sql: {r.status_code} - {r.text[:200]}')

# If that doesn't work, try via the management API
if r.status_code != 200:
    print("\nTrying direct psycopg2...")
    try:
        import psycopg2
        # Parse the Supabase URL to get the DB connection string
        db_url = os.getenv('DATABASE_URL') or os.getenv('POSTGRES_URL')
        if db_url:
            conn = psycopg2.connect(db_url)
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute(sql)
            print("Column added successfully via psycopg2")
            cur.close()
            conn.close()
        else:
            print("No DATABASE_URL found, trying default Supabase postgres...")
            # Default Supabase postgres connection
            from urllib.parse import urlparse
            parsed = urlparse(url)
            host = parsed.hostname
            # Supabase DB is typically on port 5432 with the same host
            conn = psycopg2.connect(
                host=host,
                port=5432,
                dbname='postgres',
                user='postgres',
                password=os.getenv('POSTGRES_PASSWORD', key)
            )
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute(sql)
            print("Column added successfully via psycopg2 (default connection)")
            cur.close()
            conn.close()
    except Exception as e:
        print(f"psycopg2 failed: {e}")
        print("\nPlease add the column manually via Supabase SQL editor:")
        print(f"  {sql}")
