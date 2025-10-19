# 🎉 Ready to Scrape!

## ✅ Everything is Set Up

The scraper has been updated with a **60-second login window** and will **keep you logged in** for future runs.

## 🚀 How to Run

### Option 1: Double-Click Batch File (Easiest)

Simply double-click:
```
RUN-S4A-SCRAPER.bat
```

### Option 2: Command Line

```bash
node scripts/scrape-and-import-s4a-list.js
```

## 📋 What Will Happen

### Step 1: Browser Opens (Automatic)
- A Chrome/Edge browser window will open automatically
- The scraper will check if you're logged in

### Step 2: Login Check
- **If logged in**: ✅ Scraper starts immediately
- **If NOT logged in**: ⏰ You get 60 seconds to log in

### Step 3: Login Window (If Needed)
```
⚠️  Not logged in to Spotify for Artists!

📋 PLEASE LOG IN:
   1. A browser window should be open
   2. Navigate to: https://artists.spotify.com
   3. Log in with your Spotify account
   4. Wait for the dashboard to load

⏳ Waiting 60 seconds for you to log in...
   (The browser will stay open and logged in for future runs)

   ⏰ 60 seconds remaining...
   ⏰ 50 seconds remaining...
   ⏰ 40 seconds remaining...
   ...
```

### Step 4: Scraping Begins
```
✅ Login verified! You are logged into Spotify for Artists.
   (Your session is saved - you won't need to log in again)

🎵 [1/16] Processing: reece rose
   URL: https://artists.spotify.com/c/artist/.../song/.../stats
   ✅ Completed: Back Back
   📊 Saved to: ./data/song_5UprPcoiccH3ZxcIjnXgPc_20250118_143022.json
   ⏳ Waiting 3 seconds...

🎵 [2/16] Processing: reece rose
   ...
```

### Step 5: Automatic Import
```
📊 Importing scraped data to database...

🎵 Processing: reece rose - Back Back
   Track ID: 5UprPcoiccH3ZxcIjnXgPc
   ✅ Created new client: reece rose
   ✅ Created new campaign
   📊 Found 23 playlists
   ✅ Created 23 playlists
```

### Step 6: Complete!
```
======================================================================
📊 IMPORT SUMMARY
======================================================================
📁 Files processed: 16
👤 Clients created: 10
📋 Campaigns created: 16
🎵 Playlists created: 234
❌ Errors: 0
======================================================================

🎉 Complete! All data has been scraped and imported.
```

## ⏱️ Timeline

| Phase                  | Duration        | What's Happening                    |
|------------------------|-----------------|-------------------------------------|
| **Browser Launch**     | 5-10 seconds    | Opening browser, loading Spotify    |
| **Login Check**        | 2-3 seconds     | Verifying if logged in              |
| **Login Window**       | 0-60 seconds    | Only if not logged in               |
| **Scraping (16 songs)**| 20-30 minutes   | Processing each song (1-2 min each) |
| **Import**             | 10-20 seconds   | Adding data to database             |
| **TOTAL**              | **~25-35 min**  | First run with login                |
| **Future Runs**        | **~20-30 min**  | No login needed!                    |

## 🔐 Login Persistence

### First Run
✅ You log in → Session saved → Browser stays open

### Future Runs
✅ Session restored automatically → No login needed → Scraping starts immediately

### Browser Data Location
Your login session is stored in:
```
spotify_scraper/test/browser_data/
```

**Don't delete this folder** - it keeps you logged in!

## 📊 What Gets Created

### In the Database

**clients** table:
- reece rose
- segan
- amberxse
- froboii
- odd language
- kindred
- delato
- chromonicci
- launchsix
- paapi muzik

**spotify_campaigns** table (16 new campaigns):
- "reece rose - Back Back"
- "reece rose - [Song 2]"
- "reece rose - [Song 3]"
- "segan - [Song 1]"
- ... (16 total)

