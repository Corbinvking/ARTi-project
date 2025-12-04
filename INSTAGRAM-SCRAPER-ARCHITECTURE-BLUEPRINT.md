# Instagram Scraper Architecture Blueprint

> **Purpose:** This document serves as a complete reference for building a production-grade Instagram scraper with the same architecture as our Spotify scraper.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     PRODUCTION SERVER                        │
│                                                              │
│  ┌────────────────┐      ┌──────────────────┐              │
│  │  Cron Job      │─────>│  Wrapper Script  │              │
│  │  (Daily 2AM)   │      │  (.sh)           │              │
│  └────────────────┘      └──────────────────┘              │
│                                 │                            │
│                                 v                            │
│                          ┌──────────────────┐               │
│                          │  Xvfb Display    │               │
│                          │  (:99 virtual)   │               │
│                          └──────────────────┘               │
│                                 │                            │
│                                 v                            │
│                    ┌─────────────────────────┐              │
│                    │  Python Scraper         │              │
│                    │  (Playwright)           │              │
│                    └─────────────────────────┘              │
│                                 │                            │
│                    ┌────────────┴────────────┐              │
│                    │                         │              │
│                    v                         v              │
│          ┌──────────────────┐      ┌─────────────────┐     │
│          │ Persistent       │      │  Supabase DB    │     │
│          │ Browser Context  │      │  (via API)      │     │
│          │ (saved session)  │      └─────────────────┘     │
│          └──────────────────┘                               │
│                    │                                         │
│                    v                                         │
│          ┌──────────────────┐                               │
│          │  VNC Server      │ <──── Debug Access            │
│          │  (Port 5900)     │       (Manual Login)          │
│          └──────────────────┘                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema Design

### Required Tables

#### 1. **`instagram_campaigns`** (Main Campaign Data)
Stores the active campaigns that need to be scraped.

```sql
CREATE TABLE instagram_campaigns (
  id SERIAL PRIMARY KEY,
  campaign_name TEXT NOT NULL,
  client_id INTEGER REFERENCES clients(id),
  instagram_url TEXT,  -- The URL to scrape (e.g., Instagram post/reel)
  username TEXT,  -- Instagram username/handle
  followers_count INTEGER,
  likes_count INTEGER,
  comments_count INTEGER,
  views_count INTEGER,
  engagement_rate DECIMAL(5,2),
  last_scraped_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for scraper queries
CREATE INDEX idx_instagram_active_campaigns ON instagram_campaigns(is_active) WHERE is_active = true AND instagram_url IS NOT NULL;
```

#### 2. **`instagram_scraped_data`** (Historical Raw Data)
Stores every scrape result with full raw JSON for historical tracking.

```sql
CREATE TABLE instagram_scraped_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id INTEGER REFERENCES instagram_campaigns(id) ON DELETE CASCADE,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB NOT NULL,  -- Full scrape result
  followers_count INTEGER,
  likes_count INTEGER,
  comments_count INTEGER,
  views_count INTEGER,
  engagement_rate DECIMAL(5,2),
  scrape_status TEXT,  -- 'success', 'failed', 'partial'
  error_message TEXT
);

-- Index for historical queries
CREATE INDEX idx_instagram_scraped_campaign ON instagram_scraped_data(campaign_id, scraped_at DESC);
CREATE INDEX idx_instagram_scraped_date ON instagram_scraped_data(scraped_at DESC);
```

#### 3. **`instagram_posts`** (Individual Post/Reel Data)
If campaigns have multiple posts, store them here.

```sql
CREATE TABLE instagram_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id INTEGER REFERENCES instagram_campaigns(id) ON DELETE CASCADE,
  post_url TEXT NOT NULL UNIQUE,
  post_type TEXT,  -- 'photo', 'video', 'reel', 'carousel'
  likes_count INTEGER,
  comments_count INTEGER,
  views_count INTEGER,
  posted_at TIMESTAMPTZ,
  caption TEXT,
  hashtags TEXT[],
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_instagram_posts_campaign ON instagram_posts(campaign_id);
```

---

## 🐍 Python Scraper Implementation

### Directory Structure

```
instagram_scraper/
├── run_production_scraper.py      # Main scraper
├── run_production_scraper.sh      # Wrapper script for cron
├── manual_browser_login.py        # VNC login helper
├── requirements.txt               # Python dependencies
├── .env                          # Environment variables
└── data/
    └── browser_data/             # Persistent browser session
        ├── cookies.json
        └── local_storage/
```

