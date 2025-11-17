# YouTube API Quick Setup Guide

## Current Status

✅ API key added to environment files  
✅ googleapis package installed  
⚠️ **Next Step**: Enable YouTube Data API v3 in Google Cloud Console

## Error Encountered

```
Method doesn't allow unregistered callers. Please use API Key or other form of API consumer identity.
```

**This means**: The YouTube Data API v3 is not enabled for this API key yet.

## Fix: Enable YouTube Data API v3

### Step 1: Go to Google Cloud Console

1. Open [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Select your project (or create one if needed)

### Step 2: Enable YouTube Data API v3

1. Go to **"APIs & Services"** → **"Library"**
2. Search for **"YouTube Data API v3"**
3. Click on it
4. Click the **"Enable"** button
5. Wait 1-2 minutes for it to activate

### Step 3: Verify API Key Settings

1. Go to **"APIs & Services"** → **"Credentials"**
2. Find your API key: `AIzaSyCo4D0knKCLCUiUxEl5e4oTwXCAJbEwccg`
3. Click on it to edit
4. Under **"API restrictions"**:
   - Select **"Restrict key"**
   - Check **"YouTube Data API v3"**
   - Click **"Save"**

### Step 4: Test Again

After enabling the API (wait 1-2 minutes), run:

```bash
cd apps/api
node test-youtube-api.js
```

**Expected Output**:
```
🎬 Testing YouTube Data API v3...

📊 Fetching stats for video: dQw4w9WgXcQ

✅ Success! API is working.

📹 Video Details:
   Title: Rick Astley - Never Gonna Give You Up (Official Video)
   Published: 2009-10-25T06:57:33Z
   Duration: PT3M33S

📊 Statistics:
   Views: 1,523,456,789
   Likes: 12,345,678
   Comments: 567,890

✅ YouTube Data API v3 is configured correctly!
```

## Alternative: Create New API Key

If the above doesn't work, you may need to create a fresh API key:

### 1. Create New Key

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"API Key"**
3. Copy the new key
4. Click **"Restrict Key"**

### 2. Configure Restrictions

**Application restrictions**:
- Select **"None"** (for testing) or **"HTTP referrers"** (for production)

**API restrictions**:
- Select **"Restrict key"**
- Check **"YouTube Data API v3"**
- Click **"Save"**

### 3. Update Environment

Replace the key in `apps/api/.env` and `apps/api/production.env`:

```bash
YOUTUBE_API_KEY=your-new-api-key-here
```

### 4. Test

```bash
cd apps/api
node test-youtube-api.js
```

## Common Issues

### Issue 1: "API key not found"
**Solution**: Make sure you copied the full key correctly

### Issue 2: "Quota exceeded"
**Solution**: You've hit the daily limit (10,000 units). Wait until midnight Pacific Time for reset.

### Issue 3: "API not enabled"
**Solution**: Follow Step 2 above to enable YouTube Data API v3

### Issue 4: "Key expired"
**Solution**: API keys don't expire by default, but check key settings in console

## Quota Information

- **Free Tier**: 10,000 quota units per day
- **Cost per video stats request**: 1 unit (for up to 50 videos)
- **Daily capacity**: Can fetch stats for ~10,000 videos/day

With 500 campaigns:
- Each bulk refresh = 10 quota units
- Can run 1,000 bulk refreshes per day
- More than enough for 3x daily updates (8am, 2pm, 8pm)

## Next Steps After Setup

Once the test passes:

1. **Add refresh buttons to frontend**:
   - Edit `CampaignTableEnhanced.tsx`
   - Add refresh button using `useYouTubeStats` hook

2. **Set up automated refresh**:
   - Create cron job for 3x daily refresh
   - Or use BullMQ for scheduled jobs

3. **Monitor usage**:
   - Check quota in Google Cloud Console daily
   - Set up alerts at 80% quota usage

## Support

If you continue to have issues:

1. Check [YouTube API Status](https://status.cloud.google.com/)
2. Review [YouTube Data API Docs](https://developers.google.com/youtube/v3)
3. Check API key hasn't been accidentally revoked

---

**API Key**: `AIzaSyCo4D0knKCLCUiUxEl5e4oTwXCAJbEwccg`  
**Status**: Needs YouTube Data API v3 enabled  
**Action Required**: Enable API in Google Cloud Console

