# 🔍 Diagnose Selector Issue

## Problem
**ALL campaigns failing** with same error:
```
Page.wait_for_selector: Timeout 10000ms exceeded.
waiting for locator(".song-title, [class*=\"title\"]") to be visible
```

This suggests:
1. Spotify changed their page structure
2. Headless mode renders pages differently
3. Page needs more time to load

---

## Quick Diagnosis

```bash
cd /root/arti-marketing-ops
git pull origin main

cd spotify_scraper
python3 diagnose_page.py
```

This will:
1. Open a real Spotify campaign page
2. Show what selectors actually exist
3. Show page HTML
4. Save a screenshot to `logs/diagnostic_screenshot.png`

---

## Expected Output

```
Navigating to: https://artists.spotify.com/...
Current URL: https://artists.spotify.com/...
Page title: Spotify for Artists

=== Looking for elements ===
.song-title: 0 found     ← If 0, selector is wrong!
h1: 1 found
  → Text: ENGULFED
main: 1 found

=== Page HTML (first 2000 chars) ===
<!DOCTYPE html><html>...

✓ Screenshot saved to: /root/arti-marketing-ops/spotify_scraper/logs/diagnostic_screenshot.png
```

---

## Possible Issues & Fixes

### Issue 1: Selector Changed
**If `.song-title` returns 0:**
- Spotify updated their page structure
- Need to find new selector from HTML output

### Issue 2: Page Not Fully Loaded
**If page is mostly empty:**
- Increase wait time
- Wait for specific network requests
- Try `wait_until='load'` instead of `'networkidle'`

### Issue 3: Headless Mode Rendering
**If screenshot shows blank/loading page:**
- Page requires GPU or specific browser features
- Try with `headless=False` + Xvfb
- Add user agent to look less like a bot

---

## After Running Diagnostic

Share the output and I'll create the fix based on:
1. What selectors actually exist
2. What the page HTML looks like
3. What the screenshot shows

---

**Run this now:**
```bash
cd /root/arti-marketing-ops && git pull origin main && cd spotify_scraper && python3 diagnose_page.py
```