### Core Files

#### **requirements.txt**

```txt
playwright==1.40.0
python-dotenv==1.0.0
supabase==2.0.0
```

#### **.env**

```bash
# Supabase Connection
SUPABASE_URL=https://api.artistinfluence.com
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Instagram Credentials (if needed for login)
INSTAGRAM_USERNAME=your_instagram_account
INSTAGRAM_PASSWORD=your_secure_password

# Browser Settings
USER_DATA_DIR=/root/arti-marketing-ops/instagram_scraper/data/browser_data
DISPLAY=:99

# Scraper Settings
RATE_LIMIT_DELAY=2000  # ms between requests
MAX_RETRIES=3
TIMEOUT=30000  # ms
```

#### **run_production_scraper.py**

```python
#!/usr/bin/env python3
"""
Instagram Production Scraper
Scrapes Instagram metrics for active campaigns with persistent sessions.
"""

import asyncio
import os
import sys
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from playwright.async_api import async_playwright, Page, BrowserContext
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
USER_DATA_DIR = os.getenv('USER_DATA_DIR', './data/browser_data')
RATE_LIMIT_DELAY = int(os.getenv('RATE_LIMIT_DELAY', '2000'))
MAX_RETRIES = int(os.getenv('MAX_RETRIES', '3'))
TIMEOUT = int(os.getenv('TIMEOUT', '30000'))

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def log(message: str, level: str = "INFO"):
    """Log with timestamp"""
    timestamp = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')
    print(f"[{timestamp}] [{level}] {message}", flush=True)


async def check_if_logged_in(page: Page) -> bool:
    """Check if we're logged into Instagram"""
    try:
        await page.goto('https://www.instagram.com/', timeout=TIMEOUT)
        await page.wait_for_load_state('networkidle')
        
        # Check for logged-in indicators
        # Adjust these selectors based on Instagram's actual DOM
        is_logged_in = (
            await page.locator('svg[aria-label="Home"]').count() > 0 or
            await page.locator('a[href="/direct/inbox/"]').count() > 0
        )
        
        if is_logged_in:
            log("✅ Already logged in to Instagram")
            return True
        else:
            log("❌ Not logged in to Instagram")
            return False
    except Exception as e:
        log(f"Error checking login status: {e}", "ERROR")
        return False


async def login_to_instagram(page: Page, force_fresh: bool = False) -> bool:
    """
    Login to Instagram
    If force_fresh=True, will attempt automated login
    Otherwise, expects manual login via VNC
    """
    try:
        if not force_fresh:
            log("⚠️  Manual login required. Use VNC to complete login.", "WARNING")
            return False
        
        # Automated login (if credentials available)
        username = os.getenv('INSTAGRAM_USERNAME')
        password = os.getenv('INSTAGRAM_PASSWORD')
        
        if not username or not password:
            log("No Instagram credentials found. Manual login required.", "ERROR")
            return False
        
        log("Attempting automated login...")
        await page.goto('https://www.instagram.com/accounts/login/', timeout=TIMEOUT)
        await page.wait_for_load_state('networkidle')
        
        # Fill login form (adjust selectors as needed)
        await page.fill('input[name="username"]', username)
        await page.fill('input[name="password"]', password)
        await page.click('button[type="submit"]')
        
        # Wait for navigation
        await page.wait_for_url('https://www.instagram.com/', timeout=TIMEOUT)
        
        # Check if logged in
        if await check_if_logged_in(page):
            log("✅ Automated login successful")
            return True
        else:
            log("❌ Automated login failed", "ERROR")
            return False
            
    except Exception as e:
        log(f"Login error: {e}", "ERROR")
        return False


async def scrape_instagram_post(page: Page, post_url: str) -> Dict[str, Any]:
    """
    Scrape a single Instagram post/reel
    Returns metrics as a dictionary
    """
    try:
        log(f"Navigating to: {post_url}")
        await page.goto(post_url, timeout=TIMEOUT, wait_until='networkidle')
        
        # Wait for content to load
        await asyncio.sleep(2)
        
        # Extract metrics (adjust selectors based on Instagram's DOM)
        # These are example selectors - you'll need to inspect Instagram's HTML
        
        likes_text = await page.locator('button:has-text("like")').first.text_content() or "0"
        comments_text = await page.locator('span:has-text("comment")').first.text_content() or "0"
        
        # Parse numbers (handle "1.2M", "523K", etc.)
        likes_count = parse_instagram_number(likes_text)
        comments_count = parse_instagram_number(comments_text)
        
        # Get views for videos/reels
        views_count = 0
        views_element = page.locator('span:has-text("views")').first
        if await views_element.count() > 0:
            views_text = await views_element.text_content() or "0"
            views_count = parse_instagram_number(views_text)
        
        # Get post caption
        caption_element = page.locator('h1').first
        caption = await caption_element.text_content() if await caption_element.count() > 0 else ""
        
        # Extract hashtags
        hashtags = []
        if caption:
            hashtags = [word for word in caption.split() if word.startswith('#')]
        
        result = {
            'likes_count': likes_count,
            'comments_count': comments_count,
            'views_count': views_count,
            'caption': caption,
            'hashtags': hashtags,
            'scraped_at': datetime.now(timezone.utc).isoformat(),
            'url': post_url,
            'status': 'success'
        }
        
        log(f"✅ Scraped: {likes_count} likes, {comments_count} comments, {views_count} views")
        return result
        
    except Exception as e:
        log(f"Error scraping post: {e}", "ERROR")
        return {
            'url': post_url,
            'status': 'failed',
            'error': str(e),
            'scraped_at': datetime.now(timezone.utc).isoformat()
        }


def parse_instagram_number(text: str) -> int:
    """Parse Instagram formatted numbers like '1.2M', '523K', '42'"""
    try:
        text = text.strip().replace(',', '')
        
        if 'M' in text:
            return int(float(text.replace('M', '')) * 1_000_000)
        elif 'K' in text:
            return int(float(text.replace('K', '')) * 1_000)
        else:
            # Extract just the number
            import re
            numbers = re.findall(r'\d+', text)
            return int(numbers[0]) if numbers else 0
    except:
        return 0


async def update_campaign_in_db(campaign_id: int, scraped_data: Dict[str, Any]):
    """Update instagram_campaigns table with latest scraped data"""
    try:
        update_data = {
            'likes_count': scraped_data.get('likes_count', 0),
            'comments_count': scraped_data.get('comments_count', 0),
            'views_count': scraped_data.get('views_count', 0),
            'last_scraped_at': scraped_data.get('scraped_at'),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        # Calculate engagement rate if followers count is available
        campaign = supabase.table('instagram_campaigns').select('followers_count').eq('id', campaign_id).single().execute()
        if campaign.data and campaign.data.get('followers_count'):
            followers = campaign.data['followers_count']
            total_engagement = scraped_data.get('likes_count', 0) + scraped_data.get('comments_count', 0)
            update_data['engagement_rate'] = round((total_engagement / followers) * 100, 2) if followers > 0 else 0
        
        supabase.table('instagram_campaigns').update(update_data).eq('id', campaign_id).execute()
        log(f"✅ Updated campaign {campaign_id} in database")
        
    except Exception as e:
        log(f"Error updating campaign {campaign_id}: {e}", "ERROR")


async def save_to_scraped_data_table(campaign_id: int, scraped_data: Dict[str, Any]):
    """Save raw scraped data to instagram_scraped_data for historical tracking"""
    try:
        record = {
            'campaign_id': campaign_id,
            'scraped_at': scraped_data.get('scraped_at'),
            'raw_data': scraped_data,
            'likes_count': scraped_data.get('likes_count', 0),
            'comments_count': scraped_data.get('comments_count', 0),
            'views_count': scraped_data.get('views_count', 0),
            'scrape_status': scraped_data.get('status', 'success'),
            'error_message': scraped_data.get('error')
        }
        
        supabase.table('instagram_scraped_data').insert(record).execute()
        log(f"✅ Saved historical data for campaign {campaign_id}")
        
    except Exception as e:
        log(f"Error saving historical data for campaign {campaign_id}: {e}", "ERROR")


async def main():
    """Main scraper function"""
    log("=" * 60)
    log("Instagram Production Scraper Starting")
    log("=" * 60)
    
    # Ensure user data directory exists
    Path(USER_DATA_DIR).mkdir(parents=True, exist_ok=True)
    
    # Fetch active campaigns from database
    try:
        response = supabase.table('instagram_campaigns')\
            .select('*')\
            .eq('is_active', True)\
            .not_.is_('instagram_url', 'null')\
            .execute()
        
        campaigns = response.data
        log(f"Found {len(campaigns)} active campaigns to scrape")
        
        if not campaigns:
            log("No campaigns to scrape. Exiting.")
            return
            
    except Exception as e:
        log(f"Error fetching campaigns: {e}", "ERROR")
        return
    
    # Launch Playwright with persistent context
    playwright = None
    context = None
    
    try:
        playwright = await async_playwright().start()
        
        log(f"Launching browser with persistent context: {USER_DATA_DIR}")
        context = await playwright.chromium.launch_persistent_context(
            user_data_dir=USER_DATA_DIR,
            headless=False,  # Must be False for Instagram's React app
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox'
            ],
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        
        # Get or create page
        if context.pages:
            page = context.pages[0]
        else:
            page = await context.new_page()
        
        # Check if logged in
        is_logged_in = await check_if_logged_in(page)
        
        if not is_logged_in:
            log("❌ Not logged in. Please use manual_browser_login.py via VNC.", "ERROR")
            log("Exiting scraper. Run again after manual login.")
            return
        
        # Scrape each campaign
        success_count = 0
        fail_count = 0
        
        for idx, campaign in enumerate(campaigns, 1):
            campaign_id = campaign['id']
            campaign_name = campaign.get('campaign_name', f'Campaign {campaign_id}')
            instagram_url = campaign['instagram_url']
            
            log(f"\n[{idx}/{len(campaigns)}] Scraping: {campaign_name}")
            log(f"URL: {instagram_url}")
            
            try:
                # Scrape the post
                scraped_data = await scrape_instagram_post(page, instagram_url)
                
                if scraped_data.get('status') == 'success':
                    # Update main campaign table
                    await update_campaign_in_db(campaign_id, scraped_data)
                    
                    # Save to historical table
                    await save_to_scraped_data_table(campaign_id, scraped_data)
                    
                    success_count += 1
                else:
                    fail_count += 1
                    log(f"❌ Failed to scrape campaign {campaign_id}", "ERROR")
                
                # Rate limiting
                await asyncio.sleep(RATE_LIMIT_DELAY / 1000)
                
            except Exception as e:
                log(f"Error processing campaign {campaign_id}: {e}", "ERROR")
                fail_count += 1
                
                # Save failed attempt to historical table
                failed_data = {
                    'url': instagram_url,
                    'status': 'failed',
                    'error': str(e),
                    'scraped_at': datetime.now(timezone.utc).isoformat()
                }
                await save_to_scraped_data_table(campaign_id, failed_data)
        
        # Summary
        log("\n" + "=" * 60)
        log(f"Scraping Complete!")
        log(f"✅ Successful: {success_count}")
        log(f"❌ Failed: {fail_count}")
        log(f"📊 Total: {len(campaigns)}")
        log("=" * 60)
        
    except Exception as e:
        log(f"Fatal error: {e}", "ERROR")
        raise
        
    finally:
        if context:
            await context.close()
        if playwright:
            await playwright.stop()


if __name__ == '__main__':
    asyncio.run(main())
```

