#!/bin/bash

echo "Setting up Spotify for Artists Scraper test environment..."

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
playwright install

# Set up test environment
python setup_test.py

echo
echo "Setup complete! Please edit the .env file with your credentials."
echo
read -p "Press Enter to run the test..."

# Run the test
python tests/test_scraper.py
read -p "Press Enter to exit..."

