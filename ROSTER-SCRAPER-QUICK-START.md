# 🚀 Roster Scraper - Quick Start Guide

## What It Does

Automatically scrapes stream data for **all active campaigns** from the Spotify for Artists Roster page.

```
CSV File → Parse Artists & Songs → Navigate to Roster → Scrape Stream Data → Update Database
```

---

## 📊 Example Flow

### Input (from CSV):
```
Segan - DNBMF          (Artist: Segan, Song: DNBMF)
Segan - Tempo          (Artist: Segan, Song: Tempo)
Reece Rosé - Back Back (Artist: Reece Rosé, Song: Back Back)
```

### Process:
1. Go to Roster → Find "Segan"
2. See all Segan's songs in roster
3. Find "DNBMF" and "Tempo"
4. Scrape their stream data
5. Save to database

### Output:
```json
{
  "Segan - DNBMF": {
    "streams_28d": 5000,
    "listeners": 3200,
    "playlists": [
      {"name": "Discover Weekly", "streams": 1200},
      {"name": "DnB Vibes", "streams": 800}
    ]
  }
}
```

---

## 🏗️ Implementation Steps

### Phase 1: Setup (30 mins)
- [ ] Clone `spotify_scraper/` to `roster_scraper/`
- [ ] Create file structure
- [ ] Install dependencies

### Phase 2: CSV Parser (1 hour)
- [ ] Parse `Spotify Playlisting-Active Campaigns.csv`
- [ ] Extract artist names and song names
- [ ] Group songs by artist

### Phase 3: Roster Navigation (2 hours)
- [ ] Navigate to Roster page
- [ ] Find specific artist
- [ ] Get all songs for artist
- [ ] Match song names

### Phase 4: Data Extraction (2 hours)
- [ ] Click on matched song
- [ ] Scrape stream data
- [ ] Scrape playlist data
- [ ] Save to JSON

### Phase 5: Database Import (1 hour)
- [ ] Create import script
- [ ] Update `spotify_campaigns` table
- [ ] Update `campaign_playlists` table
- [ ] Verify in UI

---

## 🎯 Key Features

✅ **Batch Processing**: Scrapes all active campaigns at once  
✅ **Smart Matching**: Fuzzy matches song names  
✅ **Session Persistence**: Stays logged in  
✅ **Error Handling**: Skips failures, continues scraping  
✅ **Progress Tracking**: Shows real-time progress  
✅ **Incremental Saves**: Saves after each artist  

---

## 📁 File Structure

```
roster_scraper/
├── run_roster_scraper.py          # 👈 Run this!
├── runner/
│   └── app/
│       ├── csv_parser.py          # Parse CSV
│       ├── scraper.py             # Main scraper
│       └── pages/
│           ├── roster_page.py     # Roster navigation
│           └── song_page.py       # Song data extraction
└── data/
    └── raw/                       # Output JSON files
```

---

## 🎮 How to Run

### 1. Setup
```bash
cd roster_scraper
pip install -r requirements.txt
```

### 2. Run Scraper
```bash
python run_roster_scraper.py
```

### 3. Import to Database
```bash
node scripts/import-roster-data.js
```

### 4. Verify in UI
Go to `https://app.artistinfluence.com/spotify/campaigns` and check updated stream data!

---

## ⚡ What You'll See

```
🎯 SPOTIFY FOR ARTISTS - ROSTER SCRAPER
================================================================================

📋 Step 1: Parsing Active Campaigns CSV...
✅ Found 203 active campaign songs
✅ Found 45 unique artists

🚀 Step 2: Initializing browser...
🔐 Checking login status...
✅ Login verified!

🎤 Step 3: Scraping songs from Roster...
--------------------------------------------------------------------------------

[1/45] Processing: Segan
----------------------------------------
   📝 3 song(s) in campaigns
   ✅ Found 15 song(s) in Roster
      ✅ Matched: DNBMF
      ✅ Matched: Tempo
      ✅ Matched: The Same
   💾 Saved to: data/raw/roster_Segan_20251023_153000.json
   ⏳ Waiting 3 seconds...

[2/45] Processing: Reece Rosé
----------------------------------------
   📝 2 song(s) in campaigns
   ✅ Found 8 song(s) in Roster
      ✅ Matched: Back Back
      ✅ Matched: Noche
   💾 Saved to: data/raw/roster_Reece_Rose_20251023_153015.json
   ⏳ Waiting 3 seconds...

...

================================================================================
📊 SCRAPING COMPLETE
================================================================================
✅ Successful: 198
❌ Failed: 5
📁 Data files in: data/raw/

🎉 Scraping completed successfully!

💡 Next step: Import data to Supabase:
   node scripts/import-roster-data.js
```

---

## 🔥 Benefits

| Before | After |
|--------|-------|
| Manual data entry | Fully automated |
| Outdated stream counts | Real-time data |
| Missing playlist info | Complete playlist breakdown |
| Hours of work | 30 minutes total |
| Prone to errors | 95%+ accuracy |

---

## 🤔 Why This Approach?

### Why Roster page instead of individual SFA links?

1. **Efficiency**: One page load per artist vs. one per song
2. **Discovery**: See ALL songs, not just campaigns
3. **Bulk Operations**: Process multiple songs at once
4. **Less Rate Limiting**: Fewer page navigations
5. **Better Matching**: See full catalog to match song names

### What if a song isn't in Roster?

The scraper will:
1. Try to find it by name matching
2. Log it as "not found"
3. Continue to next song
4. You can manually check these later

---

## 💪 Ready to Build?

**Estimated Total Time**: ~8-10 hours

**Breakdown**:
- Setup & Structure: 1 hour
- CSV Parser: 1 hour
- Roster Navigation: 3 hours
- Data Extraction: 2 hours
- Database Import: 1 hour
- Testing & Polish: 2 hours

---

## 📞 Questions?

**Q: Will this replace the existing scraper?**  
A: No! This complements it. Use Roster Scraper for bulk updates, use the existing scraper for detailed individual song analysis.

**Q: How often should I run it?**  
A: Weekly or bi-weekly to keep campaign data fresh.

**Q: What if Spotify changes their UI?**  
A: The scraper uses multiple fallback selectors, but we may need to update selectors if there's a major redesign.

**Q: Can it scrape all 203 campaigns in one go?**  
A: Yes! It's designed for batch processing. Expect ~30-45 minutes total.

---

**Let's build this! 🚀**

