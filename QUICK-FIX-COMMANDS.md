# Quick Fix Commands - Copy/Paste on Server

## Step 1: Clean the .env file

```bash
# Edit the .env file
nano /root/arti-marketing-ops/spotify_scraper/.env
```

**Delete everything and paste this (including blank lines):**

```
SPOTIFY_EMAIL=tribe@artistinfluence.com
SPOTIFY_PASSWORD=UE_n7C*8wgxe9!P4abtK
SUPABASE_URL=https://api.artistinfluence.com
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDuYL0wO1Q8
HEADLESS=false
LOG_LEVEL=INFO
USER_DATA_DIR=/root/arti-marketing-ops/spotify_scraper/browser_data
DOWNLOAD_DIR=/root/arti-marketing-ops/spotify_scraper/downloads
ARTIFACTS_DIR=/root/arti-marketing-ops/spotify_scraper/artifacts
```

**Save:** `Ctrl+O`, `Enter`, `Ctrl+X`

---

## Step 2: Pull latest code and run fix

```bash
cd /root/arti-marketing-ops && git pull origin main
cd spotify_scraper
bash quick_login_fix.sh
```

---

## Expected Output

```
==========================================
  Spotify Scraper - Login Fix
==========================================

[1/6] Pulling latest code...
[2/6] Starting Xvfb...
[3/6] Removing old browser session...
[4/6] Checking credentials...
   Email: tribe@artistinfluence.com
   Mode: GUI (with Xvfb)

[5/6] Performing login...

==========================================
  Logging in to Spotify for Artists
==========================================
Email: tribe@artistinfluence.com
Mode: GUI

[1/4] Starting browser...
[2/4] Attempting auto-login...
Step 1: Entering email...
Step 2: Clicking Continue...
Step 3: Entering password...
Step 4: Clicking Log In...

✅ Login verified successfully!

[3/4] Verifying login...
Screenshot saved: /var/log/spotify-scraper/login_verified.png

[4/4] Saving session...

==========================================
  ✅ Login Complete!
==========================================

[6/6] Testing with real campaign...

==========================================
  Testing with REAL Campaign (7343)
==========================================

Campaign: DAUNTER x URAI - ENGULFED

24-hour data:
  Playlists: 4
  Streams:   45

7-day data:
  Playlists: 4
  Streams:   320

========================================
  ✅ SUCCESS!
========================================

Data extraction working correctly!
Ready to run full production scraper.
```

---

## If It Still Fails

Check the .env file was saved correctly:

```bash
cat /root/arti-marketing-ops/spotify_scraper/.env
```

Should show clean output with no duplicates, no weird characters.

---

## After Success

Run the full scraper:

```bash
cd /root/arti-marketing-ops/spotify_scraper
python3 run_production_scraper.py
```

Then check the frontend UI to verify data is updating!
