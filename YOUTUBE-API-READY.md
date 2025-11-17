# YouTube Data API v3 - READY FOR USE ✅

## Status: FULLY OPERATIONAL

YouTube Data API v3 integration is complete and tested successfully!

## Test Results

**Test Video**: Rick Astley - Never Gonna Give You Up  
**Video ID**: `dQw4w9WgXcQ`

### Successful API Response:
```
✅ Success! API is working.

📹 Video Details:
   Title: Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)
   Published: 2009-10-25T06:57:33Z
   Duration: PT3M34S

📊 Statistics:
   Views: 1,714,192,569
   Likes: 18,645,013
   Comments: 2,406,841

✅ YouTube Data API v3 is configured correctly!
```

## Configuration Complete

✅ API Key: `AIzaSyCo4D0knKCLCUiUxEl5e4oTwXCAJbEwccg`  
✅ Environment: Configured in `.env` and `production.env`  
✅ Package: `googleapis@^128.0.0` installed  
✅ Test Script: `test-youtube-api.js` passing  
✅ YouTube Data API v3: Enabled in Google Cloud Console

## What's Available Now

### 1. Backend API Endpoints

**Fetch Single Video Stats**:
```bash
curl -X POST http://localhost:3001/api/youtube-data-api/fetch-video-stats \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "campaignId": "optional-campaign-id"
  }'
```

**Bulk Fetch All Campaigns**:
```bash
curl -X POST http://localhost:3001/api/youtube-data-api/fetch-all-campaigns \
  -H "Content-Type: application/json" \
  -d '{"orgId": "your-org-id"}'
```

**Extract Video ID**:
```bash
curl "http://localhost:3001/api/youtube-data-api/extract-video-id?url=https://youtu.be/dQw4w9WgXcQ"
```

### 2. Frontend Hook

```typescript
import { useYouTubeStats } from '../hooks/useYouTubeStats';

function YourComponent() {
  const { refreshCampaign, fetchAllCampaigns, isRefreshing } = useYouTubeStats();

  // Refresh single campaign
  const handleRefresh = async () => {
    await refreshCampaign(campaignId, youtubeUrl);
  };

  // Refresh all campaigns
  const handleBulkRefresh = async () => {
    await fetchAllCampaigns(orgId);
  };

  return (
    <Button onClick={handleRefresh} disabled={isRefreshing}>
      {isRefreshing ? 'Refreshing...' : 'Refresh Stats'}
    </Button>
  );
}
```

### 3. Database Updates

When stats are fetched, campaigns automatically update:

| Column | Description |
|--------|-------------|
| `current_views` | Current total views |
| `current_likes` | Current like count |
| `current_comments` | Current comment count |
| `views_7_days` | View change since last fetch |
| `likes_7_days` | Like change since last fetch |
| `comments_7_days` | Comment change since last fetch |
| `last_youtube_api_fetch` | Timestamp of last fetch |
| `video_id` | Extracted YouTube video ID |

## Quota Information

- **Daily Quota**: 10,000 units (free tier)
- **Per Request**: 1 unit (up to 50 videos)
- **Your 420 Campaigns**: 9 requests = 9 units
- **Capacity**: Can refresh 1,000+ times/day

## Next Steps

### 1. Add Refresh Buttons to UI

Example for campaign table:

```tsx
import { useYouTubeStats } from '../hooks/useYouTubeStats';

function CampaignRow({ campaign }) {
  const { refreshCampaign, isRefreshing } = useYouTubeStats();

  return (
    <TableRow>
      <TableCell>{campaign.campaign_name}</TableCell>
      <TableCell>{campaign.current_views?.toLocaleString()}</TableCell>
      <TableCell>
        <Button
          size="sm"
          onClick={() => refreshCampaign(campaign.id, campaign.youtube_url)}
          disabled={isRefreshing}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
```

### 2. Add Bulk Refresh Button

