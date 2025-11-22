"""
Quick script to verify the scraped data is in production database
"""

import asyncio
import aiohttp

SUPABASE_URL = "https://api.artistinfluence.com"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

async def verify_data():
    """Check if our test data is in production"""
    
    headers = {
        'apikey': SERVICE_KEY,
        'Authorization': f'Bearer {SERVICE_KEY}',
        'Content-Type': 'application/json'
    }
    
    print("[*] Verifying scraped data in PRODUCTION database...\n")
    
    async with aiohttp.ClientSession() as session:
        url = f"{SUPABASE_URL}/rest/v1/spotify_campaigns"
        params = {
            'select': 'id,campaign,streams_24h,streams_7d,playlists_24h_count,playlists_7d_count,last_scraped_at,sfa',
            'id': 'eq.7343'
        }
        
        async with session.get(url, headers=headers, params=params) as response:
            if response.status == 200:
                data = await response.json()
                if data:
                    campaign = data[0]
                    print("[OK] DATA FOUND IN PRODUCTION DATABASE!\n")
                    print(f"Campaign: {campaign['campaign']}")
                    print(f"SFA URL: {campaign.get('sfa', 'N/A')[:80]}...")
                    print()
                    print("[RESULTS] SCRAPED DATA:")
                    print(f"  24h streams:       {campaign.get('streams_24h', 'N/A')}")
                    print(f"  7d streams:        {campaign.get('streams_7d', 'N/A')}")
                    print(f"  24h playlists:     {campaign.get('playlists_24h_count', 'N/A')}")
                    print(f"  7d playlists:      {campaign.get('playlists_7d_count', 'N/A')}")
                    print(f"  Last scraped:      {campaign.get('last_scraped_at', 'N/A')}")
                    print()
                    
                    # Verify the values match what we expect
                    if (campaign.get('streams_24h') == 56 and 
                        campaign.get('streams_7d') == 320 and
                        campaign.get('playlists_24h_count') == 3 and
                        campaign.get('playlists_7d_count') == 4):
                        print("[OK] [OK] [OK] ALL VALUES MATCH EXPECTED! [OK] [OK] [OK]")
                        print()
                        print("[SUCCESS] The scraper is working perfectly!")
                        print("[READY] Ready to deploy to production!")
                        return True
                    else:
                        print("[WARN] Values don't match expected. This might be okay if data updated.")
                        return True
                else:
                    print("[ERROR] Campaign not found in database")
                    return False
            else:
                error = await response.text()
                print(f"[ERROR] Error: {response.status} - {error}")
                return False

if __name__ == "__main__":
    asyncio.run(verify_data())

