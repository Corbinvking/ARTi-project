#!/usr/bin/env python3
"""
Spotify Session Keepalive
Keeps the Spotify for Artists session alive by periodically browsing S4A pages.
Run via cron every 3 hours to prevent session expiry.

Usage:
  python3 session_keepalive.py           # Check and refresh session
  python3 session_keepalive.py --check   # Only check, don't browse
"""

import asyncio
import os
import sys
import logging
from datetime import datetime, timezone
from pathlib import Path

# Setup logging
LOG_DIR = Path(__file__).parent / 'logs'
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOG_DIR / 'keepalive.log'),
    ]
)
logger = logging.getLogger('keepalive')

# Configuration
SCRAPER_DIR = Path(__file__).parent
LOCK_FILE = SCRAPER_DIR / 'scraper.lock'
SESSION_FLAG = LOG_DIR / 'session_expired.flag'
USER_DATA_DIR = os.getenv(
    'USER_DATA_DIR',
    '/root/arti-marketing-ops/spotify_scraper/data/browser_data'
)

# Same stealth args as production scraper (MUST match for session compatibility)
STEALTH_ARGS = [
    '--disable-blink-features=AutomationControlled',
    '--disable-infobars',
    '--disable-automation',
    '--disable-browser-side-navigation',
    '--disable-web-security',
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-breakpad',
    '--disable-component-extensions-with-background-pages',
    '--disable-features=TranslateUI',
    '--disable-ipc-flooding-protection',
    '--disable-renderer-backgrounding',
    '--force-color-profile=srgb',
    '--metrics-recording-only',
    '--no-first-run',
    '--password-store=basic',
    '--use-mock-keychain',
    '--disable-hang-monitor',
    '--single-process',
    '--disable-features=site-per-process',
    '--excludeSwitches=enable-automation',
    '--useAutomationExtension=false',
]

# Same stealth JS as production scraper
STEALTH_JS = """
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
    if (window.chrome) {
        window.chrome.runtime = {
            connect: () => {},
            sendMessage: () => {},
            onMessage: { addListener: () => {} }
        };
    }
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
    );
    Object.defineProperty(navigator, 'plugins', {
        get: () => [
            { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer' },
            { name: 'Chrome PDF Plugin', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
            { name: 'Native Client', filename: 'internal-nacl-plugin' }
        ]
    });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
"""


def is_scraper_running():
    """Check if the main scraper is currently running (via lock file)."""
    if not LOCK_FILE.exists():
        return False
    try:
        pid = int(LOCK_FILE.read_text().strip())
        # Check if PID is still alive
        os.kill(pid, 0)
        return True
    except (ValueError, ProcessLookupError, PermissionError):
        return False


def clear_browser_locks():
    """Remove stale Chromium singleton lock files."""
    for name in ['SingletonLock', 'SingletonSocket', 'SingletonCookie']:
        lock_path = os.path.join(USER_DATA_DIR, name)
        try:
            if os.path.exists(lock_path):
                os.remove(lock_path)
                logger.info(f"Removed stale lock: {name}")
        except Exception as e:
            logger.warning(f"Could not remove {name}: {e}")


def mark_session_expired():
    """Create a flag file indicating the session has expired."""
    SESSION_FLAG.write_text(datetime.now(timezone.utc).isoformat())
    logger.error("Session expired flag written to: %s", SESSION_FLAG)


def clear_session_flag():
    """Remove the session expired flag (session is valid)."""
    if SESSION_FLAG.exists():
        SESSION_FLAG.unlink()
        logger.info("Cleared session_expired.flag (session is valid)")