```tsx
function CampaignsPage() {
  const { fetchAllCampaigns, isBulkRefreshing } = useYouTubeStats();
  const orgId = 'your-org-id'; // Get from auth context

  return (
    <div>
      <Button 
        onClick={() => fetchAllCampaigns(orgId)}
        disabled={isBulkRefreshing}
      >
        {isBulkRefreshing ? 'Refreshing All...' : 'Refresh All Campaigns'}
      </Button>
    </div>
  );
}
```

### 3. Show Last Updated Timestamp

```tsx
{campaign.last_youtube_api_fetch && (
  <div className="text-xs text-muted-foreground">
    Last updated: {formatDistanceToNow(new Date(campaign.last_youtube_api_fetch))} ago
  </div>
)}
```

### 4. Set Up Automated Refresh

**Option A: Cron Job** (Simple)
```bash
# Add to crontab - runs at 8am, 2pm, 8pm daily
0 8,14,20 * * * curl -X POST https://api.artistinfluence.com/api/youtube-data-api/fetch-all-campaigns \
  -H "Content-Type: application/json" \
  -d '{"orgId":"YOUR_ORG_ID"}'
```

**Option B: BullMQ Job** (Recommended for production)
```typescript
// Add to queue setup
youtubeStatsQueue.add(
  'fetch-all-campaigns',
  { orgId: process.env.DEFAULT_ORG_ID },
  {
    repeat: {
      pattern: '0 8,14,20 * * *' // 8am, 2pm, 8pm
    }
  }
);
```

## Monitoring

### Check Quota Usage

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" → "Dashboard"
3. Click "YouTube Data API v3"
4. View "Queries per day" chart

### Database Query for Stats

```sql
-- Check recent updates
SELECT 
  campaign_name,
  current_views,
  views_7_days,
  last_youtube_api_fetch
FROM youtube_campaigns
WHERE last_youtube_api_fetch IS NOT NULL
ORDER BY last_youtube_api_fetch DESC
LIMIT 20;

-- Count updates today
SELECT 
  COUNT(*) as updated_today,
  AVG(views_7_days) as avg_view_change
FROM youtube_campaigns
WHERE last_youtube_api_fetch::date = CURRENT_DATE;
```

## Production Deployment

The API key is already configured in `production.env`, so it will work when you deploy:

```bash
# Restart API container to load new env var
docker-compose restart api

# Verify it's working
curl -X POST https://api.artistinfluence.com/api/youtube-data-api/fetch-video-stats \
  -H "Content-Type: application/json" \
  -d '{"videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

## Troubleshooting

### If you see "API key not found" error:
```bash
# Verify .env has the key
cat apps/api/.env | grep YOUTUBE_API_KEY

# Should output:
# YOUTUBE_API_KEY=AIzaSyCo4D0knKCLCUiUxEl5e4oTwXCAJbEwccg
```

### If quota exceeded:
- Wait until midnight Pacific Time for reset
- Monitor usage at console.cloud.google.com
- Consider requesting quota increase from Google

### If video not found:
- Check video URL is correct
- Verify video is public
- Try extracting video ID first with extract-video-id endpoint

## Files Reference

- **Backend Route**: `apps/api/src/routes/youtube-data-api.ts`
- **Frontend Hook**: `apps/frontend/app/(dashboard)/youtube/vidi-health-flow/hooks/useYouTubeStats.ts`
- **Test Script**: `apps/api/test-youtube-api.js`
- **Setup Guide**: `YOUTUBE-API-SETUP.md`
- **Quick Setup**: `YOUTUBE-API-QUICK-SETUP.md`
- **Complete Guide**: `YOUTUBE-API-INTEGRATION-COMPLETE.md`

## Summary

✅ **API Key**: Working and tested  
✅ **Backend**: 3 endpoints ready  
✅ **Frontend**: Hook available  
✅ **Database**: Auto-updates configured  
✅ **Rate Limiting**: Implemented (200ms delays)  
✅ **Error Handling**: Comprehensive logging  
✅ **Documentation**: Complete guides available  

**🚀 Ready to add refresh buttons to your UI and start tracking campaign stats in real-time!**

---

**Date**: 2025-11-17  
**Status**: ✅ PRODUCTION READY  
**Test Status**: ✅ PASSING  
**API Quota**: 10,000 units/day (free tier)

