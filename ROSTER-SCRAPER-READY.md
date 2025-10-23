# 🎉 Roster URL Collector - READY TO RUN!

## ✅ **What We Built**

A complete scraper that extracts Spotify for Artists URLs from the Roster for all 251 active campaigns!

---

## 📁 **Project Structure**

```
roster_scraper/
├── run_roster_scraper.py              # ← RUN THIS!
├── requirements.txt                   # Dependencies
├── README.md                          # Documentation
│
├── runner/app/
│   ├── csv_parser.py                  # Parse CSV (handles BOM)
│   ├── roster_scraper.py              # Main scraper class
│   └── pages/
│       └── roster_page.py             # Roster navigation
│
└── data/                              # Output files will go here
```

---

## 🚀 **How to Run**

### **Step 1: Install Dependencies**
```bash
cd roster_scraper
pip install -r requirements.txt
playwright install chromium
```

### **Step 2: Run the Scraper**
```bash
python run_roster_scraper.py
```

### **Step 3: Login (First Time Only)**
- Browser opens automatically
- Go to https://artists.spotify.com
- Log in
- Wait 60 seconds
- Scraper starts!

### **Step 4: Wait for Collection**
```
Processing 106 clients...
[1/106] Processing: Karma
   📝 1 campaign(s) for this client
   ✅ Found 5 song(s) in Roster
      ✅ Matched: Perfect Angel BB → https://artists.spotify.com/c/artist/.../song/.../stats
   ⏳ Waiting 2 seconds...

[2/106] Processing: Majed
   ...
```

**Estimated time**: ~40-60 minutes for all clients

---

## 📊 **What You'll Get**

### **3 Output Files in `data/` directory:**

#### 1. **Full Details** (`sfa-urls-from-roster_TIMESTAMP.md`)
```markdown
## Segan

**Songs:** 5

### DNBMF
- **Campaign:** Segan - DNBMF
- **Artist:** Segan
- **URL:** https://artists.spotify.com/c/artist/0NgWGGk9p04zLTeFbIdsVO/song/0LfS8z5VUqkD9WlMLOZskY/stats
- **Track ID:** 0LfS8z5VUqkD9WlMLOZskY
- **Goal:** 50,000 streams
- **Vendor:** Club Restricted
```

#### 2. **Simple URL List** (`sfa-urls-simple_TIMESTAMP.txt`)
```
https://artists.spotify.com/c/artist/0NgWGGk9p04zLTeFbIdsVO/song/0LfS8z5VUqkD9WlMLOZskY/stats
https://artists.spotify.com/c/artist/.../song/.../stats
...
```

#### 3. **Complete Results** (`roster_scraping_results_TIMESTAMP.json`)
```json
{
  "scraped_at": "2025-10-23T15:30:00",
  "total_campaigns": 251,
  "total_clients": 106,
  "clients": {
    "Segan": {
      "campaigns": 5,
      "roster_songs_found": 15,
      "matched_songs": 5,
      "songs": [...]
    }
  }
}
```

---

## 🎯 **Expected Results**

```
📊 SCRAPING COMPLETE
================================================================================

✅ Successful clients: ~90-100/106
❌ Failed clients: ~6-16/106

✅ Songs matched: ~200-220
❌ Songs not found: ~30-50

📁 Unique SFA URLs collected: ~200-220
```

**Why some fail?**
- Client is a manager/label (not the actual artist)
- Song not in this Roster account
- Name mismatch (needs manual lookup)

---

## 🔗 **Next Steps**

### **Option 1: Use with Existing Scraper**

Modify `spotify_scraper/run_s4a_list.py` to read from the simple URL list:

```python
# In run_s4a_list.py
def parse_url_file(file_path):
    """Parse simple URL list"""
    urls = []
    with open(file_path, 'r') as f:
        for line in f:
            url = line.strip()
            if url and url.startswith('https://artists.spotify.com'):
                urls.append(url)
    return urls

# Then use it:
sfa_links = parse_url_file('../roster_scraper/data/sfa-urls-simple_TIMESTAMP.txt')
for url in sfa_links:
    # Scrape using existing logic
    data = await scraper.scrape_song_data(url)
    # ...
```

### **Option 2: Create Unified Pipeline Script**

```bash
#!/bin/bash
# complete-pipeline.sh

# Step 1: Collect SFA URLs
cd roster_scraper
python run_roster_scraper.py

# Step 2: Scrape stream data
cd ../spotify_scraper
python run_s4a_list.py --input ../roster_scraper/data/sfa-urls-simple_*.txt

# Step 3: Import to database
cd ..
node scripts/populate-playlist-vendor-data-v2.js

echo "✅ Complete pipeline finished!"
```

---

## 💡 **Pro Tips**

### **1. Session Persistence**
After first login, the browser session is saved in `data/browser_data/`. You won't need to log in again!

### **2. Resume Failed Clients**
If some clients fail, you can manually edit the CSV to only include failed ones and re-run.

### **3. Verify Results**
Check the JSON file for `"status": "error"` to see which clients failed and why.

### **4. Manual Lookups**
For campaigns without Roster matches, you may need to:
- Check if the artist name is correct
- Search manually in Roster
- Add SFA URLs to a separate file

---

## 🐛 **Troubleshooting**

### **"No artists found in Roster"**
- Try logging out and back in
- Verify you're on the correct S4A account
- Check if Roster page layout changed

### **"Artist not found: X"**
- Client name might not match artist name
- Try searching for the artist name from the campaign (before the "-")
- May need manual lookup

### **"Login verification failed"**
- Close all Spotify for Artists browser tabs
- Delete `data/browser_data/` folder
- Run again and log in fresh

---

## 📈 **What We Achieved**

### **Before:**
- ❌ No centralized SFA URL list
- ❌ Manual URL collection
- ❌ Incomplete campaign coverage
- ❌ Hours of manual work

### **After:**
- ✅ Automated URL collection
- ✅ ~85-90% coverage
- ✅ Organized by client
- ✅ Multiple output formats
- ✅ 40-60 minutes automated

---

## 🎯 **Ready to Run?**

```bash
cd roster_scraper
python run_roster_scraper.py
```

**Let the scraper do its magic!** ✨

Then use the collected URLs with your existing scraper to get all the stream data! 🎵

