# Spotify Scraper - Ready for Production Deployment

## ✅ Test Results

### Local Testing Complete - 2025-11-22

**Full Workflow Test:**
- ✅ Fresh incognito login (no cached session)
- ✅ Connected to production database
- ✅ Scraped real campaign: DAUNTER x URAI - ENGULFED
- ✅ Extracted data: 56 streams (24h), 320 streams (7d), 3/4 playlists
- ✅ Updated production database successfully
- ✅ Verified data persisted correctly

**Login Flow Verified:**
1. Navigate to `artists.spotify.com`
2. Click "Log in" button
3. Enter email
4. Click "Continue"
5. Click "Log in with a password"
6. Enter password
7. Click final "Log in" button
8. Dismiss "I'll explore on my own" modal
9. Verify `sp_dc` cookie present
10. Land on dashboard

## 🚀 Production Deployment Steps

### 1. Update Production Scraper

The production scraper (`run_production_scraper.py`) currently uses persistent context. We need to update it to use fresh incognito login like our test.

**SSH to server:**
```bash
ssh root@165.227.91.129
cd /root/ARTi-project/spotify_scraper
```

**Pull latest code:**
```bash
git pull origin main
```

### 2. Update `run_production_scraper.py`

The scraper needs to be updated to use the fresh login flow instead of persistent context. Key changes:
- Use `browser.new_context()` instead of `launch_persistent_context()`
- Implement the full login flow (like in `test_full_workflow.py`)
- Ensure `sp_dc` cookie is verified after login

### 3. Test on Production Server

```bash
# Set environment
export DISPLAY=:99
Xvfb :99 -screen 0 1280x1024x24 &

# Test with single campaign
python3 run_production_scraper.py --limit 1
```

### 4. Verify in Database

```bash
# Check last_scraped_at timestamp
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT campaign, streams_24h, streams_7d, last_scraped_at 
FROM spotify_campaigns 
WHERE last_scraped_at IS NOT NULL 
ORDER BY last_scraped_at DESC 
LIMIT 5;
"
```

### 5. Check Frontend UI

1. Navigate to: https://artistinfluence.com/spotify/stream-strategist
2. Find campaign: "DAUNTER x URAI - ENGULFED"
3. Verify:
   - 24h streams: 56
   - 7d streams: 320
   - Last updated timestamp

### 6. Schedule Cron Job

The cron job is already set up, but verify it's using the updated scraper:

```bash
crontab -l
```

Should show:
```
0 2 * * * /root/ARTi-project/scripts/spotify-scraper-daily.sh >> /root/logs/spotify-scraper-cron.log 2>&1
```

## 📋 Current Status

### ✅ Completed
- [x] Fresh login flow working 100%
- [x] Data scraping working (streams + playlists)
- [x] Database integration working
- [x] Local end-to-end test passed
- [x] All code committed and pushed to GitHub

### 🔄 Next Steps
1. Update `run_production_scraper.py` to use fresh login
2. Deploy to production server
3. Test with single campaign on server
4. Run full scraper on all campaigns
5. Monitor cron job execution

## 🔧 Technical Details

### Fresh Login Approach

**Why incognito mode:**
- No cached cookies or session
- Clean state every time
- More reliable across runs
- Matches production behavior

**Key Selectors:**
- Landing page login: `button:has-text("Log in")`
- Email input: `input[type="text"]`
- Continue button: `button:has-text("Continue")`
- Password option: `button:has-text("Log in with a password")`
- Password input: `input[type="password"]`
- Submit button: `button[data-testid="login-button"]`
- Welcome modal: `button:has-text("I'll explore on my own")`

### Database Schema

**Updated fields:**
- `streams_24h` (integer)
- `streams_7d` (integer)
- `playlists_24h_count` (integer)
- `playlists_7d_count` (integer)
- `last_scraped_at` (timestamp)
- `scrape_data` (jsonb) - full raw data

### Environment Variables (Production)

```bash
SUPABASE_URL=https://api.artistinfluence.com
SUPABASE_SERVICE_ROLE_KEY=eyJ...81IU
SPOTIFY_EMAIL=tribe@artistinfluence.com
SPOTIFY_PASSWORD=XXXX
HEADLESS=false  # Use GUI mode with Xvfb on server
```

## 📊 Expected Results

After deployment and first run:
- ~100-200 campaigns scraped (those with valid SFA URLs)
- Data visible in frontend UI
- Daily cron updates at 2 AM
- Logs in `/root/logs/spotify-scraper-cron.log`

## 🐛 Troubleshooting

### Login Fails
- Check `SPOTIFY_EMAIL` and `SPOTIFY_PASSWORD` in `.env`
- Verify Xvfb is running: `ps aux | grep Xvfb`
- Check for browser crashes: `ps aux | grep chromium`

### No Data Scraped
- Verify campaign has valid SFA URL
- Check selectors haven't changed (take screenshot)
- Look for errors in logs

### Database Update Fails
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Check network connectivity to `api.artistinfluence.com`
- Verify table schema matches expected fields

## 🎯 Success Criteria

Deployment is successful when:
1. ✅ Scraper runs without errors
2. ✅ Data appears in database
3. ✅ Frontend UI shows updated data
4. ✅ Cron job runs daily at 2 AM
5. ✅ Logs show successful scraping

---

**Last Updated:** 2025-11-22
**Status:** Ready for Production Deployment

