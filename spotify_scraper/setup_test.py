import os
from pathlib import Path
import shutil

def setup_test_environment():
    """
    Set up the test environment by creating necessary directories
    and copying configuration files.
    """
    # Define test directories
    test_dirs = [
        'data/test/browser_data',
        'data/test/downloads',
        'data/test/artifacts'
    ]
    
    # Create test directories
    for dir_path in test_dirs:
        Path(dir_path).mkdir(parents=True, exist_ok=True)
        print(f"Created directory: {dir_path}")
    
    # Create .env file if it doesn't exist
    env_example = """# Spotify for Artists Test Credentials
SPOTIFY_EMAIL=your_email@example.com
SPOTIFY_PASSWORD=your_password
TEST_SONG_URL=https://artists.spotify.com/c/artist/your_song_id

# Test Configuration
HEADLESS=false
DEBUG=true

# Test Data Directories
USER_DATA_DIR=./data/test/browser_data
DOWNLOAD_DIR=./data/test/downloads
ARTIFACTS_DIR=./data/test/artifacts"""
    
    env_path = Path('.env')
    if not env_path.exists():
        env_path.write_text(env_example)
        print("\nCreated .env file. Please edit it with your credentials.")
    else:
        print("\n.env file already exists.")
    
    print("\nTest environment setup complete!")
    print("\nNext steps:")
    print("1. Edit .env file with your Spotify for Artists credentials")
    print("2. Install dependencies: pip install -r requirements.txt")
    print("3. Install Playwright browsers: playwright install")
    print("4. Run test: python tests/test_scraper.py")

if __name__ == "__main__":
    setup_test_environment()

