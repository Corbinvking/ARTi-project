# 🎯 Roster Scraper - CORRECTED Master Plan

## 📊 **Actual CSV Structure**

### ✅ **What We Know Now:**

```
Total Rows:          251
Active Campaigns:    251
Unique Clients:      106 artists
Unique Songs:        206 individual songs
```

### **Key Understanding:**

- **Client column** = Artist/Client name (e.g., "Segan", "Reece Rosé", "Hitskope")
- **Campaign column** = Song/Campaign name (e.g., "Segan - The Same", "Reece Rosé - Back Back")
- Some songs appear multiple times (different campaigns for same song)
- Some clients have many songs (Hitskope has 18 campaigns!)

---

## 📝 **Top Clients to Scrape**

| Rank | Client | Campaigns | Notes |
|------|--------|-----------|-------|
| 1 | **Hitskope** | 18 songs | Biggest roster |
| 2 | **Dim Mak** | 8 songs | Label/multiple artists |
| 3 | **dack janiels** | 7 songs | Multiple campaigns per song |
| 4 | **Reece Rosé** | 7 songs | |
| 5 | **Kluster Flux** | 7 songs | |
| 6 | **Jordan (Harden)** | 6 songs | |
| 7 | **Sunni D** | 6 songs | |
| 8 | **Filthy** | 6 songs | |
| 9 | **Segan** | 5 songs | Has duplicates (same song, multiple campaigns) |
| 10 | **Traveler** | 5 songs | |

---

## 🔍 **Important Observations**

### 1. **Duplicate Campaigns for Same Song**
```
Example: Segan
  • Segan - The Same  (appears 2x - different campaigns)
  • Segan - DNBMF     (appears 2x - different campaigns)
  • Segan - Tempo     (appears 1x)
```

**Implication**: When we scrape, we'll get ONE set of stream data per song, but need to update MULTIPLE campaign records in the database.

### 2. **Labels vs Artists**
```
"Dim Mak" = Label → Manages multiple artists
"Hitskope" = Could be label/manager → 18 different campaigns

Campaign examples for Hitskope:
  • Frobii - Malone
  • chromonicci - Dopamine
  • Kitt Wakeley - Overworld
  ... 15 more
```

**Implication**: Some "clients" aren't artists themselves - they're managers/labels. We need to look for the actual artist name IN the campaign name (before the "-").

### 3. **Name Parsing Challenge**
```
Campaign: "Segan - The Same"
  → Artist: "Segan"
  → Song: "The Same"

Campaign: "Reece Rose - Rhythm"  (note: no accent)
Client: "Reece Rosé"            (note: has accent)
  → Need fuzzy matching!
```

---

## 🏗️ **Revised Scraping Strategy**

### **Strategy A: Client-First (Recommended)**

```
FOR each unique CLIENT:
    1. Parse campaign names to extract ARTIST names
    2. Go to Spotify for Artists → Roster
    3. Search for ARTIST (might differ from client name)
    4. Get all songs for that artist
    5. Match CAMPAIGN names to roster songs
    6. Scrape matched songs
    7. Update ALL campaigns that share that song
```

**Pros**:
- Efficient (one roster lookup per artist)
- Handles duplicates automatically
- Can discover all songs (not just campaigns)

**Cons**:
- Need to parse artist names from campaign names
- Need fuzzy matching for name variants

---

### **Strategy B: Direct Track URL (Alternative)**

```
FOR each campaign with a Spotify URL:
    1. Extract track ID from URL
    2. Navigate directly to S4A song page
    3. Scrape stream data
    4. Save to database
```

**Pros**:
- Direct navigation (no searching)
- Works even if not in roster
- Simpler logic

**Cons**:
- More page loads (251 songs vs ~100 artists)
- Slower (more navigation)
- Doesn't leverage roster efficiency

---

## 🎯 **Recommended Hybrid Approach**

### **Phase 1: Use Existing URLs (Quick Win)**
- 80% of campaigns have Spotify URLs
- Use existing scraper to scrape by URL
- Fast, proven, works today

### **Phase 2: Roster for Missing Data**
- For campaigns without URLs
- For discovering additional songs
- For validating existing data

---

## 📋 **Corrected Implementation Plan**

### **Option 1: Smart Hybrid (Recommended)**

**File**: `run_smart_scraper.py`

