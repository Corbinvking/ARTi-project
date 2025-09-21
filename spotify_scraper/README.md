# Spotify for Artists Scraper

An AI-powered Playwright-based scraper for Spotify for Artists that intelligently navigates the interface, analyzes performance data, and provides insights.

## Features

- AI-powered navigation and data analysis
- Intelligent timeframe suggestions based on release date
- Anomaly detection in stream and playlist performance
- Automated playlist performance analysis
- Smart page state analysis and action suggestions
- Persistent browser sessions
- CSV exports with validation
- Comprehensive debug artifacts (screenshots, HTML, traces)
- Advanced page object model

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
playwright install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. Create data directories:
```bash
mkdir -p data/{browser_data,downloads,artifacts}
```

## Usage

### One-time Login

```python
from runner.app.scraper import SpotifyArtistsScraper
import asyncio

async def login():
    async with SpotifyArtistsScraper() as scraper:
        await scraper.login('your_email@example.com', 'your_password')

asyncio.run(login())
```

### Scrape Song Data

```python
async def scrape_song():
    song_url = "https://artists.spotify.com/c/artist/..."
    async with SpotifyArtistsScraper() as scraper:
        data = await scraper.scrape_song_data(song_url)
        print(data)

asyncio.run(scrape_song())
```

## Data Structure

The scraper returns comprehensive song data including:

```json
{
    "url": "song_url",
    "all_time_streams": "128,372",
    "release_date": "Aug 27, 2025",
    "time_range": "28 days",
    "playlists": {
        "total_playlists": "2,505",
        "playlists": [
            {
                "name": "Radio",
                "made_by": "Spotify",
                "streams": "25,614",
                "date_added": "-"
            },
            // ... more playlists
        ]
    },
    "scraped_at": "2025-09-15T12:00:00Z"
}
```

## Debug Artifacts

The scraper automatically saves debugging artifacts:

- `screenshots/`: Page screenshots on error
- `html/`: Page HTML content
- `traces/`: Playwright traces for debugging
- `data/`: Raw scraped data

## Development

The scraper uses a Page Object Model pattern:

- `pages/spotify_artists.py`: Page interactions
- `scraper.py`: Main scraper logic
- `config.py`: Configuration handling

## Error Handling

The scraper includes robust error handling:

1. Automatic artifact collection on failure
2. Detailed error messages
3. Session persistence
4. Network retry logic

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

MIT