#### **run_production_scraper.sh**

```bash
#!/bin/bash
# Wrapper script for Instagram scraper to be called by cron

set -e

# Navigate to scraper directory
cd /root/arti-marketing-ops/instagram_scraper

# Ensure Xvfb is running (for GUI browser)
if ! pgrep -x "Xvfb" > /dev/null; then
    echo "Starting Xvfb..."
    Xvfb :99 -screen 0 1920x1080x24 &
    sleep 2
fi

# Set display for GUI browser
export DISPLAY=:99

# Load environment variables
source .env

# Run the scraper
echo "Starting Instagram scraper..."
python3 run_production_scraper.py

echo "Instagram scraper completed."
```

#### **manual_browser_login.py**

```python
#!/usr/bin/env python3
"""
Manual Instagram Login Helper
Opens a browser in VNC for manual login to establish persistent session.
"""

import asyncio
import os
from playwright.async_api import async_playwright
from dotenv import load_dotenv

load_dotenv()

USER_DATA_DIR = os.getenv('USER_DATA_DIR', './data/browser_data')

async def main():
    os.environ['DISPLAY'] = ':99'
    
    print("\n" + "="*60)
    print("Instagram Manual Login Helper")
    print("="*60)
    print(f"\nBrowser data will be saved to: {USER_DATA_DIR}")
    print("\n📺 Opening browser in VNC...")
    print("🔐 Please log in to Instagram manually")
    print("⏳ Browser will stay open for 15 minutes")
    print("❌ Press Ctrl+C when done\n")
    
    playwright = await async_playwright().start()
    
    context = await playwright.chromium.launch_persistent_context(
        user_data_dir=USER_DATA_DIR,
        headless=False,
        slow_mo=1000,
        args=['--no-sandbox', '--disable-dev-shm-usage']
    )
    
    if context.pages:
        page = context.pages[0]
    else:
        page = await context.new_page()
    
    await page.goto('https://www.instagram.com/', timeout=60000)
    
    print('✅ Browser opened! Log in now via VNC.\n')
    
    try:
        await asyncio.sleep(900)  # 15 minutes
    except KeyboardInterrupt:
        print('\n✅ Closing browser...')
    
    await context.close()
    await playwright.stop()
    
    print('✅ Session saved! You can now run the production scraper.')

if __name__ == '__main__':
    asyncio.run(main())
```