```python
#!/usr/bin/env python3
"""
Smart Campaign Scraper - Uses URLs when available, Roster as fallback
"""
import asyncio
from pathlib import Path
import csv

async def main():
    # Read CSV
    with open('Spotify Playlisting-Active Campaigns.csv', encoding='utf-8-sig') as f:
        campaigns = list(csv.DictReader(f))
    
    active = [c for c in campaigns if c['Status'] == 'Active']
    
    print(f"📊 Found {len(active)} active campaigns")
    
    # Group campaigns
    with_url = [c for c in active if c.get('URL') and 'spotify.com/track' in c['URL']]
    with_sfa = [c for c in active if c.get('SFA')]
    without_url = [c for c in active if not c.get('URL') and not c.get('SFA')]
    
    print(f"✅ {len(with_url)} with Spotify track URL")
    print(f"✅ {len(with_sfa)} with SFA link")
    print(f"⚠️  {len(without_url)} without any URL")
    
    async with SpotifyScraper() as scraper:
        # Phase 1: Scrape by direct URL (existing scraper)
        print("\n🎵 Phase 1: Scraping campaigns with URLs...")
        for campaign in with_url:
            # Convert Spotify track URL to SFA URL
            track_id = extract_track_id(campaign['URL'])
            sfa_url = f"https://artists.spotify.com/c/artist/.../song/{track_id}/stats"
            
            # Scrape using existing logic
            data = await scraper.scrape_song_data(sfa_url)
            # Save...
        
        # Phase 2: Scrape by SFA link (existing scraper)
        print("\n🔗 Phase 2: Scraping campaigns with SFA links...")
        for campaign in with_sfa:
            data = await scraper.scrape_song_data(campaign['SFA'])
            # Save...
        
        # Phase 3: Use Roster for missing campaigns
        print("\n📋 Phase 3: Using Roster for campaigns without URLs...")
        
        # Group by client
        clients = {}
        for campaign in without_url:
            client = campaign['Client']
            if client not in clients:
                clients[client] = []
            clients[client].append(campaign)
        
        for client, client_campaigns in clients.items():
            print(f"\n🎤 Finding songs for: {client}")
            
            # Go to roster, find artist, scrape songs
            roster_songs = await scraper.get_roster_songs(client)
            
            for campaign in client_campaigns:
                # Match campaign to roster song
                match = find_match(campaign['Campaign'], roster_songs)
                if match:
                    # Scrape it
                    data = await scraper.scrape_song_data(match['url'])
                    # Save...
```

---

## 📊 **What We'll Actually Scrape**

```
TOTAL: 251 campaigns

PHASE 1: Direct Spotify URLs
  → ~180-200 campaigns (fast, existing scraper)
  → Est. time: 15-20 minutes

PHASE 2: SFA Links  
  → ~20-30 campaigns (fast, existing scraper)
  → Est. time: 2-3 minutes

PHASE 3: Roster Fallback
  → ~20-40 campaigns (new roster logic)
  → Est. time: 5-10 minutes

TOTAL TIME: ~25-35 minutes
```

---

## 🚀 **Next Steps**

1. **✅ Use existing scraper for campaigns with URLs/SFA links** (covers 80%+)
2. **Build Roster scraper for remaining 20%** (optional, for complete coverage)
3. **Update database with scraped data**
4. **Verify in UI**

---

## 💡 **Key Insights**

### **We DON'T need a full Roster scraper!**

Most campaigns already have:
- Spotify track URLs ✅
- SFA links ✅

We can:
1. Convert Spotify URLs to track IDs
2. Construct SFA URLs from track IDs
3. Use existing scraper to get all data

**Roster scraper is only needed for the ~10-20% without URLs!**

---

## 🎯 **Simplified Implementation**

### **Step 1: Extract Track IDs from URLs**
```python
def extract_track_id(spotify_url):
    # "https://open.spotify.com/track/59BZiCQsoWetSd9qQ6uWhL"
    # → "59BZiCQsoWetSd9qQ6uWhL"
    match = re.search(r'/track/([a-zA-Z0-9]+)', spotify_url)
    return match.group(1) if match else None
```

### **Step 2: Use Existing Scraper**
```python
# Already built and tested!
async with SpotifyArtistsScraper() as scraper:
    for campaign in campaigns:
        if campaign.get('SFA'):
            data = await scraper.scrape_song_data(campaign['SFA'])
        elif campaign.get('URL'):
            track_id = extract_track_id(campaign['URL'])
            # Note: We need the full SFA URL, not just track ID
            # We'll need to search for it OR build from track ID if we know the artist ID
```

### **Step 3: Import to Database**
```javascript
// Use existing import script
node scripts/import-roster-data.js
```

---

## 🤔 **The Real Question**

**Do we need to scrape the Roster page at all?**

**NO** - if we can:
1. Extract track IDs from Spotify URLs
2. Already have SFA links in the CSV

**YES** - only if:
1. We want to discover songs NOT in campaigns
2. We need to find SFA links for campaigns without URLs
3. We want to validate track IDs

---

## ✅ **Recommended Action**

### **STEP 1: Analyze URL Coverage** (5 minutes)
```python
# How many campaigns have usable URLs?
# Do we have enough to skip Roster scraping?
```

### **STEP 2: Use Existing Scraper** (20 minutes)
```python
# For all campaigns with SFA or Spotify URLs
# This covers 80-90% of campaigns
```

### **STEP 3: Manual Roster Lookup** (Optional)
```
# For the remaining 10-20% without URLs
# Could be done manually or with small roster script
```

---

**Let me analyze URL coverage and give you a final recommendation!**

