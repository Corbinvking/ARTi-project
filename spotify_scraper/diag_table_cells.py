#!/usr/bin/env python3
"""Diagnostic: dump the exact cell structure of sort-table rows on the playlists page."""
import asyncio, os, json
from playwright.async_api import async_playwright

USER_DATA_DIR = '/root/arti-marketing-ops/spotify_scraper/data/browser_data'
TEST_URL = "https://artists.spotify.com/c/artist/4ufyMlueg4tz0JcKNQFHCz/song/708OVhCZdIviGsdRWBHhhE/playlists"

async def main():
    for name in ['SingletonLock', 'SingletonSocket', 'SingletonCookie']:
        try: os.remove(os.path.join(USER_DATA_DIR, name))
        except: pass

    async with async_playwright() as pw:
        ctx = await pw.chromium.launch_persistent_context(
            user_data_dir=USER_DATA_DIR, headless=False,
            args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
                  '--disable-blink-features=AutomationControlled'],
            timeout=60000, viewport={'width': 1920, 'height': 1080},
            ignore_https_errors=True,
        )
        page = ctx.pages[0] if ctx.pages else await ctx.new_page()
        
        await page.goto(TEST_URL, wait_until='networkidle', timeout=30000)
        await asyncio.sleep(5)
        
        print("=== CELL STRUCTURE OF FIRST 3 SORT-TABLE BODY ROWS ===")
        result = await page.evaluate('''() => {
            const rows = document.querySelectorAll('[data-testid="sort-table-body-row"]');
            const output = [];
            for (let r = 0; r < Math.min(rows.length, 3); r++) {
                const row = rows[r];
                // Get direct children
                const children = Array.from(row.children);
                const rowData = {
                    rowIndex: r,
                    childCount: children.length,
                    children: children.map((child, i) => ({
                        index: i,
                        tag: child.tagName,
                        text: (child.textContent || '').trim().substring(0, 60),
                        childrenCount: child.children.length,
                        role: child.getAttribute('role') || '',
                        class: (typeof child.className === 'string' ? child.className : '').substring(0, 60),
                    }))
                };
                // Also try td specifically
                const tds = row.querySelectorAll('td');
                rowData.tdCount = tds.length;
                rowData.tds = Array.from(tds).map((td, i) => ({
                    index: i,
                    text: (td.textContent || '').trim().substring(0, 60),
                }));
                output.push(rowData);
            }
            return output;
        }''')
        
        for row in result:
            print(f"\n--- Row {row['rowIndex']} ({row['childCount']} children, {row['tdCount']} tds) ---")
            print("  Children:")
            for c in row['children']:
                print(f"    [{c['index']}] <{c['tag']}> text='{c['text']}' children={c['childrenCount']}")
            print("  TDs:")
            for td in row['tds']:
                print(f"    [{td['index']}] text='{td['text']}'")

        await ctx.close()

asyncio.run(main())
