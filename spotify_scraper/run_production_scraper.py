#!/usr/bin/env python3
"""
Production Spotify for Artists Scraper
Connects to production database, scrapes all active campaigns with SFA links,
and updates stream data. Designed to run headless on a cron job.
"""

import asyncio
import os
import sys
import json
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from explicit path
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

# Add the runner module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'runner'))

from app.scraper import SpotifyArtistsScraper

# Setup logging
log_dir = os.path.join(os.path.dirname(__file__), 'logs')
os.makedirs(log_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(log_dir, f'production_scraper_{datetime.now().strftime("%Y%m%d")}.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Supabase configuration
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://api.artistinfluence.com')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

# Spotify credentials
SPOTIFY_EMAIL = os.getenv('SPOTIFY_EMAIL', 'tribe@artistinfluence.com')
SPOTIFY_PASSWORD = os.getenv('SPOTIFY_PASSWORD', 'UE_n7C*8wgxe9!P4abtK')


class ProductionScraper:
    """Manages production scraping workflow"""
    
    def __init__(self):
        self.supabase_url = SUPABASE_URL
        self.supabase_key = SUPABASE_SERVICE_ROLE_KEY
        
        if not self.supabase_key:
            raise ValueError("SUPABASE_SERVICE_ROLE_KEY environment variable is required")
    
    async def get_active_campaigns_with_sfa(self) -> List[Dict[str, Any]]:
        """Query database for active campaigns with SFA links"""
        import aiohttp
        
        logger.info("Fetching active campaigns with SFA links from database...")
        
        headers = {
            'apikey': self.supabase_key,
            'Authorization': f'Bearer {self.supabase_key}',
            'Content-Type': 'application/json'
        }
        
        # Query spotify_campaigns table for campaigns with valid sfa URLs
        # Filter for only valid Spotify for Artists URLs
        params = {
            'select': 'id,campaign,sfa,track_name,artist_name,client_id,vendor_id',
            'sfa': 'like.https://artists.spotify.com%',  # Only valid SFA URLs
            'order': 'id.desc'
        }
        
        async with aiohttp.ClientSession() as session:
            url = f"{self.supabase_url}/rest/v1/spotify_campaigns"
            
            async with session.get(url, headers=headers, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Failed to fetch campaigns: {response.status} - {error_text}")
                    return []
                
                campaigns = await response.json()
                logger.info(f"Found {len(campaigns)} active campaigns with SFA links")
                return campaigns
    
    async def scrape_campaign(self, scraper: SpotifyArtistsScraper, campaign: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Scrape a single campaign's data"""
        campaign_id = campaign['id']
        sfa_url = campaign['sfa']
        campaign_name = campaign.get('campaign', 'Unknown')
        track_name = campaign.get('track_name', 'Unknown')
        
        # Validate URL format
        if not sfa_url or not sfa_url.startswith('https://artists.spotify.com/'):
            logger.warning(f"  ✗ Skipping campaign {campaign_id}: Invalid SFA URL: {sfa_url}")
            return None
        
        logger.info(f"Scraping campaign {campaign_id}: {track_name} ({campaign_name})")
        logger.info(f"  URL: {sfa_url}")
        
        try:
            # Scrape the data (24hour + 7day by default)
            data = await scraper.scrape_song_data(sfa_url, time_ranges=['24hour', '7day'])
            
            if not data:
                logger.warning(f"  No data returned for campaign {campaign_id}")
                return None
            
            logger.info(f"  ✓ Successfully scraped campaign {campaign_id}")
            
            # Log summary
            for time_range in ['24hour', '7day']:
                if time_range in data.get('time_ranges', {}):
                    stats = data['time_ranges'][time_range].get('stats', {})
                    playlists = stats.get('playlists', [])
                    total_streams = sum(int(p.get('streams', 0)) for p in playlists)
                    logger.info(f"    {time_range}: {len(playlists)} playlists, {total_streams} total streams")
            
            return data
            
        except Exception as e:
            logger.error(f"  ✗ Failed to scrape campaign {campaign_id}: {e}", exc_info=True)
            return None
    
    async def update_campaign_data(self, campaign_id: int, scraped_data: Dict[str, Any]) -> bool:
        """Update database with scraped data"""
        import aiohttp
        
        logger.info(f"Updating database for campaign {campaign_id}...")
        
        try:
            headers = {
                'apikey': self.supabase_key,
                'Authorization': f'Bearer {self.supabase_key}',
                'Content-Type': 'application/json'
            }
            
            # Extract 24h and 7d playlist data
            time_ranges_data = scraped_data.get('time_ranges', {})
            
            # Calculate totals for each time range
            updates = {
                'last_scraped_at': datetime.now(timezone.utc).isoformat(),
                'scrape_data': json.dumps(scraped_data)  # Store full JSON for reference
            }
            
            # Add 24h stats if available
            if '24hour' in time_ranges_data:
                stats_24h = time_ranges_data['24hour'].get('stats', {})
                playlists_24h = stats_24h.get('playlists', [])
                total_streams_24h = sum(int(p.get('streams', 0)) for p in playlists_24h)
                
                updates['streams_24h'] = total_streams_24h
                updates['playlists_24h_count'] = len(playlists_24h)
            
            # Add 7d stats if available
            if '7day' in time_ranges_data:
                stats_7d = time_ranges_data['7day'].get('stats', {})
                playlists_7d = stats_7d.get('playlists', [])
                total_streams_7d = sum(int(p.get('streams', 0)) for p in playlists_7d)
                
                updates['streams_7d'] = total_streams_7d
                updates['playlists_7d_count'] = len(playlists_7d)
            
            # Update spotify_campaigns table
            async with aiohttp.ClientSession() as session:
                url = f"{self.supabase_url}/rest/v1/spotify_campaigns"
                params = {'id': f'eq.{campaign_id}'}
                
                async with session.patch(url, headers=headers, params=params, json=updates) as response:
                    if response.status not in [200, 204]:
                        error_text = await response.text()
                        logger.error(f"  Failed to update campaign {campaign_id}: {response.status} - {error_text}")
                        return False
            
            logger.info(f"  ✓ Database updated for campaign {campaign_id}")
            return True
            
        except Exception as e:
            logger.error(f"  ✗ Failed to update database for campaign {campaign_id}: {e}", exc_info=True)
            return False
    
    async def run(self):
        """Main production scraper workflow"""
        logger.info("=" * 80)
        logger.info("PRODUCTION SPOTIFY FOR ARTISTS SCRAPER")
        logger.info(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("=" * 80)
        
        # Get campaigns to scrape
        campaigns = await self.get_active_campaigns_with_sfa()
        
        if not campaigns:
            logger.warning("No campaigns found to scrape. Exiting.")
            return
        
        logger.info(f"Processing {len(campaigns)} campaigns...")
        
        # Initialize scraper (headless mode controlled by env var)
        headless_mode = os.getenv('HEADLESS', 'false').lower() == 'true'
        logger.info(f"Running in {'HEADLESS' if headless_mode else 'GUI'} mode")
        
        async with SpotifyArtistsScraper(headless=headless_mode) as scraper:
            # Verify login first
            logger.info("Verifying Spotify for Artists login...")
            
            if not await scraper.verify_login():
                logger.warning("Not logged in. Attempting automatic login...")
                
                if await scraper.auto_login(SPOTIFY_EMAIL, SPOTIFY_PASSWORD):
                    logger.info("✓ Auto-login successful!")
                else:
                    logger.error("✗ Auto-login failed! Cannot proceed.")
                    logger.error("Please run manual login setup: python setup_manual_login.py")
                    return
            
            logger.info("✓ Login verified!")
            
            # Track results
            successful = 0
            failed = 0
            skipped = 0
            
            # Process each campaign
            for i, campaign in enumerate(campaigns, 1):
                campaign_id = campaign['id']
                
                logger.info(f"\n[{i}/{len(campaigns)}] Processing campaign {campaign_id}...")
                
                # Scrape the campaign
                scraped_data = await self.scrape_campaign(scraper, campaign)
                
                if not scraped_data:
                    failed += 1
                    continue
                
                # Update the database
                if await self.update_campaign_data(campaign_id, scraped_data):
                    successful += 1
                else:
                    failed += 1
                
                # Small delay between campaigns to avoid rate limiting
                await asyncio.sleep(2)
        
        # Summary
        logger.info("=" * 80)
        logger.info("SCRAPING COMPLETE")
        logger.info(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(f"Results:")
        logger.info(f"  ✓ Successful: {successful}")
        logger.info(f"  ✗ Failed: {failed}")
        logger.info(f"  - Skipped: {skipped}")
        logger.info(f"  Total: {len(campaigns)}")
        logger.info("=" * 80)


async def main():
    """Entry point"""
    try:
        scraper = ProductionScraper()
        await scraper.run()
    except KeyboardInterrupt:
        logger.info("\nScraper interrupted by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    asyncio.run(main())

