#!/usr/bin/env python3
"""
Test script to verify search functionality with 5 sample clients
"""
import asyncio
from runner.app.csv_parser import CampaignCSVParser
from runner.app.roster_scraper import RosterScraper

# Test with these 5 clients
TEST_CLIENTS = ['Segan', 'Reece Rosé', 'Hitskope', 'dack janiels', 'Jordan (Harden)']

async def main():
    print("=" * 80)
    print("🧪 TESTING ROSTER SEARCH WITH 5 SAMPLE CLIENTS")
    print("=" * 80)
    print()
    
    # Parse CSV
    print("📋 Parsing CSV...")
    parser = CampaignCSVParser('../Spotify Playlisting-Active Campaigns.csv')
    campaigns = parser.parse()
    
    print(f"✅ Found {len(campaigns)} campaigns")
    print()
    
    # Initialize scraper
    print("🚀 Starting browser...")
    async with RosterScraper() as scraper:
        # Verify login
        is_logged_in = await scraper.verify_login()
        
        if not is_logged_in:
            print("⚠️  Not logged in - please log in first")
            return
        
        print("✅ Logged in")
        print()
        
        # Test search with each client
        results = {
            'found': [],
            'not_found': [],
            'songs_collected': []
        }
        
        for i, client_name in enumerate(TEST_CLIENTS, 1):
            print(f"\n[{i}/{len(TEST_CLIENTS)}] Testing: {client_name}")
            print("-" * 40)
            
            try:
                # Get campaigns for this client
                client_campaigns = parser.get_songs_by_client(client_name)
                print(f"   📝 {len(client_campaigns)} campaign(s)")
                
                # Try to find artist in Roster
                songs = await scraper.get_artist_songs_from_roster(client_name)
                
                if songs:
                    print(f"   ✅ FOUND! {len(songs)} song(s) in Roster")
                    results['found'].append(client_name)
                    
                    # Try to match campaign songs
                    for campaign in client_campaigns[:3]:  # Test first 3
                        match = scraper.roster_page.find_song_match(
                            campaign.song_name,
                            songs
                        )
                        if match:
                            print(f"      ✅ Matched: {campaign.song_name} → {match['sfa_url'][:80]}...")
                            results['songs_collected'].append({
                                'client': client_name,
                                'song': campaign.song_name,
                                'sfa_url': match['sfa_url']
                            })
                        else:
                            print(f"      ⚠️  Not matched: {campaign.song_name}")
                else:
                    print(f"   ❌ NOT FOUND in Roster")
                    results['not_found'].append(client_name)
                
                # Wait between searches
                await asyncio.sleep(1)
            
            except Exception as e:
                print(f"   ❌ Error: {e}")
                results['not_found'].append(client_name)
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 TEST RESULTS")
        print("=" * 80)
        print(f"\n✅ Found in Roster: {len(results['found'])}/{len(TEST_CLIENTS)}")
        for client in results['found']:
            print(f"   • {client}")
        
        print(f"\n❌ Not Found: {len(results['not_found'])}/{len(TEST_CLIENTS)}")
        for client in results['not_found']:
            print(f"   • {client}")
        
        print(f"\n📝 SFA URLs Collected: {len(results['songs_collected'])}")
        for song in results['songs_collected'][:5]:  # Show first 5
            print(f"   • {song['client']} - {song['song']}")
            print(f"     {song['sfa_url'][:80]}...")
        
        if len(results['songs_collected']) > 5:
            print(f"   ... and {len(results['songs_collected']) - 5} more")
        
        print()
        if len(results['found']) >= 3:
            print("✅ SEARCH FUNCTIONALITY WORKING!")
            print("   Ready to run full scrape with all 106 clients.")
        else:
            print("⚠️  SEARCH MAY HAVE ISSUES")
            print("   Check if the correct account is logged in.")

if __name__ == "__main__":
    asyncio.run(main())

