# 🎯 Roster URL Collector

Extracts Spotify for Artists (SFA) URLs for all active campaigns by navigating the Roster page.

## 📋 What It Does

1. **Reads** `Spotify Playlisting-Active Campaigns.csv`
2. **Groups** campaigns by client (106 unique clients)
3. **Navigates** to each client in the Roster
4. **Finds** all their songs
5. **Matches** campaign names to roster songs
6. **Extracts** SFA URLs
7. **Saves** to markdown and text files

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd roster_scraper
pip install -r requirements.txt
playwright install chromium
```

### 2. Run the Collector
```bash
python run_roster_scraper.py
```

### 3. Login (First Time Only)
- Browser will open automatically
- Log in to Spotify for Artists
- Session persists for future runs

### 4. Wait for Collection
- ~2-3 minutes per client
- ~40-60 minutes total for all clients
- Progress shown in console

## 📁 Output Files

All files saved to `data/` directory:

- `sfa-urls-from-roster_TIMESTAMP.md` - Full details (organized by client)
- `sfa-urls-simple_TIMESTAMP.txt` - Just the URLs (one per line)
- `roster_scraping_results_TIMESTAMP.json` - Complete results with stats

## 📊 Expected Results

```
Total Campaigns:  251
Unique Clients:   106
SFA URLs Found:   ~200-220 (depending on Roster availability)
```

## 🔗 Next Step

Use the collected URLs with the existing scraper:

```bash
cd ../spotify_scraper
python run_s4a_list.py
# (Modify to read from: ../roster_scraper/data/sfa-urls-simple_TIMESTAMP.txt)
```

## 🛠️ How It Works

```
CSV → Parse → Group by Client → For Each Client:
  1. Go to Roster
  2. Find artist
  3. Get all songs
  4. Match campaign names
  5. Extract SFA URLs
  6. Save
```

## ⚡ Features

- ✅ **Session Persistence**: Login once, use forever
- ✅ **Fuzzy Matching**: Handles name variations
- ✅ **Progress Tracking**: Real-time console updates
- ✅ **Error Handling**: Continues even if some clients fail
- ✅ **Multiple Outputs**: MD, TXT, and JSON formats
- ✅ **Deduplicated**: Removes duplicate URLs

## 🐛 Troubleshooting

### "Artist not found in Roster"
- Some clients are managers/labels, not artists
- The actual artist name is in the campaign name
- These may need manual lookup

### "Login failed"
- Close all Spotify for Artists browser tabs
- Delete `data/browser_data/` folder
- Run script again and log in fresh

### "No songs found in Roster"
- Artist may not have songs in this account
- Check if they're managing multiple artists
- Verify the correct account is logged in

## 📞 Support

If scraping fails for specific clients, check:
1. Is the client name correct in CSV?
2. Does the artist have songs in Roster?
3. Are you logged into the correct S4A account?

