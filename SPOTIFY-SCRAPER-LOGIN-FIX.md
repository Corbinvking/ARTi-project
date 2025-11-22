# Spotify Scraper - Login Fix

## The Problem

The debug script revealed that the scraper is being redirected to a **login page** instead of accessing song data. The page shows these elements:
- `login-username`
- `login-button: Continue`
- `signup-btn-link: Sign up`

This means **the browser session transferred from your local machine isn't working on the server**. Spotify is detecting a different machine/IP and requiring re-authentication.

---

## The Solution

Perform a fresh login directly on the production server.

---

## Step-by-Step Guide

### 1. SSH to Server

```bash
ssh root@165.227.91.129
cd /root/arti-marketing-ops
```

### 2. Pull Latest Code

```bash
git pull origin main
```

### 3. Add Credentials to .env

Edit the `.env` file and add your Spotify login credentials:

```bash
nano spotify_scraper/.env
```

Add these lines:

```
SPOTIFY_EMAIL=your-spotify-email@example.com
SPOTIFY_PASSWORD=your-spotify-password
```

**Important:** Use the account that has access to Spotify for Artists and does NOT have 2FA enabled.

### 4. Delete Old Browser Session

The old session from your local machine doesn't work. Remove it:

```bash
rm -rf /root/arti-marketing-ops/spotify_scraper/browser_data/*
```

### 5. Run the Login Script

```bash
cd /root/arti-marketing-ops/spotify_scraper
python3 login_on_server.py
```

This will:
- Start browser in GUI mode (with Xvfb)
- Use the existing `auto_login()` function
- Verify the login worked
- Save the session to `browser_data/`

### 6. Test with Real Campaign

Once login is successful, test with the known-good campaign:

```bash
bash test_real_campaign.sh
```

You should now see:
- ✅ Dropdown found
- ✅ Playlists extracted
- ✅ Streams counted

### 7. Run Full Production Scraper

If the test passes, run the full scraper:

```bash
python3 run_production_scraper.py
```

### 8. Verify on Frontend

Go to the frontend UI and check that stream counts are updating.

---

## Troubleshooting

### If auto_login fails:

**Option 1: Manual Login (with X11 forwarding)**

```bash
# On your local machine, SSH with X11 forwarding
ssh -X root@165.227.91.129

# On server
cd /root/arti-marketing-ops/spotify_scraper
python3 do_server_login.sh
```

This will open a visible browser window on your machine. You can log in manually.

**Option 2: Use 2FA Recovery Codes**

If you have 2FA enabled, you'll need to temporarily disable it or use a recovery code.

**Option 3: Screenshot-Guided Login**

The `do_server_login.sh` script takes screenshots every 10 seconds. You can:
1. Run the script
2. Download screenshots: `scp root@165.227.91.129:/var/log/spotify-scraper/login_step_*.png .`
3. Fill in the form based on what you see
4. This is tedious but works without X11

---

## Expected Output

### Successful Login:

```
==========================================
  Logging in to Spotify for Artists
==========================================
Email: your-email@example.com
Mode: GUI

[1/4] Starting browser...
[2/4] Attempting auto-login...
[OK] Already logged in! Session is valid.

[3/4] Verifying login...
Screenshot saved: /var/log/spotify-scraper/login_verified.png

✅ Login verified successfully!

[4/4] Saving session...

==========================================
  ✅ Login Complete!
==========================================

Session saved to:
  /root/arti-marketing-ops/spotify_scraper/browser_data

The scraper can now use this session.

To verify, run:
  bash test_real_campaign.sh
```

### Then Test Should Pass:

```
==========================================
  Testing with REAL Campaign (7343)
==========================================

Campaign: DAUNTER x URAI - ENGULFED
Expected: 320 streams (7d), 4 playlists

...

========================================
  RESULTS
========================================
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

## What Changed

- **Root Cause:** Browser session from local machine didn't work on server
- **Solution:** Fresh login directly on production server
- **New Files:**
  - `login_on_server.py` - Automated login using existing `auto_login()` function
  - `do_server_login.sh` - Interactive login with screenshot guidance
- **Next Steps:** After login works, the regular scraper will run successfully

---

## Questions?

If you encounter any issues:
1. Check the screenshots in `/var/log/spotify-scraper/`
2. Verify credentials in `.env` are correct
3. Make sure the account has Spotify for Artists access
4. Disable 2FA temporarily if needed

