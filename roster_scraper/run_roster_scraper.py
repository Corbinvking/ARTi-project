#!/usr/bin/env python3
"""
Roster URL Collector - Main Script
Extracts SFA URLs for all campaigns from Spotify for Artists Roster
"""
import asyncio
import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any

from runner.app.csv_parser import CampaignCSVParser, extract_track_id
from runner.app.roster_scraper import RosterScraper


async def main():
    print("=" * 80)
    print("🎯 SPOTIFY FOR ARTISTS - ROSTER URL COLLECTOR")
    print("=" * 80)
    print()
    
    # Configuration
    csv_path = Path('../full-databse-chunk.csv')
    output_dir = Path('data')
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Step 1: Parse CSV
    print("📋 Step 1: Parsing Active Campaigns CSV...")
    print("-" * 80)
    parser = CampaignCSVParser(csv_path)
    campaigns = parser.parse()
    parser.print_summary()
    
    unique_clients = parser.get_unique_clients()
    
    print()
    input("Press Enter to continue...")
    print()
    
    # Step 2: Initialize scraper
    print("🚀 Step 2: Initializing browser...")
    print("-" * 80)
    
    async with RosterScraper() as scraper:
        # Verify login
        is_logged_in = await scraper.verify_login()
        
        if not is_logged_in:
            is_logged_in = await scraper.wait_for_login()
            if not is_logged_in:
                print("\n❌ Cannot proceed without login. Exiting...")
                return
        
        print()
        
        # Step 3: Collect SFA URLs from Roster
        print("📋 Step 3: Collecting SFA URLs from Roster...")
        print("-" * 80)
        print(f"Processing {len(unique_clients)} clients...")
        print()
        
        results = {
            'scraped_at': datetime.now().isoformat(),
            'total_campaigns': len(campaigns),
            'total_clients': len(unique_clients),
            'clients': {}
        }
        
        sfa_urls = []
        successful_songs = 0
        failed_songs = 0
        successful_clients = 0
        failed_clients = 0
        
        for i, client_name in enumerate(unique_clients, 1):
            print(f"\n[{i}/{len(unique_clients)}] Processing: {client_name}")
            print("-" * 40)
            
            try:
                # Get campaign songs for this client
                client_campaigns = parser.get_songs_by_client(client_name)
                print(f"   📝 {len(client_campaigns)} campaign(s) for this client")
                
                # Get all songs from Roster
                roster_songs = await scraper.get_artist_songs_from_roster(client_name)
                
                if not roster_songs:
                    print(f"   ⚠️  No songs found in Roster")
                    failed_clients += 1
                    
                    # Save client result
                    results['clients'][client_name] = {
                        'campaigns': len(client_campaigns),
                        'roster_songs_found': 0,
                        'matched_songs': 0,
                        'status': 'no_roster_songs'
                    }
                    continue
                
                print(f"   ✅ Found {len(roster_songs)} song(s) in Roster")
                
                # Match campaign songs to roster songs
                matched_songs = []
                for campaign in client_campaigns:
                    # Extract song name from campaign
                    song_name = campaign.song_name
                    
                    # Find matching song in roster
                    match = scraper.roster_page.find_song_match(song_name, roster_songs)
                    
                    if match:
                        print(f"      ✅ Matched: {song_name} → {match['sfa_url']}")
                        
                        matched_songs.append({
                            'campaign': campaign.campaign_name,
                            'client': client_name,
                            'artist': campaign.artist_name,
                            'song': song_name,
                            'sfa_url': match['sfa_url'],
                            'track_id': match['track_id'],
                            'goal': campaign.goal,
                            'vendor': campaign.vendor
                        })
                        
                        sfa_urls.append(match['sfa_url'])
                        successful_songs += 1
                    else:
                        print(f"      ⚠️  No match: {song_name}")
                        failed_songs += 1
                
                # Save client result
                results['clients'][client_name] = {
                    'campaigns': len(client_campaigns),
                    'roster_songs_found': len(roster_songs),
                    'matched_songs': len(matched_songs),
                    'songs': matched_songs,
                    'status': 'success'
                }
                
                successful_clients += 1
                
                # Wait between clients to avoid rate limiting
                if i < len(unique_clients):
                    print("   ⏳ Waiting 2 seconds...")
                    await asyncio.sleep(2)
            
            except Exception as e:
                print(f"   ❌ Error: {e}")
                failed_clients += 1
                
                results['clients'][client_name] = {
                    'campaigns': len(parser.get_songs_by_client(client_name)),
                    'roster_songs_found': 0,
                    'matched_songs': 0,
                    'status': 'error',
                    'error': str(e)
                }
                continue
        
        # Step 4: Save results
        print("\n" + "=" * 80)
        print("💾 Step 4: Saving results...")
        print("-" * 80)
        
        # Save complete results JSON
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        results_filename = f"roster_scraping_results_{timestamp}.json"
        results_filepath = output_dir / results_filename
        
        with open(results_filepath, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Saved results to: {results_filepath}")
        
        # Save SFA URLs markdown file
        markdown_filename = f"sfa-urls-from-roster_{timestamp}.md"
        markdown_filepath = output_dir / markdown_filename
        
        with open(markdown_filepath, 'w', encoding='utf-8') as f:
            f.write("# Spotify for Artists URLs - Collected from Roster\n\n")
            f.write(f"**Collected at:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write(f"**Total URLs:** {len(sfa_urls)}\n\n")
            f.write("---\n\n")
            
            # Group by client
            for client_name in sorted(results['clients'].keys()):
                client_data = results['clients'][client_name]
                
                if client_data['status'] == 'success' and client_data.get('songs'):
                    f.write(f"## {client_name}\n\n")
                    f.write(f"**Songs:** {client_data['matched_songs']}\n\n")
                    
                    for song in client_data['songs']:
                        f.write(f"### {song['song']}\n")
                        f.write(f"- **Campaign:** {song['campaign']}\n")
                        f.write(f"- **Artist:** {song['artist']}\n")
                        f.write(f"- **URL:** {song['sfa_url']}\n")
                        f.write(f"- **Track ID:** {song['track_id']}\n")
                        f.write(f"- **Goal:** {song['goal']:,} streams\n")
                        if song['vendor']:
                            f.write(f"- **Vendor:** {song['vendor']}\n")
                        f.write("\n")
                    
                    f.write("---\n\n")
            
            # Add simple list at the end
            f.write("## Simple URL List (for scraper input)\n\n")
            f.write("```\n")
            for url in sorted(set(sfa_urls)):  # Deduplicate
                f.write(f"{url}\n")
            f.write("```\n")
        
        print(f"✅ Saved SFA URLs to: {markdown_filepath}")
        
        # Also save simple text file with just URLs
        simple_filename = f"sfa-urls-simple_{timestamp}.txt"
        simple_filepath = output_dir / simple_filename
        
        with open(simple_filepath, 'w', encoding='utf-8') as f:
            for url in sorted(set(sfa_urls)):
                f.write(f"{url}\n")
        
        print(f"✅ Saved simple URL list to: {simple_filepath}")
        
        # Final summary
        print("\n" + "=" * 80)
        print("📊 SCRAPING COMPLETE")
        print("=" * 80)
        print(f"\n✅ Successful clients: {successful_clients}/{len(unique_clients)}")
        print(f"❌ Failed clients: {failed_clients}/{len(unique_clients)}")
        print(f"\n✅ Songs matched: {successful_songs}")
        print(f"❌ Songs not found: {failed_songs}")
        print(f"\n📁 Unique SFA URLs collected: {len(set(sfa_urls))}")
        print(f"📁 Data files in: {output_dir}/")
        print()
        
        if successful_songs > 0:
            print("🎉 URL collection completed successfully!")
            print("\n💡 Next step: Run existing scraper with collected URLs:")
            print(f"   python ../spotify_scraper/run_s4a_list.py")
            print(f"   (Update script to read from: {simple_filepath})")


if __name__ == "__main__":
    asyncio.run(main())