---

## 🕐 Cron Job Setup

### 1. Install Cron (if not already installed)

```bash
# On Ubuntu/Debian
apt-get update && apt-get install -y cron

# Start cron service
service cron start
```

### 2. Make Scripts Executable

```bash
cd /root/arti-marketing-ops/instagram_scraper
chmod +x run_production_scraper.sh
chmod +x run_production_scraper.py
chmod +x manual_browser_login.py
```

### 3. Add Cron Job

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 3 AM UTC)
0 3 * * * /root/arti-marketing-ops/instagram_scraper/run_production_scraper.sh >> /var/log/instagram_scraper.log 2>&1

# Save and exit
```

### 4. Verify Cron Job

```bash
# List current cron jobs
crontab -l

# Check cron service status
service cron status

# View scraper logs
tail -f /var/log/instagram_scraper.log
```

---

## 🖥️ Xvfb (Virtual Display) Setup

Instagram's web app (like Spotify's) uses React and requires a GUI browser to render properly. On a headless server, we use Xvfb.

### Install Xvfb

```bash
apt-get update
apt-get install -y xvfb x11vnc
```

### Start Xvfb Automatically

Add to `/etc/rc.local` or create a systemd service:

```bash
# /etc/systemd/system/xvfb.service
[Unit]
Description=X Virtual Frame Buffer Service
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/Xvfb :99 -screen 0 1920x1080x24
Restart=always
User=root

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
systemctl daemon-reload
systemctl enable xvfb
systemctl start xvfb
```

### Verify Xvfb

```bash
ps aux | grep Xvfb
echo $DISPLAY  # Should show :99
```

---

## 🔍 VNC Access for Debugging

VNC allows you to visually see and interact with the browser for manual login or debugging.

### 1. Install VNC Server

```bash
apt-get install -y x11vnc
```

### 2. Start VNC Server

```bash
# Start VNC on display :99 (where Xvfb runs)
x11vnc -display :99 -forever -shared -bg -rfbport 5900

