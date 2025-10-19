# 🎵 S4A Scraper Instructions

## Current Status

The scraper workflow is set up and ready to run, but requires manual login to Spotify for Artists.

## 📋 What's in s4alist.md

The file contains **16 songs from 10 artists**:

| Artist        | Songs |
|---------------|-------|
| reece rose    | 3     |
| segan         | 3     |
| froboii       | 3     |
| amberxse      | 1     |
| odd language  | 1     |
| kindred       | 1     |
| delato        | 1     |
| chromonicci   | 1     |
| launchsix     | 1     |
| paapi muzik   | 1     |

## 🚀 How to Run the Scraper

### Option 1: Automated Workflow (Recommended)

This runs the scraper AND imports the data automatically:

```bash
node scripts/scrape-and-import-s4a-list.js
```

**Steps:**
1. Run the command above
2. A browser window will open
3. **Manually log into artists.spotify.com** in that browser
4. The scraper will automatically run through all 16 songs
5. Data will be automatically imported to the database

### Option 2: Manual Two-Step Process

If you prefer to scrape first, then import:

**Step 1: Run Scraper Only**
```bash
cd spotify_scraper
.\venv\Scripts\activate
python run_s4a_list.py
```

**Step 2: Import Scraped Data**
```bash
cd ..
node scripts/populate-playlist-vendor-data-v2.js
```

## ⚠️ Important Notes

### Login Requirement
- The scraper uses Playwright to open a real browser
- You MUST be logged into artists.spotify.com
- The login session is persistent, so you only need to log in once
- The browser window will stay open during scraping

### What Will Happen

1. **New Clients Created**: For each artist in s4alist.md that doesn't exist
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

2. **New Campaigns Created**: For each song (16 total)
   - Campaign name: "Artist Name - Song Title"
   - Status: "Active"
   - Source: "S4A Scraper"
   - SFA link populated

3. **Playlists Imported**: All playlists each song is placed on
   - Linked to the campaign
   - Stream counts from Spotify for Artists
   - Vendor detection (if playlist curator matches a vendor)
   - Algorithmic playlist detection (Discover Weekly, Radio, etc.)

## 📊 Expected Results

After successful scraping and import:

- **~16 new campaigns** (one per song)
- **~10 new clients** (one per artist)
- **~100-300 new playlists** (depending on how many playlists each song is on)
- All data visible in the UI immediately

## 🔧 Troubleshooting

### "Not logged in" Error
```bash
❌ Not logged in! Please log in manually first.
```

**Solution:**
1. Keep the browser window open
2. Navigate to https://artists.spotify.com
3. Log in with your Spotify account
4. Run the script again

### "No playlists found" for a Song

**Possible Reasons:**
- Song is very new and hasn't been added to playlists yet
- Song has been removed from playlists
- SFA link is incorrect in s4alist.md

### Scraper Fails Midway

The scraper waits 3 seconds between songs to avoid rate limiting. If it fails:
- The data already scraped will be saved
- You can safely re-run the import script
- Duplicates are automatically handled (upserts)

## 📁 Output Files

Scraped data is saved to:
```
spotify_scraper/data/song_[TRACK_ID]_[TIMESTAMP].json
```

Example:
```
song_5UprPcoiccH3ZxcIjnXgPc_20250118_143022.json
```

## 🎯 What Gets Populated

### In the Database

**clients** table:
- New client for each artist
- Name from s4alist.md

**spotify_campaigns** table:
- Campaign for each song
- `url`: Spotify track URL
- `sfa`: Spotify for Artists stats URL
- `status`: "Active"
- `source`: "S4A Scraper"

**campaign_playlists** table:
- All playlists the song is on
- `playlist_name`: Name of playlist
- `playlist_curator`: Who made the playlist
- `streams_28d`: 28-day stream count
- `is_algorithmic`: TRUE for Discover Weekly, Radio, etc.
- `date_added`: When added to playlist

### In the UI

**Campaign Details Modal**:
- Click any of the new campaigns
- See all playlists in the "Playlists" tab
- View stream counts and vendor performance

**Vendor Pages**:
- If playlist curator matches a vendor name
- Playlists will appear under that vendor

**Client Cards**:
- New clients will appear in the Clients tab
- All campaigns for each artist visible

## 🔄 Running Multiple Times

It's safe to run the scraper multiple times:
- Existing clients are found (not duplicated)
- Existing campaigns are updated (not duplicated)
- Playlist data is updated with latest stream counts
- `last_scraped` timestamp updated

## ⏱️ Estimated Time

- **Scraping**: ~1-2 minutes per song (16 songs = ~20-30 minutes)
- **Import**: ~10-20 seconds total
- **Total**: ~30 minutes for all 16 songs

## 🎉 Success Metrics

After successful run:

```
📊 IMPORT SUMMARY
======================================================================
📁 Files processed: 16
👤 Clients created: ~10
📋 Campaigns created: 16
🎵 Playlists created: ~100-300
======================================================================
```

## 🚨 Current Issue

The existing scraped files in `spotify_scraper/data/` are OLD and incomplete:
- They show "Unknown Artist - Songs" (no proper artist/title data)
- They have 0 playlists
- They were scraped without proper login

**Recommendation**: Delete old files and run a fresh scrape:

```bash
# Delete old scraped files
rm spotify_scraper/data/song_*.json

# Run fresh scrape with proper login
node scripts/scrape-and-import-s4a-list.js
```

---

## 📞 Need Help?

If you encounter any issues:
1. Check that you're logged into artists.spotify.com
2. Verify the SFA links in s4alist.md are correct
3. Check the browser console for errors
4. Look at the scraped JSON files to see what data was captured

