#!/usr/bin/env python3
"""Test auto-login functionality directly"""
import asyncio
import os
from dotenv import load_dotenv
from runner.app.scraper import SpotifyArtistsScraper

load_dotenv()

async def test_login():
    print("="*70)
    print("TESTING AUTO-LOGIN")
    print("="*70)
    print("\nThis will:")
    print("1. Force a fresh login (ignore cached session)")
    print("2. Show you the browser automating the login process")
    print("3. Verify the login worked\n")
    
    async with SpotifyArtistsScraper(headless=False) as scraper:
        email = os.getenv('SPOTIFY_EMAIL', 'tribe@artistinfluence.com')
        password = os.getenv('SPOTIFY_PASSWORD', 'UE_n7C*8wgxe9!P4abtK')
        
        print(f"Email: {email}")
        print(f"Password: {'*' * len(password)}\n")
        
        # Force auto-login
        print("Starting auto-login...\n")
        success = await scraper.auto_login(email, password)
        
        if success:
            print("\n" + "="*70)
            print("SUCCESS! Auto-login worked!")
            print("="*70)
            print("\nThe browser is now logged in to Spotify for Artists.")
            print("This session will be saved for future runs.")
            print("\nBrowser will stay open for 10 seconds...")
            await asyncio.sleep(10)
        else:
            print("\n" + "="*70)
            print("FAILED! Auto-login did not work")
            print("="*70)
            print("\nCheck the browser window to see what happened.")
            print("Browser will stay open for 30 seconds for inspection...")
            await asyncio.sleep(30)

if __name__ == "__main__":
    asyncio.run(test_login())