# Or with password protection
x11vnc -display :99 -forever -shared -bg -rfbport 5900 -passwd your_password
```

### 3. Connect via VNC Client

- **Download:** TigerVNC, RealVNC, or any VNC viewer
- **Connect to:** `your_server_ip:5900`
- **Password:** (if set above)

### 4. Run Manual Login

```bash
cd /root/arti-marketing-ops/instagram_scraper
python3 manual_browser_login.py
```

You'll see the browser open in VNC. Log in to Instagram, solve any CAPTCHAs, and the session will be saved.

---

## 🔐 Persistent Browser Context

The key to avoiding repeated logins and CAPTCHAs is reusing browser sessions.

### How It Works

1. **First Run:** Use `manual_browser_login.py` to log in once
2. **Saved Data:** Cookies, local storage, and session tokens saved to `USER_DATA_DIR`
3. **Subsequent Runs:** Scraper uses `launch_persistent_context()` with same directory
4. **Result:** Already logged in, no CAPTCHA needed

### Important Notes

- Never delete `USER_DATA_DIR` once logged in
- If session expires, use VNC to re-login manually
- Back up `USER_DATA_DIR` for disaster recovery

---

## 📡 Database Communication

### Supabase Client Setup

```python
from supabase import create_client, Client

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
```

### Common Queries

#### Fetch Active Campaigns

```python
response = supabase.table('instagram_campaigns')\
    .select('*')\
    .eq('is_active', True)\
    .not_.is_('instagram_url', 'null')\
    .execute()

