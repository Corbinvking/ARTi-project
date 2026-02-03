import asyncio
from playwright.async_api import async_playwright
import os

async def capture():
    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            './data/browser_data', 
            headless=os.environ.get('DISPLAY') is None
        )
        page = browser.pages[0] if browser.pages else await browser.new_page()
        
        url = 'https://artists.spotify.com/c/artist/6HWv9QK0gDs0yaNcGWHffV/song/1wFBrmz6TXZiP2TOO8wMcC/playlists'
        print(f'Navigating to: {url}')
        await page.goto(url, wait_until='networkidle', timeout=30000)
        await asyncio.sleep(5)
        
        await page.screenshot(path='./logs/debug_song_page.png', full_page=True)
        print('Screenshot saved to ./logs/debug_song_page.png')
        print(f'Current URL: {page.url}')
        print(f'Title: {await page.title()}')
        
        # Check for errors
        print('')
        print('Checking page content:')
        body_text = await page.locator('body').text_content()
        if 'error' in body_text.lower():
            print('  Found: error text on page')
        if 'not part' in body_text.lower():
            print('  Found: not part of catalog')
        
        # Check specific selectors
        print('')
        print('Checking selectors:')
        
        # Tables
        tables = await page.locator('table').count()
        print(f'  table: {tables}')
        
        # Role table
        role_tables = await page.locator('[role="table"]').count()
        print(f'  [role=table]: {role_tables}')
        
        # Table rows
        rows = await page.locator('tbody tr').count()
        print(f'  tbody tr: {rows}')
        
        # Time buttons
        for text in ['Last 28 days', 'Last 7 days', '28 days', '7 days', 'Last']:
            selector = f'button:has-text("{text}")'
            count = await page.locator(selector).count()
            if count > 0:
                print(f'  button:{text}: {count} found')
        
        # Tabs
        tabs = await page.locator('[role="tab"]').count()
        print(f'  [role=tab]: {tabs}')
        
        # Headers
        h1_text = await page.locator('h1').first.text_content() if await page.locator('h1').count() > 0 else 'none'
        print(f'  h1: {h1_text[:50] if h1_text else "empty"}')
        
        h2s = await page.locator('h2').count()
        print(f'  h2: {h2s}')
        
        h3s = await page.locator('h3').count()
        print(f'  h3: {h3s}')
        
        # All buttons
        all_buttons = await page.locator('button').all_text_contents()
        print(f'  All buttons: {all_buttons[:10]}')
        
        # Save HTML
        html = await page.content()
        with open('./logs/debug_song_page.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print('')
        print('HTML saved to ./logs/debug_song_page.html')
        
        await browser.close()

if __name__ == '__main__':
    asyncio.run(capture())
