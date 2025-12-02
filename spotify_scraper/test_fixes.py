#!/usr/bin/env python3
"""
Test script to verify both scraper fixes:
1. Historical data saved to scraped_data table
2. Algorithmic playlists properly tagged with is_algorithmic flag

Usage:
  python3 test_fixes.py
"""

import os
import sys
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load environment
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://api.artistinfluence.com')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json'
}

def test_historical_data():
    """Test if scraped_data table has recent entries"""
    print("\n" + "="*60)
    print("TEST #1: Historical Data in scraped_data Table")
    print("="*60)
    
    url = f"{SUPABASE_URL}/rest/v1/scraped_data"
    params = {
        'select': 'id,artist_name,song_title,scraped_at,platform',
        'order': 'scraped_at.desc',
        'limit': '10'
    }
    
    response = requests.get(url, headers=headers, params=params)
    
    if response.status_code != 200:
        print(f"❌ Failed to query scraped_data: {response.status_code}")
        return False
    
    data = response.json()
    
    if not data:
        print("❌ FAIL: No historical data found in scraped_data table")
        print("   The scraper should INSERT a new row after each scrape.")
        return False
    
    print(f"✅ PASS: Found {len(data)} historical records")
    print("\n📊 Most Recent Scrapes:")
    for i, record in enumerate(data[:5], 1):
        print(f"   {i}. {record.get('artist_name')} - {record.get('song_title')}")
        print(f"      Scraped: {record.get('scraped_at')}")
    
    return True


def test_algorithmic_flags():
    """Test if algorithmic playlists are properly tagged"""
    print("\n" + "="*60)
    print("TEST #2: Algorithmic Playlist Detection")
    print("="*60)
    
    # Count algorithmic vs vendor playlists
    url = f"{SUPABASE_URL}/rest/v1/campaign_playlists"
    params = {
        'select': 'playlist_name,is_algorithmic,streams_24h',
        'order': 'streams_24h.desc.nullslast',
        'limit': '50'
    }
    
    response = requests.get(url, headers=headers, params=params)
    
    if response.status_code != 200:
        print(f"❌ Failed to query campaign_playlists: {response.status_code}")
        return False
    
    playlists = response.json()
    
    if not playlists:
        print("❌ FAIL: No playlists found in campaign_playlists table")
        return False
    
    # Check for known algorithmic playlists
    algorithmic_keywords = ['radio', 'discover weekly', 'your dj', 'daylist', 'daily mix', 'release radar']
    
    algorithmic_playlists = [p for p in playlists if p.get('is_algorithmic')]
    vendor_playlists = [p for p in playlists if not p.get('is_algorithmic')]
    
    print(f"\n📊 Playlist Breakdown:")
    print(f"   Total playlists: {len(playlists)}")
    print(f"   🎵 Algorithmic: {len(algorithmic_playlists)}")
    print(f"   🎸 Vendor: {len(vendor_playlists)}")
    
    if len(algorithmic_playlists) == 0:
        print("\n❌ FAIL: No algorithmic playlists found!")
        print("   Expected to find playlists like 'Radio', 'Discover Weekly', etc.")
        return False
    
    print("\n✅ PASS: Algorithmic playlists detected")
    
    # Show examples
    print("\n🎵 Sample Algorithmic Playlists:")
    for playlist in algorithmic_playlists[:5]:
        print(f"   - {playlist.get('playlist_name')}")
    
    print("\n🎸 Sample Vendor Playlists:")
    for playlist in vendor_playlists[:5]:
        print(f"   - {playlist.get('playlist_name')}")
    
    # Check for false negatives (algorithmic playlists NOT tagged)
    false_negatives = []
    for playlist in vendor_playlists:
        name = playlist.get('playlist_name', '').lower()
        if any(keyword in name for keyword in algorithmic_keywords):
            false_negatives.append(playlist.get('playlist_name'))
    
    if false_negatives:
        print(f"\n⚠️  WARNING: Found {len(false_negatives)} potential false negatives:")
        for name in false_negatives[:5]:
            print(f"   - {name} (marked as vendor but looks algorithmic)")
        return False
    
    return True


def test_recent_scrape():
    """Check if the test scrape completed successfully"""
    print("\n" + "="*60)
    print("TEST #3: Recent Scrape Verification")
    print("="*60)
    
    url = f"{SUPABASE_URL}/rest/v1/spotify_campaigns"
    params = {
        'select': 'id,campaign,last_scraped_at,streams_24h,streams_7d',
        'order': 'last_scraped_at.desc.nullslast',
        'limit': '5',
        'last_scraped_at': 'not.is.null'
    }
    
    response = requests.get(url, headers=headers, params=params)
    
    if response.status_code != 200:
        print(f"❌ Failed to query spotify_campaigns: {response.status_code}")
        return False
    
    campaigns = response.json()
    
    if not campaigns:
        print("❌ FAIL: No campaigns with recent scrapes found")
        return False
    
    print(f"✅ PASS: Found {len(campaigns)} recently scraped campaigns")
    
    print("\n📊 Most Recent Scrapes:")
    for campaign in campaigns:
        print(f"   - {campaign.get('campaign')}")
        print(f"     Last scraped: {campaign.get('last_scraped_at')}")
        print(f"     24h streams: {campaign.get('streams_24h', 0):,}")
        print(f"     7d streams: {campaign.get('streams_7d', 0):,}")
    
    return True


def main():
    print("\n" + "="*60)
    print("SCRAPER FIXES VERIFICATION TEST")
    print("="*60)
    print("\nThis will verify:")
    print("  1. Historical data is saved to scraped_data table")
    print("  2. Algorithmic playlists are properly tagged")
    print("  3. Recent scrapes are recorded correctly")
    print("")
    
    results = []
    
    # Run tests
    results.append(("Historical Data", test_historical_data()))
    results.append(("Algorithmic Flags", test_algorithmic_flags()))
    results.append(("Recent Scrapes", test_recent_scrape()))
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status} - {test_name}")
    
    print(f"\n  Total: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Scraper fixes are working correctly.")
        return True
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please review the output above.")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

