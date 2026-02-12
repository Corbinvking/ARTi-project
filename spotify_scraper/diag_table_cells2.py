#!/usr/bin/env python3
"""Diagnostic: dump cell structure for the small song (campaign 10180)."""
import asyncio, os, json
from playwright.async_api import async_playwright

USER_DATA_DIR = '/root/arti-marketing-ops/spotify_scraper/data/browser_data'
# Campaign 10180: 5X, Krasia, Denver UK - Energy
TEST_URL = "https://artists.spotify.com/c/artist/6HWv9QK0gDs0yaNcGWHffV/song/1wFBrmz6TXZiP2TOO8wMcC/playlists"

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
        
        # Dump ALL rows matching sort-table-body-row
        result = await page.evaluate('''() => {
            const rows = document.querySelectorAll('[data-testid="sort-table-body-row"]');
            const output = [];
            for (let r = 0; r < rows.length; r++) {
                const row = rows[r];
                const tds = row.querySelectorAll('td');
                output.push({
                    rowIndex: r,
                    tdCount: tds.length,
                    tds: Array.from(tds).map((td, i) => ({
                        index: i,
                        text: (td.textContent || '').trim().substring(0, 80),
                    })),
                    // Also check parent table's testid
                    tableTestid: row.closest('table')?.getAttribute('data-testid') || row.closest('[data-testid]')?.getAttribute('data-testid') || 'none',
                });
            }
            return output;
        }''')
        
        print(f"=== SORT-TABLE ROWS FOR SMALL SONG ({len(result)} rows) ===")
        for row in result:
            print(f"\nRow {row['rowIndex']} ({row['tdCount']} tds, table={row['tableTestid']}):")
            for td in row['tds']:
                print(f"  [{td['index']}] '{td['text']}'")
        
        # Also check if there are multiple tables
        tables = await page.evaluate('''() => {
            const t = document.querySelectorAll('[data-testid="sort-table"]');
            return Array.from(t).map((el, i) => ({
                index: i,
                rows: el.querySelectorAll('[data-testid="sort-table-body-row"]').length,
                headerText: (el.querySelector('[data-testid="sort-table-head-row"]')?.textContent || '').trim().substring(0, 80),
            }));
        }''')
        print(f"\n=== SORT-TABLES ON PAGE ({len(tables)}) ===")
        for t in tables:
            print(f"  Table {t['index']}: {t['rows']} rows, header='{t['headerText']}'")

        await ctx.close()

asyncio.run(main())
