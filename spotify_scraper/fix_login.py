#!/usr/bin/env python3
"""Script to re-enable automated login in production scraper"""
from pathlib import Path

path = Path('/root/arti-marketing-ops/spotify_scraper/run_production_scraper.py')
text = path.read_text()

old_block = '''        if not already_logged_in:
            # SESSION-ONLY MODE: Do not attempt automated login
            # Automated login triggers bot detection every time
            logger.error("="*60)
            logger.error("❌ NO VALID SESSION FOUND")
            logger.error("="*60)
            logger.error("Automated login is DISABLED because it triggers bot detection.")
            logger.error("Please log in manually via VNC and run the scraper again:")
            logger.error("  1. Connect to VNC: artistinfluence:99")
            logger.error("  2. Run: cd /root/arti-marketing-ops/spotify_scraper && python3 manual_login_prod.py")
            logger.error("  3. Complete the login manually (including CAPTCHA if needed)")
            logger.error("  4. Run the scraper again")
            logger.error("="*60)
            return 0, len(campaigns)  # All campaigns in batch failed
        
        logger.info("✓ Valid session found - proceeding with scraping")
        logger.info("  (Automated re-login is disabled to avoid bot detection)")'''

new_block = '''        if not already_logged_in:
            # Attempt automated login
            logger.info("No valid session - attempting automated login...")
            login_success = await login_to_spotify(page, force_fresh=True)
            if not login_success:
                logger.error("Automated login failed")
                logger.error("Please try manual login via VNC if bot detection is triggered")
                return 0, len(campaigns)  # All campaigns in batch failed
            logger.info("Automated login successful")
        else:
            logger.info("Valid session found - proceeding with scraping")'''

if old_block in text:
    text = text.replace(old_block, new_block)
    path.write_text(text)
    print('SUCCESS: Re-enabled automated login')
else:
    print('ERROR: Could not find the exact block to replace')
    # Debug
    if 'SESSION-ONLY MODE' in text:
        print('Found SESSION-ONLY MODE in text')
    if 'NO VALID SESSION FOUND' in text:
        print('Found NO VALID SESSION FOUND in text')
