#!/usr/bin/env python3
"""Test region scraping on a single campaign."""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from run_production_scraper import (
    scrape_campaign, sync_campaign_regions,
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
)

SESSION_DIR = os.getenv('USER_DATA_DIR', '/root/arti-marketing-ops/spotify_scraper/data/browser_data')
from runner.app.pages.spotify_artists import SpotifyArtistsPage
from playwright.async_api import async_playwright
import requests

async def main():
    headers = {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json'
    }

    url = f"{SUPABASE_URL}/rest/v1/spotify_campaigns"
    params = {
        'select': 'id,campaign,sfa',
        'sfa': 'like.*artists.spotify.com*',
        'limit': '1',
        'order': 'id.asc'
    }
    resp = requests.get(url, headers=headers, params=params)
    print(f"API response status: {resp.status_code}")
    campaigns = resp.json()
    if not isinstance(campaigns, list) or not campaigns:
        print(f"Unexpected response: {campaigns}")
        return

    campaign = campaigns[0]
    print(f"Testing campaign: {campaign['id']} - {campaign.get('campaign', 'unknown')}")
    print(f"  SFA: {campaign['sfa']}")

    async with async_playwright() as p:
        context = await p.chromium.launch_persistent_context(
            SESSION_DIR,
            headless=False,
            args=[
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
            ],
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        )

        page = context.pages[0] if context.pages else await context.new_page()
        spotify_page = SpotifyArtistsPage(page)

        result = await scrape_campaign(page, spotify_page, campaign)

        if result:
            scrape_data = result.get('scrape_data', {})
            regions = scrape_data.get('regions', [])
            print(f"\nRegion data: {len(regions)} countries")
            for r in regions[:10]:
                print(f"  #{r.get('rank', '?')}: {r.get('country', '?')} - {r.get('streams', 0):,} streams")

            await sync_campaign_regions(campaign['id'], scrape_data)
            print("\nDone! Region data synced to database.")
        else:
            print("Scrape returned no data")

        await context.close()

if __name__ == '__main__':
    asyncio.run(main())
