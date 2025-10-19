# 🎯 Plan to Populate ALL Campaign Data

## Current Status

- **548 Active Campaigns**
- **148 (27%) have playlist data** ✅
- **400 (73%) missing playlist data** ❌

### Breakdown:
- **12 songs** have valid SFA links
  - 11 already scraped ✅
  - 1 needs scraping
- **~50 songs** have SFA = "checked" (not actual URLs)
- **~235 campaigns** have NO songs at all (duplicates or need data entry)
- **~150 campaigns** have songs but no SFA/URL data

---

## 🔍 Root Causes

### 1. **"checked" Instead of URLs**
Many campaigns show `sfa = "checked"` instead of actual Spotify for Artists URLs.

**Example:**
```
Andres aka DRE - MI PADRE
SFA: "checked"  ❌  Should be: https://artists.spotify.com/c/artist/.../song/.../stats
```

### 2. **Missing Track URLs**
Many campaigns don't have Spotify track URLs, which we need to construct SFA links.

### 3. **Duplicate Campaigns**
235 campaigns show "0 songs" - these are likely duplicates from CSV import.

### 4. **Historical Playlist Data in CSV**
The CSV has a column called `historical_playlists` that we haven't fully utilized yet.

---

## 🚀 Solution Strategy

### Phase 1: Extract Playlist Data from CSV Historical Column ✅

**Status:** Already handled by `create-playlists-from-csv-data.js`

This gave us the 148 campaigns with data.

---

### Phase 2: Fix "checked" SFA Links

**Problem:** Many songs have `sfa = "checked"` instead of actual URLs.

**Solution:** We need to either:
1. Get actual SFA links from the user
2. Construct them from track URLs if available
3. Or mark these for manual data entry

**Script to create:**
```bash
scripts/fix-checked-sfa-links.js
```

**What it does:**
- Find all songs with `sfa = "checked"`
- If they have a `url` (Spotify track URL), try to scrape/construct SFA link
- Export list for manual review

---

### Phase 3: Scrape Songs with Valid SFA Links

**Status:** Ready to go!

We have 1 new song to scrape. Run:
```bash
# Add to sfa-links-simple.txt
node scripts/scrape-and-import-s4a-list.js
```

---

### Phase 4: Handle Campaigns Without Songs

**Problem:** 235 campaigns show "0 songs" (likely duplicates).

**Solution:**
```bash
scripts/cleanup-empty-campaigns.js
```

**What it does:**
- Find campaign_groups with no spotify_campaigns
- Check if they're duplicates
- Either link them to existing campaigns or mark for deletion

---

### Phase 5: Extract More Data from CSV

**The CSV has columns we haven't fully utilized:**

1. **`Playlist (from Vendors)`** - Contains playlist names
2. **`Current Weekly`** - Stream counts
3. **`Current Daily`** - Stream counts  
4. **`Vendor`** - Which vendor manages the campaign

**Script to create:**
```bash
scripts/enhance-from-csv-historical-data.js
```

**What it does:**
- Re-parse CSV for campaigns missing playlist data
- Extract playlist names from "Playlist (from Vendors)" column
- Create `campaign_playlists` records even without scraping
- Link to correct vendors

---

### Phase 6: Bulk Scrape Remaining Campaigns

**For campaigns with Spotify URLs but no SFA:**

1. Use Spotify API to get track details
2. Construct SFA links programmatically
3. Run bulk scraper

---

## 📊 Expected Results

| Phase | Before | After | Improvement |
|-------|--------|-------|-------------|
| Phase 1 (Done) | 0% | 27% | +148 campaigns |
| Phase 2 (Fix checked) | 27% | 30% | +~15 campaigns |
| Phase 3 (Scrape new) | 30% | 30% | +1 campaign |
| Phase 4 (Cleanup) | 30% | 40% | -235 empty campaigns |
| Phase 5 (CSV extract) | 40% | 60% | +~100 campaigns |
| Phase 6 (Bulk scrape) | 60% | 80%+ | +~100 campaigns |

---

## 🎯 Priority Actions (Right Now)

### Action 1: Re-extract Playlist Data from CSV More Thoroughly

The CSV has rich data we might have missed. Let's check:

```bash
node scripts/analyze-csv-playlist-data.js
```

### Action 2: Create Script to Parse "Playlist (from Vendors)" Column

Many campaigns have playlist NAMES in the CSV but we haven't created records for them.

### Action 3: Link More Campaigns to Vendors

Many campaigns don't have `vendor_id` set, so playlists can't be shown properly.

---

## 🔧 Implementation Order

1. **✅ DONE:** Analyze what's missing
2. **🔄 NEXT:** Extract more from CSV "Playlist (from Vendors)" column
3. **⏳ THEN:** Fix "checked" SFA links
4. **⏳ THEN:** Clean up duplicate/empty campaigns
5. **⏳ THEN:** Bulk scrape remaining

---

## 💡 Quick Win: Extract From CSV Vendors Column

**Many campaigns have this data in CSV:**

```csv
Campaign: "Kitt Wakeley"
Playlist (from Vendors): "Golden Nugget"
```

But the `campaign_playlists` might not be created yet!

**Let's create a script to:**
1. Read CSV again
2. For each campaign WITHOUT playlist data
3. Check if "Playlist (from Vendors)" has data
4. Create `campaign_playlists` records with vendor linkage
5. Even without stream counts, having the STRUCTURE is valuable

---

## 📝 Next Script to Create

```javascript
// scripts/create-playlists-from-csv-vendors-column.js

// For each campaign in CSV:
// 1. Check if it has playlists in DB
// 2. If not, check "Playlist (from Vendors)" column
// 3. Create campaign_playlists with vendor linkage
// 4. Use "Current Weekly" and "Current Daily" for stream counts
```

---

## 🎉 Goal

**Get from 27% to 80%+ campaigns with playlist data!**

This will make EVERY campaign look like "Segan - DNBMF" with proper structure.

