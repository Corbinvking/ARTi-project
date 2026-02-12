#!/usr/bin/env python3
"""
Diagnostic: Navigate to a real S4A song page and dump the DOM structure.
Captures screenshots at each step + HTML of key elements.
"""
import asyncio
import os
import json
from pathlib import Path
from playwright.async_api import async_playwright

LOGS = Path(__file__).parent / 'logs'
LOGS.mkdir(exist_ok=True)

USER_DATA_DIR = os.getenv(
    'USER_DATA_DIR',
    '/root/arti-marketing-ops/spotify_scraper/data/browser_data'
)

# Test URLs: one with high streams (likely valid), one with low
TEST_URLS = [
    # Shaggy - Boombastic (has different 24h vs 7d, so page probably loads)
    "https://artists.spotify.com/c/artist/4ufyMlueg4tz0JcKNQFHCz/song/708OVhCZdIviGsdRWBHhhE/stats",
    # All-American Rejects (identical 24h/7d, might be broken)
    "https://artists.spotify.com/c/artist/3vAaWhdBR38Q02ohXqaNHT/song/5El8KGV9xfrBctyTZp1n6R/stats",
]


async def main():
    # Clear stale locks
    for name in ['SingletonLock', 'SingletonSocket', 'SingletonCookie']:
        lock = os.path.join(USER_DATA_DIR, name)
        if os.path.exists(lock):
            os.remove(lock)
            print(f"Removed {name}")

    async with async_playwright() as pw:
        ctx = await pw.chromium.launch_persistent_context(
            user_data_dir=USER_DATA_DIR,
            headless=False,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
            ],
            timeout=60000,
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                       '(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            ignore_https_errors=True,
        )

        page = ctx.pages[0] if ctx.pages else await ctx.new_page()

        for i, url in enumerate(TEST_URLS):
            prefix = f"diag_{i}"
            print(f"\n{'='*60}")
            print(f"[{i}] Navigating to: {url}")
            print(f"{'='*60}")

            try:
                await page.goto(url, wait_until='networkidle', timeout=30000)
            except Exception as e:
                print(f"Navigation error: {e}")

            await asyncio.sleep(5)

            # Screenshot
            ss_path = LOGS / f"{prefix}_page.png"
            await page.screenshot(path=str(ss_path), full_page=True)
            print(f"Screenshot: {ss_path}")

            # Current URL
            print(f"Current URL: {page.url}")

            # Check for 404
            try:
                not_found_count = await page.locator('text="We couldn\'t find that page"').count()
                print(f"404 text found: {not_found_count > 0}")
                # Also try partial matching
                body_text = await page.locator('body').text_content()
                if "couldn't find" in (body_text or '').lower():
                    print(">>> PAGE IS 404 <<<")
                    continue
            except Exception as e:
                print(f"404 check error: {e}")

            # Dump all visible tabs/navigation
            tabs = await page.evaluate('''() => {
                const tabs = document.querySelectorAll('[role="tab"], nav a, [class*="tab"], a[href*="/song/"]');
                return Array.from(tabs).map(t => ({
                    tag: t.tagName,
                    text: (t.textContent || '').trim().substring(0, 60),
                    href: t.getAttribute('href') || '',
                    role: t.getAttribute('role') || '',
                    class: (t.className || '').substring(0, 80),
                    testid: t.getAttribute('data-testid') || '',
                    ariaSelected: t.getAttribute('aria-selected') || '',
                }));
            }''')
            print(f"\n--- TABS/NAV ({len(tabs)} found) ---")
            for t in tabs:
                print(f"  {json.dumps(t)}")

            # Dump ALL buttons on the page
            buttons = await page.evaluate('''() => {
                const btns = Array.from(document.querySelectorAll('button, [role="button"]')).filter(b => b.offsetParent !== null);
                return btns.map(b => ({
                    text: (b.textContent || '').trim().substring(0, 60),
                    class: (typeof b.className === 'string' ? b.className : '').substring(0, 80),
                    testid: b.getAttribute('data-testid') || '',
                    ariaHaspopup: b.getAttribute('aria-haspopup') || '',
                    ariaExpanded: b.getAttribute('aria-expanded') || '',
                    encoreId: b.getAttribute('data-encore-id') || '',
                }));
            }''')
            print(f"\n--- BUTTONS ({len(buttons)} found) ---")
            for b in buttons:
                print(f"  {json.dumps(b)}")

            # Look for dropdowns, selects, comboboxes
            dropdowns = await page.evaluate('''() => {
                const els = document.querySelectorAll('select, [role="combobox"], [role="listbox"], [aria-haspopup="listbox"], [aria-haspopup="menu"], [class*="dropdown"], [class*="Dropdown"], [data-encore-id="dropdownTrigger"]');
                return Array.from(els).filter(e => e.offsetParent !== null).map(e => ({
                    tag: e.tagName,
                    text: (e.textContent || '').trim().substring(0, 60),
                    class: (e.className || '').substring(0, 80),
                    role: e.getAttribute('role') || '',
                    testid: e.getAttribute('data-testid') || '',
                }));
            }''')
            print(f"\n--- DROPDOWNS/SELECTS ({len(dropdowns)} found) ---")
            for d in dropdowns:
                print(f"  {json.dumps(d)}")

            # Look for tables
            tables = await page.evaluate('''() => {
                const tbls = document.querySelectorAll('table, [role="table"], [role="grid"]');
                return Array.from(tbls).map(t => ({
                    tag: t.tagName,
                    rows: t.querySelectorAll('tr, [role="row"]').length,
                    class: (t.className || '').substring(0, 80),
                    testid: t.getAttribute('data-testid') || '',
                }));
            }''')
            print(f"\n--- TABLES ({len(tables)} found) ---")
            for t in tables:
                print(f"  {json.dumps(t)}")

            # Look for any time-range related text
            time_text = await page.evaluate('''() => {
                const all = document.body.innerText;
                const matches = [];
                const patterns = ['Last 7 days', 'Last 28 days', 'Last 24 hours', 'Last 12 months', 'Last 365 days', 'All time', '24 hours', '7 days', '28 days', '12 months'];
                for (const p of patterns) {
                    if (all.includes(p)) matches.push(p);
                }
                return matches;
            }''')
            print(f"\n--- TIME-RANGE TEXT ON PAGE ---")
            print(f"  Found: {time_text}")

            # Dump a section of the page HTML around key areas
            main_html = await page.evaluate('''() => {
                const main = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
                return main.innerHTML.substring(0, 5000);
            }''')
            html_path = LOGS / f"{prefix}_main.html"
            html_path.write_text(main_html)
            print(f"\nMain HTML (first 5000 chars) saved to: {html_path}")

            # Try clicking /playlists variant of the URL
            playlists_url = url.replace('/stats', '/playlists')
            print(f"\n--- Trying /playlists URL: {playlists_url} ---")
            try:
                await page.goto(playlists_url, wait_until='networkidle', timeout=30000)
            except Exception as e:
                print(f"Navigation error: {e}")
            await asyncio.sleep(5)

            ss2 = LOGS / f"{prefix}_playlists.png"
            await page.screenshot(path=str(ss2), full_page=True)
            print(f"Screenshot: {ss2}")
            print(f"Current URL: {page.url}")

            # Check 404 on playlists URL too
            try:
                body_text = await page.locator('body').text_content()
                if "couldn't find" in (body_text or '').lower():
                    print(">>> PLAYLISTS URL IS ALSO 404 <<<")
                else:
                    print("Playlists page loaded successfully!")

                    # Dump tabs/buttons on playlists page too
                    tabs2 = await page.evaluate('''() => {
                        const tabs = document.querySelectorAll('[role="tab"], nav a, [class*="tab"]');
                        return Array.from(tabs).map(t => ({
                            text: (t.textContent || '').trim().substring(0, 60),
                            href: t.getAttribute('href') || '',
                            testid: t.getAttribute('data-testid') || '',
                        }));
                    }''')
                    print(f"  Tabs on playlists page: {json.dumps(tabs2)}")

                    buttons2 = await page.evaluate('''() => {
                        const btns = Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent !== null);
                        return btns.map(b => ({
                            text: (b.textContent || '').trim().substring(0, 60),
                            testid: b.getAttribute('data-testid') || '',
                            ariaHaspopup: b.getAttribute('aria-haspopup') || '',
                        }));
                    }''')
                    print(f"  Buttons: {json.dumps(buttons2)}")

                    tables2 = await page.evaluate('''() => {
                        const t = document.querySelectorAll('table, [role="table"], [role="grid"]');
                        return Array.from(t).map(el => ({
                            rows: el.querySelectorAll('tr, [role="row"]').length,
                            testid: el.getAttribute('data-testid') || '',
                        }));
                    }''')
                    print(f"  Tables: {json.dumps(tables2)}")
            except Exception as e:
                print(f"Error checking playlists page: {e}")

        await ctx.close()
        print("\nDone!")


if __name__ == '__main__':
    asyncio.run(main())