**campaign_playlists** table (estimated 100-300 playlists):
- All playlists each song is placed on
- Stream counts (28-day)
- Playlist curators
- Date added
- Algorithmic playlists flagged

### In the UI

Immediately after import:

**Clients Tab** ✅
- 10 new artists appear
- Click any to see their campaigns

**Campaigns Tab** ✅
- 16 new campaigns appear
- Status: "Active"
- Source: "S4A Scraper"

**Campaign Details Modal** ✅
- Click any campaign
- "Playlists" tab shows all playlists
- Stream counts visible
- Vendor performance breakdown

**Vendors Tab** ✅
- Playlists appear under matching vendors
- (If curator name matches a vendor)

## 🛠️ Technical Details

### Files Created

**Scraped Data:**
```
spotify_scraper/data/song_[TRACK_ID]_[TIMESTAMP].json
```

Example:
```json
{
  "url": "https://artists.spotify.com/c/artist/.../song/.../stats",
  "time_ranges": {
    "28_days": {
      "stats": {
        "title": "Back Back",
        "artist": "reece rose",
        "streams": 150000,
        "listeners": 45000
      },
      "playlists": [
        {
          "name": "Bass House Bangers",
          "made_by": "Club Restricted",
          "streams": 12500,
          "date_added": "2024-12-15"
        },
        ...
      ]
    }
  }
}
```

### Database Operations

1. **Check for existing client** (by artist name)
2. **Create if new** OR **Update if exists**
3. **Check for existing campaign** (by URL or name)
4. **Create if new** OR **Update SFA link if exists**
5. **For each playlist**:
   - Check if already exists
   - Create new OR update stream counts

**All operations use UPSERTS** - safe to run multiple times!

## ⚠️ Important Notes

### Don't Close the Browser
- The browser window needs to stay open during scraping
- It will close automatically when done

### Don't Close the Terminal
- Keep the command window open
- You'll see real-time progress

### Rate Limiting
- The scraper waits 3 seconds between songs
- This prevents being rate-limited by Spotify
- **Do not reduce this delay**

### Errors Are OK
- If 1-2 songs fail, the rest will continue
- Failed songs can be re-scraped individually later

## 🔄 Running Again in the Future

### To Re-scrape the Same Songs (Update Data)
Just run the script again:
```bash
node scripts/scrape-and-import-s4a-list.js
```

- No login needed (session persists)
- Updates stream counts with latest data
- Updates playlist placements

### To Scrape Different Songs

1. Edit `s4alist.md`
2. Add new SFA links under artist names
3. Run the script

## 🐛 Troubleshooting

### "Still not logged in" After 60 Seconds

**Possible causes:**
- Didn't complete login process
- Network issue
- Wrong Spotify account

**Solution:**
- Run the script again
- The browser will reopen with your partial login
- Complete the login process

### No Browser Window Appears

**Causes:**
- Python not installed correctly
- Playwright not installed

**Solution:**
```bash
cd spotify_scraper
.\venv\Scripts\activate
playwright install chromium
```

### "No playlists found" for a Song

**Possible reasons:**
- Song is very new (< 1 week old)
- Song removed from all playlists
- Song not claimed in Spotify for Artists

**This is normal** - not all songs have playlists yet.

## 📞 Need Help?

### Check Log Files
The scraper creates detailed logs. Look for:
- Console output (errors in red)
- Scraped JSON files (check if data is there)
- Database (run query to see what was imported)

### Verify Data Was Imported

```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT COUNT(*) FROM spotify_campaigns WHERE source = 'S4A Scraper';"
```

Should show 16 campaigns after successful run.

---

## ✅ You're All Set!

**Just run:**
```bash
RUN-S4A-SCRAPER.bat
```

Or:
```bash
node scripts/scrape-and-import-s4a-list.js
```

**The browser will open, you'll get 60 seconds to log in, and everything will run automatically!** 🎉

