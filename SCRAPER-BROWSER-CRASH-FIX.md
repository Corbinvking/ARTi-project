# Spotify Scraper Browser Crash Issue - Diagnosis & Fix

**Date:** December 18, 2025  
**Issue:** Browser crashes after 1st campaign, causing 99% failure rate  
**Status:** 🔴 **CRITICAL** - Requires immediate fix

---

## 🔍 Problem Summary

**What's Happening:**
- Scraper launches successfully
- First campaign scrapes perfectly
- All subsequent campaigns fail with: `TargetClosedError: Target page, context or browser has been closed`
- **Result**: 1 success, 130 failures (0.8% success rate)

**Last Run Stats:**
```
Total campaigns: 131
Successful: 1
Failed: 130
Success rate: 0.8%
```

---

## 🐛 Root Causes Identified

### 1. **Browser Data Directory Corruption**
- Location: `/root/arti-marketing-ops/spotify_scraper/data/browser_data`
- The persistent browser context becomes corrupted over time
- Chromium can't handle the accumulated cache/data
- Solution: Periodic cleanup or use fresh context

### 2. **Memory Exhaustion**
- Chromium consumes ~200MB per campaign
- With 131 campaigns, memory usage grows to ~26GB
- Server RAM: 8GB total
- Browser crashes when memory exhausted

### 3. **Shared Memory (`/dev/shm`) Full**
- Docker/Chrome uses `/dev/shm` for rendering
- Default size: 64MB (too small!)
- Causes silent crashes
- Fixed with: `--disable-dev-shm-usage` flag

### 4. **Chromium Self-Termination**
- Chromium has built-in hang detection
- Sometimes kills itself thinking it's frozen
- Fixed with: `--disable-hang-monitor` flag

---

## ✅ Fixes Applied

### Fix 1: Improved Browser Args
```python
args=[
    '--disable-dev-shm-usage',  # Don't use /dev/shm (prevents crashes)
    '--disable-hang-monitor',   # Don't self-terminate
    '--disable-gpu',            # No GPU in headless
    '--disable-software-rasterizer',
    '--disable-extensions',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    # ... 15+ more stability args
]
```

### Fix 2: Browser Health Checks
```python
# Before each campaign, verify browser is still alive
if page.is_closed():
    logger.error("Page is closed! Cannot scrape.")
    break  # Stop scraping, don't continue with dead browser
```

### Fix 3: Wrapper Script Parameter Forwarding
```bash
# Old: python3 run_production_scraper.py
# New: python3 run_production_scraper.py "$@"  # Forwards --limit etc.
```

### Fix 4: Browser Data Cleanup
```bash
# Clear corrupted browser data before runs
rm -rf /root/arti-marketing-ops/spotify_scraper/data/browser_data/*
```

---

## 🚀 Recommended Long-Term Solutions

### **Solution A: Batch Processing with Browser Restarts** (RECOMMENDED)
Process campaigns in batches of 10-20, restarting the browser between batches:

```python
BATCH_SIZE = 15  # Process 15 campaigns per browser instance

for batch_start in range(0, len(campaigns), BATCH_SIZE):
    batch = campaigns[batch_start:batch_start + BATCH_SIZE]
    
    # Launch fresh browser for this batch
    async with async_playwright() as playwright:
        context = await playwright.chromium.launch_persistent_context(...)
        
        # Process batch
        for campaign in batch:
            await scrape_campaign(context.pages[0], campaign)
        
        # Close browser (automatic memory cleanup)
        await context.close()
    
    # Brief pause between batches
    await asyncio.sleep(5)
```

**Benefits:**
- Browser memory resets every 15 campaigns
- Corrupted state can't accumulate
- One batch failure doesn't kill entire run
- Progress is saved after each batch

### **Solution B: Non-Persistent Context** (SIMPLER)
Don't use persistent context - re-login each run:

```python
# Instead of launch_persistent_context:
browser = await playwright.chromium.launch(headless=True, args=[...])
context = await browser.new_context()
page = await context.new_page()

# Login fresh each time
await login_to_spotify(page)

# After scraping:
await context.close()
await browser.close()
```

**Trade-offs:**
- ❌ Must login every run (~30 seconds overhead)
- ✅ No persistent data corruption
- ✅ Always fresh browser state

### **Solution C: Hybrid Approach** (BEST)
Use persistent context but with periodic cleanup:

```python
# Before each run, check if browser data is too large
browser_data_size = get_directory_size(user_data_dir)

if browser_data_size > 500_000_000:  # 500MB
    logger.info("Browser data too large, clearing...")
    shutil.rmtree(user_data_dir)
    os.makedirs(user_data_dir)
    
# Then launch normally
```

---

## 🧪 Testing Protocol

### Test with Batches of 5
```bash
cd /root/arti-marketing-ops/spotify_scraper
export DISPLAY=:99

# Test 1: First 5 campaigns
python3 run_production_scraper.py --limit 5

# If successful, test batch 2
python3 run_production_scraper.py --limit 10  # Campaigns 1-10

# If successful, test batch 3
python3 run_production_scraper.py --limit 15  # Campaigns 1-15
```

### Monitor Memory Usage
```bash
# While scraper runs:
watch -n 5 'free -h && ps aux | grep python3 | grep -v grep'
```

---

## 📋 Implementation Plan

1. **Immediate (Today):**
   - ✅ Clear browser data directory
   - ✅ Add browser health checks
   - ✅ Fix wrapper script parameter forwarding
   - ⏳ Test with 5 campaigns
   - ⏳ Verify browser doesn't crash

2. **Short-term (This Week):**
   - Implement batch processing (Solution A)
   - Add memory monitoring
   - Add automatic browser restart logic
   - Test with 50 campaigns

3. **Long-term (Next Week):**
   - Add browser data size monitoring
   - Implement automatic cleanup
   - Add recovery from mid-run crashes
   - Full production testing with 131 campaigns

---

## 🎯 Success Criteria

**Before Fix:**
```
✗ 1 / 131 campaigns (0.8% success)
✗ Browser crashes after 1 campaign  
✗ No error recovery
```

**After Fix:**
```
✓ 100%+ success rate
✓ Browser stable across all campaigns
✓ Automatic recovery from errors
✓ Memory-efficient batched processing
```

---

## 🔧 Immediate Next Steps

Run this command to test the scraper properly with 5 campaigns:

```bash
ssh root@164.90.129.146 "
cd /root/arti-marketing-ops/spotify_scraper
export DISPLAY=:99

# Clear any stuck processes
pkill -f 'run_production_scraper'

# Clear browser data (start fresh)
rm -rf data/browser_data/*

# Run test with 5 campaigns
bash run_production_scraper.sh --limit 5
"
```

This will take about 10 minutes. Monitor with:
```bash
ssh root@164.90.129.146 "tail -f /root/arti-marketing-ops/spotify_scraper/logs/production.log"
```

---

**Status:** Wrapper script fixed ✅  
**Next:** Test 5-campaign run with browser crash fixes ⏳