campaigns = response.data
```

#### Update Campaign

```python
supabase.table('instagram_campaigns')\
    .update({
        'likes_count': 1234,
        'comments_count': 56,
        'last_scraped_at': datetime.now(timezone.utc).isoformat()
    })\
    .eq('id', campaign_id)\
    .execute()
```

#### Insert Historical Data

```python
supabase.table('instagram_scraped_data')\
    .insert({
        'campaign_id': campaign_id,
        'raw_data': scraped_data,
        'scrape_status': 'success'
    })\
    .execute()
```

---

## 🛡️ Error Handling & Reliability

### Session Expiry Detection

```python
async def check_for_session_expiry(page: Page) -> bool:
    """Check if we've been logged out"""
    url = page.url
    return 'login' in url.lower() or 'challenge' in url.lower()
```

### Automatic Re-Login

```python
if await check_for_session_expiry(page):
    log("⚠️  Session expired, attempting re-login...")
    success = await login_to_instagram(page, force_fresh=True)
    if not success:
        log("❌ Re-login failed. Manual intervention required.", "ERROR")
        break
```

### Retry Logic

```python
for attempt in range(MAX_RETRIES):
    try:
        result = await scrape_instagram_post(page, url)
        if result.get('status') == 'success':
            break
    except Exception as e:
        if attempt == MAX_RETRIES - 1:
            log(f"Failed after {MAX_RETRIES} attempts", "ERROR")
        else:
            log(f"Retry {attempt + 1}/{MAX_RETRIES}...", "WARNING")
            await asyncio.sleep(5)
```

### Rate Limiting

```python
RATE_LIMIT_DELAY = 2000  # ms between requests
await asyncio.sleep(RATE_LIMIT_DELAY / 1000)
```

---

## 📈 Monitoring & Logging

### Simple Status Check Script

Create `check_instagram_scraper.sh`:

```bash
#!/bin/bash
echo "=== Instagram Scraper Status ==="
echo ""

# Most recent scrape
echo "Most Recent Scrape:"
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT campaign_id, likes_count, comments_count, views_count, scraped_at
FROM instagram_scraped_data
ORDER BY scraped_at DESC
LIMIT 5;
"

# Total historical records
echo "Total Historical Records:"
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT COUNT(*) FROM instagram_scraped_data;
"

# Cron schedule
echo "Cron Schedule:"
crontab -l | grep instagram

# Last 10 log lines
echo "Recent Logs:"
tail -10 /var/log/instagram_scraper.log
```

### Check Last Scraper Run

```bash
# View logs
tail -50 /var/log/instagram_scraper.log

# Check database
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
    COUNT(*) as total_campaigns,
    COUNT(*) FILTER (WHERE last_scraped_at > NOW() - INTERVAL '24 hours') as scraped_today,
    MAX(last_scraped_at) as most_recent_scrape
