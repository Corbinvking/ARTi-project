#!/bin/bash

# Import Campaigns from CSV to Production Database
# This script uses psql directly to import data, avoiding Supabase client connection issues

echo "🚀 Starting direct campaign import from CSV..."
echo ""

# Check if CSV exists
if [ ! -f "Spotify Playlisting-Active Campaigns (1).csv" ]; then
    echo "❌ Error: CSV file not found!"
    echo "Please upload the CSV file to the current directory first:"
    echo "  scp 'Spotify Playlisting-Active Campaigns (1).csv' root@157.230.82.234:/root/arti-marketing-ops/"
    exit 1
fi

echo "📄 CSV file found"
echo "📊 Importing campaigns via direct database connection..."
echo ""

# Run the import using the Python script (more reliable for CSV parsing)
cat > /tmp/import_campaigns.py << 'EOF'
import csv
import psycopg2
import sys
from datetime import datetime

# Connect to database
conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='postgres',
    user='postgres',
    password='your-secure-postgres-password'
)
cur = conn.cursor()

# Get or create default org
cur.execute("SELECT id FROM orgs LIMIT 1")
org_result = cur.fetchone()
org_id = org_result[0] if org_result else '00000000-0000-0000-0000-000000000001'

imported = 0
skipped = 0
failed = 0

with open('Spotify Playlisting-Active Campaigns (1).csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    total = sum(1 for _ in open('Spotify Playlisting-Active Campaigns (1).csv', encoding='utf-8')) - 1
    
    f.seek(0)
    next(reader)  # Skip header
    
    for i, row in enumerate(reader, 1):
        campaign_name = row.get('Campaign', '').strip()
        
        if not campaign_name:
            print(f"[{i}/{total}] Skipping empty campaign")
            skipped += 1
            continue
            
        print(f"[{i}/{total}] Importing: {campaign_name[:50]}...")
        
        try:
            # Check if exists
            cur.execute("SELECT id FROM spotify_campaigns WHERE campaign_name = %s", (campaign_name,))
            if cur.fetchone():
                print(f"  ⏭️  Already exists")
                skipped += 1
                continue
            
            # Get or create client
            client_id = None
            client_name = row.get('Client', '').strip()
            if client_name:
                cur.execute("SELECT id FROM clients WHERE name = %s", (client_name,))
                client_result = cur.fetchone()
                if client_result:
                    client_id = client_result[0]
                else:
                    cur.execute(
                        "INSERT INTO clients (name, org_id) VALUES (%s, %s) RETURNING id",
                        (client_name, org_id)
                    )
                    client_id = cur.fetchone()[0]
                    print(f"  ➕ Created client: {client_name}")
            
            # Get or create vendor
            vendor_id = None
            vendor_name = row.get('Vendor', '').strip()
            if vendor_name:
                cur.execute("SELECT id FROM vendors WHERE name = %s", (vendor_name,))
                vendor_result = cur.fetchone()
                if vendor_result:
                    vendor_id = vendor_result[0]
                else:
                    cur.execute(
                        "INSERT INTO vendors (name, org_id, max_daily_streams) VALUES (%s, %s, 10000) RETURNING id",
                        (vendor_name, org_id)
                    )
                    vendor_id = cur.fetchone()[0]
                    print(f"  ➕ Created vendor: {vendor_name}")
            
            # Parse date
            start_date = None
            if row.get('Start Date'):
                try:
                    start_date = datetime.strptime(row['Start Date'], '%m/%d/%Y').date()
                except:
                    pass
            
            # Insert campaign
            cur.execute("""
                INSERT INTO spotify_campaigns (
                    campaign_name, client_id, client, vendor_id, vendor, url,
                    goal, remaining, daily, weekly, sale_price, start_date,
                    status, curator_status, playlists, sfa_link, notes,
                    historical_playlists, playlist_links, paid_vendor,
                    update_client_verified, notify_vendor, ask_for_sfa, org_id
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            """, (
                campaign_name,
                client_id,
                client_name or '',
                vendor_id,
                vendor_name or '',
                row.get('URL', ''),
                row.get('Goal', '0'),
                row.get('Remaining', '0'),
                row.get('Daily', '0'),
                row.get('Weekly', '0'),
                row.get('Sale price', '$0'),
                start_date,
                row.get('Status', 'Active'),
                row.get('Curator Status'),
                row.get('Playlists', ''),
                row.get('SFA'),
                row.get('Notes', ''),
                row.get('Playlists', ''),
                row.get('SP Playlist Stuff', ''),
                row.get('Paid Vendor?') == 'checked',
                row.get('Update Client') == 'checked',
                row.get('Notify Vendor?') == 'checked',
                row.get('Ask For SFA') == 'checked',
                org_id
            ))
            
            conn.commit()
            imported += 1
            print(f"  ✅ Imported\n")
            
        except Exception as e:
            conn.rollback()
            print(f"  ❌ Error: {str(e)}\n")
            failed += 1

cur.close()
conn.close()

print("")
print("=" * 60)
print("📈 IMPORT SUMMARY")
print("=" * 60)
print(f"✅ Successfully imported: {imported}")
print(f"⏭️  Skipped (existing):   {skipped}")
print(f"❌ Failed:                {failed}")
print(f"📊 Total in CSV:          {total}")
print("=" * 60)
EOF

python3 /tmp/import_campaigns.py

