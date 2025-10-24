#!/usr/bin/env python3
"""
Generate SQL import script from scraped JSON files
This bypasses the JWT authentication issue by creating direct SQL statements
"""

import json
import os
from pathlib import Path
from datetime import datetime

def extract_track_id_from_filename(filename):
    """Extract Spotify track ID from filename like 'song_08Bd5NkwharGRRlyycDD8R_20251023.json'"""
    if filename.startswith('song_') and filename.endswith('.json'):
        parts = filename.replace('song_', '').replace('.json', '').split('_')
        if len(parts) >= 1:
            return parts[0]
    return None

def is_algorithmic_playlist(playlist_name, curator):
    """Determine if a playlist is algorithmic based on name and curator"""
    name_lower = playlist_name.lower()
    curator_lower = curator.lower()
    
    algorithmic_keywords = [
        'discover weekly', 'radio', 'daily mix', 'daylist', 
        'smart shuffle', 'release radar', 'on repeat', 'repeat rewind'
    ]
    
    return any(keyword in name_lower for keyword in algorithmic_keywords) or curator_lower == 'spotify'

def generate_sql_from_scraped_data():
    """Generate SQL import statements from all scraped JSON files"""
    
    data_dir = Path('spotify_scraper/data')
    if not data_dir.exists():
        print(f"❌ Data directory not found: {data_dir}")
        return
    
    json_files = list(data_dir.glob('song_*.json'))
    print(f"📁 Found {len(json_files)} JSON files")
    
    if len(json_files) == 0:
        print("⚠️  No song JSON files found!")
        return
    
    sql_statements = []
    sql_statements.append("-- ================================================================================")
    sql_statements.append("-- AUTO-GENERATED SQL IMPORT FROM SCRAPED DATA")
    sql_statements.append(f"-- Generated: {datetime.now().isoformat()}")
    sql_statements.append(f"-- Total files: {len(json_files)}")
    sql_statements.append("-- ================================================================================\n")
    
    campaigns_updated = 0
    playlists_processed = 0
    
    for json_file in sorted(json_files):
        track_id = extract_track_id_from_filename(json_file.name)
        if not track_id:
            continue
        
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            print(f"⚠️  Error reading {json_file.name}: {e}")
            continue
        
        # Generate SFA URL
        sfa_url = f"https://artists.spotify.com/c/song/{track_id}/stats"
        
        sql_statements.append(f"\n-- ============================================================")
        sql_statements.append(f"-- Track ID: {track_id}")
        sql_statements.append(f"-- File: {json_file.name}")
        sql_statements.append(f"-- ============================================================")
        
        # Update campaign with SFA URL
        sql_statements.append(f"DO $$")
        sql_statements.append(f"DECLARE")
        sql_statements.append(f"  v_campaign_id INTEGER;")
        sql_statements.append(f"BEGIN")
        sql_statements.append(f"  -- Find campaign by track ID")
        sql_statements.append(f"  SELECT id INTO v_campaign_id")
        sql_statements.append(f"  FROM spotify_campaigns")
        sql_statements.append(f"  WHERE url LIKE '%{track_id}%' OR sfa LIKE '%{track_id}%'")
        sql_statements.append(f"  LIMIT 1;")
        sql_statements.append(f"")
        sql_statements.append(f"  -- Update SFA URL if campaign found")
        sql_statements.append(f"  IF v_campaign_id IS NOT NULL THEN")
        sql_statements.append(f"    UPDATE spotify_campaigns")
        sql_statements.append(f"    SET sfa = '{sfa_url}', updated_at = NOW()")
        sql_statements.append(f"    WHERE id = v_campaign_id;")
        sql_statements.append(f"")
        sql_statements.append(f"    RAISE NOTICE 'Found campaign: %', v_campaign_id;")
        
        campaigns_updated += 1
        
        # Process playlists
        if 'time_ranges' in data:
            all_playlists = {}  # playlist_name|curator -> playlist data
            
            for time_range in ['28day', '7day', '12months']:
                if (time_range in data['time_ranges'] and 
                    'stats' in data['time_ranges'][time_range] and 
                    'playlists' in data['time_ranges'][time_range]['stats']):
                    
                    playlists = data['time_ranges'][time_range]['stats']['playlists']
                    
                    for playlist in playlists:
                        if not playlist.get('name'):
                            continue
                        
                        name = playlist['name'].replace("'", "''")  # Escape single quotes
                        curator = (playlist.get('made_by') or 'Unknown').replace("'", "''")
                        streams = int(playlist.get('streams', '0').replace(',', ''))
                        date_added = playlist.get('date_added', '2024-01-01')
                        
                        playlist_key = f"{name}|{curator}"
                        
                        if playlist_key not in all_playlists:
                            all_playlists[playlist_key] = {
                                'name': name,
                                'curator': curator,
                                'date_added': date_added,
                                'streams': {}
                            }
                        
                        all_playlists[playlist_key]['streams'][time_range] = streams
            
            # Generate INSERT statements for playlists
            if all_playlists:
                sql_statements.append(f"")
                sql_statements.append(f"    -- Insert/Update {len(all_playlists)} playlists")
                
                for playlist_data in all_playlists.values():
                    streams_28d = playlist_data['streams'].get('28day', 0)
                    streams_7d = playlist_data['streams'].get('7day', 0)
                    streams_12m = playlist_data['streams'].get('12months', 0)
                    
                    sql_statements.append(f"    INSERT INTO campaign_playlists (")
                    sql_statements.append(f"      campaign_id, playlist_name, playlist_curator,")
                    sql_statements.append(f"      streams_28d, streams_7d, streams_12m,")
                    sql_statements.append(f"      date_added, last_scraped")
                    sql_statements.append(f"    ) VALUES (")
                    sql_statements.append(f"      v_campaign_id,")
                    sql_statements.append(f"      '{playlist_data['name']}',")
                    sql_statements.append(f"      '{playlist_data['curator']}',")
                    sql_statements.append(f"      {streams_28d}, {streams_7d}, {streams_12m},")
                    sql_statements.append(f"      '{playlist_data['date_added']}', NOW()")
                    sql_statements.append(f"    ) ON CONFLICT (campaign_id, playlist_name, playlist_curator)")
                    sql_statements.append(f"    DO UPDATE SET")
                    sql_statements.append(f"      streams_28d = EXCLUDED.streams_28d,")
                    sql_statements.append(f"      streams_7d = EXCLUDED.streams_7d,")
                    sql_statements.append(f"      streams_12m = EXCLUDED.streams_12m,")
                    sql_statements.append(f"      last_scraped = EXCLUDED.last_scraped,")
                    sql_statements.append(f"      updated_at = NOW();")
                    sql_statements.append(f"")
                    
                    playlists_processed += 1
        
        sql_statements.append(f"  ELSE")
        sql_statements.append(f"    RAISE NOTICE 'Campaign not found for track: {track_id}';")
        sql_statements.append(f"  END IF;")
        sql_statements.append(f"END $$;")
    
    sql_statements.append(f"\n-- ================================================================================")
    sql_statements.append(f"-- SUMMARY")
    sql_statements.append(f"-- ================================================================================")
    sql_statements.append(f"-- Campaigns updated: {campaigns_updated}")
    sql_statements.append(f"-- Playlists processed: {playlists_processed}")
    sql_statements.append(f"-- ================================================================================")
    
    # Write to file
    output_file = Path('IMPORT-SCRAPED-DATA.sql')
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_statements))
    
    print(f"✅ Generated SQL import script: {output_file}")
    print(f"📊 Campaigns: {campaigns_updated}")
    print(f"📊 Playlists: {playlists_processed}")
    print(f"\n🚀 Run this SQL in Supabase Studio on production!")

if __name__ == '__main__':
    generate_sql_from_scraped_data()