FROM instagram_campaigns;
"
```

---

## 🚀 Deployment Checklist

### Initial Setup

- [ ] Create database tables (`instagram_campaigns`, `instagram_scraped_data`, `instagram_posts`)
- [ ] Install Python dependencies (`pip install -r requirements.txt`)
- [ ] Install Playwright browsers (`playwright install chromium`)
- [ ] Install Xvfb (`apt-get install xvfb x11vnc`)
- [ ] Set up environment variables (`.env` file)
- [ ] Create scraper directory (`/root/arti-marketing-ops/instagram_scraper`)
- [ ] Make scripts executable (`chmod +x *.sh *.py`)

### VNC & Manual Login

- [ ] Start Xvfb (`Xvfb :99 &`)
- [ ] Start VNC server (`x11vnc -display :99 -forever -shared -bg -rfbport 5900`)
- [ ] Connect via VNC client
- [ ] Run `python3 manual_browser_login.py`
- [ ] Log in to Instagram manually
- [ ] Verify session saved (`ls data/browser_data`)

### Test Scraper

- [ ] Run single test: `python3 run_production_scraper.py --limit 1`
- [ ] Verify data in `instagram_campaigns` table
- [ ] Verify historical data in `instagram_scraped_data` table
- [ ] Check logs for errors

### Cron Job

- [ ] Add cron job (`crontab -e`)
- [ ] Verify cron syntax (`crontab -l`)
- [ ] Wait for scheduled run OR trigger manually
- [ ] Check logs after run (`tail /var/log/instagram_scraper.log`)

### Monitoring

- [ ] Create status check script
- [ ] Set up alerts for failed scrapes
- [ ] Monitor disk usage for `USER_DATA_DIR`
- [ ] Back up persistent browser data

---

## 🐛 Common Issues & Solutions

### Issue: "Not logged in" error every run

**Cause:** Not using persistent context, or `USER_DATA_DIR` being deleted

**Fix:** 
```python
# Ensure you're using launch_persistent_context, NOT launch + new_context
context = await playwright.chromium.launch_persistent_context(
    user_data_dir=USER_DATA_DIR,
    headless=False
)
```

### Issue: Scraper gets CAPTCHA challenges

**Cause:** Instagram detects automation

**Fix:**
1. Use persistent context (reuse logged-in session)
2. Add human-like delays: `slow_mo=1000`
3. Disable automation flags: `--disable-blink-features=AutomationControlled`
4. Randomize user agent
5. Solve CAPTCHA manually via VNC once

### Issue: Instagram blocks rate

**Cause:** Too many requests too quickly

**Fix:**
```python
RATE_LIMIT_DELAY = 5000  # Increase to 5 seconds
await asyncio.sleep(RATE_LIMIT_DELAY / 1000)
```

### Issue: Cron job doesn't run

**Cause:** Cron service not running, or incorrect cron syntax

**Fix:**
```bash
# Check cron service
service cron status
service cron start

# Verify cron syntax
crontab -l

# Check cron logs
grep CRON /var/log/syslog
```

### Issue: Browser doesn't render (blank page)

**Cause:** Running in headless mode without Xvfb

**Fix:**
```bash
# Start Xvfb
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99

# Set headless=False in scraper
headless=False
```

---

## 📚 Additional Resources

### Instagram Scraping Best Practices

1. **Respect Rate Limits:** 2-5 seconds between requests
2. **Use Persistent Sessions:** Avoid repeated logins
3. **Handle Private Accounts:** Skip or request access
4. **Monitor for Changes:** Instagram updates their DOM frequently
5. **Backup Sessions:** Save `USER_DATA_DIR` regularly

### Playwright Documentation

- [Persistent Context](https://playwright.dev/python/docs/auth#reuse-signed-in-state)
- [Browser Arguments](https://playwright.dev/python/docs/api/class-browsertype#browser-type-launch-persistent-context)
- [Selectors](https://playwright.dev/python/docs/selectors)

### Supabase Python Client

- [Documentation](https://supabase.com/docs/reference/python/introduction)
- [Query Filters](https://supabase.com/docs/reference/python/select)

---

## ✅ Success Criteria

Your Instagram scraper is production-ready when:

1. ✅ Runs automatically via cron job
2. ✅ Uses persistent browser context (no repeated logins)
3. ✅ Saves historical data to `instagram_scraped_data` table
4. ✅ Updates `instagram_campaigns` table with latest metrics
5. ✅ Handles session expiry gracefully
6. ✅ Has VNC access for manual intervention
7. ✅ Logs to file for debugging
8. ✅ Rate limits requests to avoid blocks
9. ✅ Can be monitored via status check script
10. ✅ Has been tested with real campaigns

---

## 📝 Notes for the Agent

When implementing this for Instagram:

1. **Instagram's DOM is different from Spotify's** - You'll need to inspect Instagram's HTML to find the correct selectors for likes, comments, views, etc.

2. **Instagram may have different authentication flow** - The login process might require additional steps like 2FA or phone verification.

3. **Instagram shows different data for posts vs reels** - Your scraper should handle both types.

4. **Engagement metrics** - Instagram has likes, comments, views, shares, and saves. Decide which to track.

5. **Stories vs Posts** - Stories disappear after 24 hours. You may need a separate scraper for those.

6. **Private accounts** - You can only scrape public accounts unless you follow the private ones.

7. **Instagram Graph API** - For some metrics, the official API might be better than scraping. Evaluate both options.

---

**This blueprint is based on our battle-tested Spotify scraper architecture. Follow it closely for best results!** 🚀