async def keepalive(check_only=False):
    """Main keepalive logic: open browser, check session, browse pages."""
    from playwright.async_api import async_playwright

    logger.info("=" * 50)
    logger.info("SESSION KEEPALIVE - %s", datetime.now(timezone.utc).isoformat())
    logger.info("=" * 50)

    # Skip if scraper is actively running
    if is_scraper_running():
        logger.info("Scraper is currently running -- skipping keepalive")
        return True

    # Prepare browser data dir
    os.makedirs(USER_DATA_DIR, exist_ok=True)
    clear_browser_locks()

    # Determine headless mode
    display = os.getenv('DISPLAY')
    default_headless = 'true' if not display else 'false'
    headless = os.getenv('HEADLESS', default_headless).lower() == 'true'
    logger.info("DISPLAY=%s, headless=%s, user_data_dir=%s", display, headless, USER_DATA_DIR)

    playwright = None
    context = None
    try:
        playwright = await async_playwright().start()

        context = await playwright.chromium.launch_persistent_context(
            user_data_dir=USER_DATA_DIR,
            headless=headless,
            args=STEALTH_ARGS,
            timeout=60000,
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                       '(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            ignore_https_errors=True,
        )

        # Apply stealth scripts
        page = context.pages[0] if context.pages else await context.new_page()
        try:
            await page.add_init_script(STEALTH_JS)
        except Exception:
            pass

        # --- Step 1: Check session ---
        logger.info("Navigating to artists.spotify.com ...")
        await page.goto('https://artists.spotify.com', timeout=30000, wait_until='domcontentloaded')
        await asyncio.sleep(5)

        current_url = page.url
        logger.info("Current URL: %s", current_url)

        # Check if redirected to login
        if 'accounts.spotify.com' in current_url or 'login' in current_url.lower():
            logger.error("SESSION EXPIRED -- redirected to login page")
            mark_session_expired()
            return False

        # Check for dashboard patterns on initial page
        dashboard_patterns = [
            'artists.spotify.com/c/',
            'artists.spotify.com/home',
            'artists.spotify.com/roster',
            'artists.spotify.com/team',
            'artists.spotify.com/profile',
        ]
        initial_ok = any(p in current_url for p in dashboard_patterns)

        if not initial_ok:
            # Check for login button on landing page
            try:
                login_btn = page.locator('button:has-text("Log in"), a:has-text("Log in")')
                if await login_btn.count() > 0 and await login_btn.first.is_visible():
                    logger.error("SESSION EXPIRED -- login button visible on landing page")
                    mark_session_expired()
                    return False
            except Exception:
                pass

            if 'artists.spotify.com' not in current_url:
                logger.error("SESSION EXPIRED -- unknown redirect: %s", current_url)
                mark_session_expired()
                return False

        # IMPORTANT: Verify the session is truly valid by hitting an authenticated route
        # The /home page can load from cache even with an expired session
        logger.info("Verifying session with authenticated route (/c/roster) ...")
        try:
            await page.goto('https://artists.spotify.com/c/roster', timeout=20000, wait_until='domcontentloaded')
            await asyncio.sleep(3)
            verify_url = page.url
            logger.info("Verification URL: %s", verify_url)
            if 'accounts.spotify.com' in verify_url or 'login' in verify_url.lower():
                logger.error("SESSION EXPIRED -- redirected to login on verification")
                mark_session_expired()
                return False
        except Exception as e:
            logger.warning("Verification navigation error: %s", e)
            # Don't mark expired on timeout, may just be slow
            pass

        logger.info("Session is VALID (verified)")
        clear_session_flag()

        if check_only:
            logger.info("Check-only mode -- done")
            return True

        # --- Step 2: Browse pages to refresh session cookies ---
        logger.info("Refreshing session by browsing S4A pages ...")

        pages_to_visit = [
            'https://artists.spotify.com/c/roster',
            'https://artists.spotify.com/home',
        ]

        for url in pages_to_visit:
            try:
                logger.info("  Visiting: %s", url)
                await page.goto(url, timeout=20000, wait_until='domcontentloaded')
                await asyncio.sleep(3)

                # Verify we didn't get kicked to login
                if 'accounts.spotify.com' in page.url or 'login' in page.url.lower():
                    logger.error("SESSION EXPIRED mid-browse -- redirected to login from %s", url)
                    mark_session_expired()
                    return False

                logger.info("    OK - on %s", page.url)
            except Exception as e:
                logger.warning("  Error visiting %s: %s", url, e)

        # Scroll around to simulate real activity
        try:
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight / 2)")
            await asyncio.sleep(1)
            await page.evaluate("window.scrollTo(0, 0)")
            await asyncio.sleep(1)
        except Exception:
            pass

        logger.info("Session refreshed successfully")
        return True

    except Exception as e:
        logger.error("Keepalive error: %s", e)
        import traceback
        traceback.print_exc()
        return False

    finally:
        # Clean shutdown
        try:
            if context:
                await context.close()
        except Exception:
            pass
        try:
            if playwright:
                await playwright.stop()
        except Exception:
            pass

        logger.info("Keepalive complete")
        logger.info("")


def main():
    check_only = '--check' in sys.argv
    result = asyncio.run(keepalive(check_only=check_only))
    sys.exit(0 if result else 1)


if __name__ == '__main__':
    main()
