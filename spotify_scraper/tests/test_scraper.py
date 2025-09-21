import os
import pytest
import asyncio
from dotenv import load_dotenv
from pathlib import Path
from runner.app.scraper import SpotifyArtistsScraper

# Load environment variables
load_dotenv()

@pytest.mark.asyncio
async def test_session_valid():
    """Test that we have a valid persistent session"""
    async with SpotifyArtistsScraper() as scraper:
        assert await scraper.verify_login(), "No valid login session found"

@pytest.mark.asyncio
async def test_song_data_scraping():
    """Test that we can scrape song data"""
    test_song_url = os.getenv('TEST_SONG_URL')
    assert test_song_url is not None, "TEST_SONG_URL environment variable is required"
    
    async with SpotifyArtistsScraper() as scraper:
        try:
            # Scrape song data for all time ranges
            data = await scraper.scrape_song_data(test_song_url)
            
            # Verify we got data
            assert data is not None, "No data returned"
            assert 'url' in data, "Missing song URL"
            assert 'time_ranges' in data, "Missing time ranges data"
            
            # Check each time range
            for time_range, range_data in data['time_ranges'].items():
                assert 'stats' in range_data, f"Missing stats for {time_range}"
                assert 'insights' in range_data, f"Missing insights for {time_range}"
                
                # Verify stats
                stats = range_data['stats']
                assert 'title' in stats, "Missing song title"
                assert 'streams' in stats, "Missing stream count"
                assert 'listeners' in stats, "Missing listener count"
                
                # Verify insights
                insights = range_data['insights']
                assert 'stream_sources' in insights, "Missing stream sources"
                assert 'geographical_data' in insights, "Missing geographical data"
                
            print(f"Successfully scraped data for song: {data['time_ranges']['all']['stats']['title']}")
                
        except Exception as e:
            pytest.fail(f"Test failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_song_data_scraping())