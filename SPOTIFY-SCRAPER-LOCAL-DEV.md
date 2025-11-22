# Local Development Setup for Spotify Scraper

## Overview
Test the scraper locally with full GUI visibility, then deploy to production once working.

---

## Prerequisites

1. **Python 3.11+** installed
2. **Playwright** installed
3. **Local Supabase** running OR connect to production Supabase
4. **Spotify for Artists** account credentials

---

## Setup Steps

### 1. Install Dependencies

```bash
cd spotify_scraper
pip install -r requirements.txt
playwright install chromium
```

### 2. Create Local .env File

Create `spotify_scraper/.env`:

```env
# Spotify Credentials
SPOTIFY_EMAIL=tribe@artistinfluence.com
SPOTIFY_PASSWORD=UE_n7C*8wgxe9!P4abtK

# Production Supabase (for testing with real data)
SUPABASE_URL=https://api.artistinfluence.com
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# Scraper Settings
HEADLESS=false  # IMPORTANT: Set to false for local debugging
LOG_LEVEL=INFO

# Browser Directories (local paths)
USER_DATA_DIR=./browser_data
DOWNLOAD_DIR=./downloads
ARTIFACTS_DIR=./artifacts
```

### 3. Test Login Flow

```bash
cd spotify_scraper
python3 login_on_server.py
```

**This will open a visible Chrome window!** You can:
- Watch the login process
- See what buttons/fields exist
- Manually intervene if needed
- Take screenshots

### 4. Test Single Campaign

Once login works, test with a known-good campaign:

```bash
# Test with campaign 7343 (DAUNTER x URAI - ENGULFED)
python3 test_full_workflow.py
```

### 5. Debug Selectors

If the scraper can't find elements:

**Option A: Use Playwright Inspector**
```bash
# Run with Playwright debugger
PWDEBUG=1 python3 login_on_server.py
```

This opens Playwright Inspector where you can:
- Pause execution
- Inspect elements
- Test selectors in real-time

**Option B: Manual Debugging**
```python
# Add to scraper.py where it fails:
await self.page.pause()  # Opens inspector
```

### 6. Check What's on the Page

Create `debug_page.py`:

```python
import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

import sys
sys.path.insert(0, str(Path(__file__).parent))
from runner.app.scraper import SpotifyArtistsScraper

async def debug_login():
    scraper = SpotifyArtistsScraper(headless=False)
    await scraper.start()
    
    email = os.getenv('SPOTIFY_EMAIL')
    password = os.getenv('SPOTIFY_PASSWORD')
    
    # Navigate to login
    await scraper.page.goto('https://accounts.spotify.com/login')
    await asyncio.sleep(2)
    
    # Fill email
    await scraper.page.fill('input#username', email)
    await scraper.page.click('button:has-text("Continue")')
    await asyncio.sleep(5)
    
    # PAUSE HERE - Browser stays open!
    print("\n🔍 Browser paused! Check the page manually.")
    print("   Look for buttons, password fields, etc.")
    print("   Press Ctrl+C when done.\n")
    
    try:
        await asyncio.sleep(300)  # Wait 5 minutes
    except KeyboardInterrupt:
        pass
    
    await scraper.stop()

if __name__ == '__main__':
    asyncio.run(debug_login())
```

Run it:
```bash
python3 debug_page.py
```

The browser will pause after clicking Continue so you can:
- See what page loads
- Check if there's a "Log in with password" button
- See what the actual button text/attributes are
- Take screenshots

---

## Common Issues & Solutions

### Issue: Email not accepted
**Symptom:** Page doesn't navigate after clicking Continue  
**Solution:** Check if email format is correct or account exists

### Issue: Can't find password field
**Symptom:** "ERROR: Could not find password input field!"  
**Solution:** 
1. Run `debug_page.py` 
2. Manually inspect the page
3. Check if it's asking for a different authentication method

### Issue: Login succeeds but no sp_dc cookie
**Symptom:** "Login successful" but redirects to login on song pages  
**Solution:** Spotify requires full OAuth flow, not password login

---

## Once Working Locally

### Deploy to Production

1. **Commit changes:**
```bash
git add spotify_scraper/
git commit -m "fix: Update login flow with working selectors"
git push origin main
```

2. **Pull on server:**
```bash
ssh root@165.227.91.129
cd /root/arti-marketing-ops
git pull origin main
```

3. **Test on server:**
```bash
cd spotify_scraper
python3 login_on_server.py
```

4. **Run full scraper:**
```bash
python3 run_production_scraper.py
```

---

## Next Steps

1. ✅ Set up local environment
2. ✅ Test login with visible browser
3. ✅ Debug selectors if needed
4. ✅ Test with one campaign
5. ✅ Deploy to production
6. ✅ Verify on frontend

---

## Debugging Tips

**See what Playwright is doing:**
```bash
# Slow down actions
SLOW_MO=1000 python3 login_on_server.py

# Take screenshots on errors
# (already configured in scraper.py)
```

**Inspect saved screenshots:**
```bash
# Check artifacts directory
ls -la artifacts/
```

**Test specific selectors:**
```python
# In Python console
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()
    page.goto('https://accounts.spotify.com/login')
    
    # Test selectors
    page.fill('input#username', 'test@example.com')
    # etc.
```

---

**Start with Step 1: Set up local environment!** 🚀

