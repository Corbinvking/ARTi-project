# YouTube Data API v3 Integration Setup

## Overview

This document details how to set up and use the YouTube Data API v3 integration for fetching real-time video statistics (views, likes, comments) for campaigns.

## Prerequisites

- Google Cloud Platform account
- YouTube Data API v3 enabled
- API Key configured

## Step 1: Create YouTube API Key

### 1.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a Project" → "New Project"
3. Enter project name: `ARTi YouTube Stats`
4. Click "Create"

### 1.2 Enable YouTube Data API v3

1. Navigate to "APIs & Services" → "Library"
2. Search for "YouTube Data API v3"
3. Click on it and press "Enable"

### 1.3 Create API Key

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Copy the generated API key
4. (Optional but recommended) Click "Restrict Key":
   - **Application restrictions**: HTTP referrers or IP addresses
   - **API restrictions**: Select "YouTube Data API v3"
   - Click "Save"

## Step 2: Configure Environment Variables

### Development (Local)

Add to `apps/api/.env`:

```bash
YOUTUBE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Production (Docker)

Add to `apps/api/production.env`:

```bash
YOUTUBE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Then restart the API container:

```bash
docker-compose restart api
```

## Step 3: Install Dependencies

```bash
cd apps/api
npm install googleapis@^128.0.0
```

## API Endpoints

### 1. Fetch Single Video Stats

**Endpoint**: `POST /api/youtube-data-api/fetch-video-stats`

**Request Body**:
```json
{
  "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "campaignId": "uuid-of-campaign" // optional
}
```

**Response**:
```json
{
  "videoId": "dQw4w9WgXcQ",
  "viewCount": 1523456,
  "likeCount": 12345,
  "commentCount": 567,
  "title": "Video Title",
  "publishedAt": "2023-01-01T00:00:00Z",
  "duration": "PT3M45S",
  "success": true,
  "error": null
}
```

If `campaignId` is provided, the campaign will be automatically updated with the new stats.

### 2. Bulk Fetch All Campaigns

**Endpoint**: `POST /api/youtube-data-api/fetch-all-campaigns`

**Request Body**:
```json
{
  "orgId": "uuid-of-organization"
}
```

**Response**:
```json
{
  "total": 100,
  "updated": 98,
  "errors": 2,
  "details": [
    {
      "campaignId": "uuid",
      "campaignName": "Campaign Name",
      "previousViews": 1000,
      "newViews": 1523,
      "change": 523
    },
    ...
  ]
}
```

Fetches stats for all `active` and `pending` campaigns in batches of 50 (YouTube API limit).

### 3. Extract Video ID

**Endpoint**: `GET /api/youtube-data-api/extract-video-id?url=<youtube-url>`

**Response**:
```json
{
  "videoId": "dQw4w9WgXcQ",
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

Utility endpoint to extract video ID from various YouTube URL formats.

## Supported YouTube URL Formats

The API can extract video IDs from:

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`
- `https://www.youtube.com/v/VIDEO_ID`
- Just the video ID: `VIDEO_ID`

## Database Schema Updates

When stats are fetched, the following `youtube_campaigns` columns are updated:

| Column | Type | Description |
|--------|------|-------------|
| `current_views` | INTEGER | Current total view count |
| `current_likes` | INTEGER | Current like count |
| `current_comments` | INTEGER | Current comment count |
| `views_7_days` | INTEGER | View change since last fetch |
| `likes_7_days` | INTEGER | Like change since last fetch |
| `comments_7_days` | INTEGER | Comment change since last fetch |
| `last_youtube_api_fetch` | TIMESTAMPTZ | Timestamp of last successful fetch |
| `youtube_api_error` | TEXT | Last error message (null if successful) |
| `video_id` | TEXT | Extracted YouTube video ID |

## Rate Limits

### YouTube Data API v3 Quotas

- **Free tier**: 10,000 quota units per day
- **Cost per request**:
  - `videos.list` with statistics: 1 unit per video (up to 50 videos per request)
  - Fetching 50 videos = 1 quota unit
  - Daily limit: ~10,000 video stats fetches

### Rate Limiting Strategy

The bulk fetch endpoint includes:
- **Batch processing**: 50 videos per API request
- **Rate limiting delay**: 200ms between batches
- **Error handling**: Continues on individual failures

## Frontend Integration

### Refresh Button Example

```typescript
import { useToast } from "@/hooks/use-toast";

async function handleRefreshStats(campaignId: string, videoUrl: string) {
  const { toast } = useToast();
  
  try {
    const response = await fetch('/api/youtube-data-api/fetch-video-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl, campaignId })
    });
    
    const data = await response.json();
    
    if (data.success) {
      toast({
        title: "Stats Updated",
        description: `Views: ${data.viewCount.toLocaleString()}`,
      });
      // Invalidate React Query cache
      queryClient.invalidateQueries({ queryKey: ['youtube-campaigns'] });
    } else {
      toast({
        title: "Error",
        description: data.error,
        variant: "destructive",
      });
    }
  } catch (error) {
    toast({
      title: "Network Error",
      description: "Failed to fetch video stats",
      variant: "destructive",
    });
  }
}
```

### Bulk Refresh Example

```typescript
async function handleBulkRefresh(orgId: string) {
  const response = await fetch('/api/youtube-data-api/fetch-all-campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orgId })
  });
  
  const results = await response.json();
  
  toast({
    title: "Bulk Update Complete",
    description: `Updated ${results.updated} campaigns, ${results.errors} errors`,
  });
  
  queryClient.invalidateQueries({ queryKey: ['youtube-campaigns'] });
}
```

## Automated Refresh Schedule

### Option 1: Cron Job (Recommended)

Create a cron job to run 3x daily (as specified in schema):

```bash
# Add to crontab
0 8,14,20 * * * curl -X POST https://api.artistinfluence.com/api/youtube-data-api/fetch-all-campaigns \
  -H "Content-Type: application/json" \
  -d '{"orgId":"YOUR_ORG_ID"}'
```

### Option 2: BullMQ Job

```typescript
import { Queue, Worker } from 'bullmq';

const youtubeStatsQueue = new Queue('youtube-stats', { connection: redis });

// Add recurring job
await youtubeStatsQueue.add(
  'fetch-all-campaigns',
  { orgId: process.env.DEFAULT_ORG_ID },
  {
    repeat: {
      pattern: '0 8,14,20 * * *' // 8am, 2pm, 8pm daily
    }
  }
);

// Worker
const worker = new Worker('youtube-stats', async (job) => {
  const { orgId } = job.data;
  
  const response = await fetch(`${API_URL}/api/youtube-data-api/fetch-all-campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orgId })
  });
  
  return await response.json();
}, { connection: redis });
```

## Testing

### Test Single Video

```bash
curl -X POST http://localhost:3001/api/youtube-data-api/fetch-video-stats \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  }'
```

### Test Bulk Fetch

```bash
curl -X POST http://localhost:3001/api/youtube-data-api/fetch-all-campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "orgId": "your-org-id-here"
  }'
```

### Test Video ID Extraction

```bash
curl "http://localhost:3001/api/youtube-data-api/extract-video-id?url=https://youtu.be/dQw4w9WgXcQ"
```

## Error Handling

### Common Errors

1. **Invalid API Key**: 
   ```
   Error 403: The request did not specify any Android package name or bundle ID
   ```
   Solution: Check API key is correct and YouTube Data API v3 is enabled

2. **Quota Exceeded**:
   ```
   Error 403: Quota exceeded
   ```
   Solution: Wait until quota resets (midnight Pacific Time) or upgrade quota

3. **Video Not Found**:
   ```
   Video not found: VIDEO_ID
   ```
   Solution: Check video URL is correct and video is public

4. **Invalid URL**:
   ```
   Invalid YouTube URL
   ```
   Solution: Ensure URL is in supported format

### Error Logging

All errors are logged with context:

```typescript
logger.error({
  videoId,
  campaignId,
  error: error.message
}, 'Failed to fetch video stats');
```

The `youtube_api_error` column in `youtube_campaigns` stores the last error for debugging.

## Monitoring

### Check API Usage

Track quota usage in Google Cloud Console:
- Navigate to "APIs & Services" → "Dashboard"
- Click "YouTube Data API v3"
- View "Queries per day" chart

### Database Monitoring

```sql
-- Check last successful fetches
SELECT 
  campaign_name,
  current_views,
  last_youtube_api_fetch,
  youtube_api_error
FROM youtube_campaigns
WHERE last_youtube_api_fetch IS NOT NULL
ORDER BY last_youtube_api_fetch DESC
LIMIT 10;

-- Count successful vs failed fetches
SELECT 
  COUNT(*) FILTER (WHERE youtube_api_error IS NULL) as successful,
  COUNT(*) FILTER (WHERE youtube_api_error IS NOT NULL) as failed
FROM youtube_campaigns
WHERE last_youtube_api_fetch > NOW() - INTERVAL '24 hours';
```

## Security Best Practices

1. **API Key Restrictions**:
   - Restrict to specific IP addresses (production server)
   - Restrict to YouTube Data API v3 only
   - Rotate keys periodically

2. **Environment Variables**:
   - Never commit API keys to git
   - Use `.env` files (gitignored)
   - Use secrets management in production (Docker secrets, AWS Secrets Manager, etc.)

3. **Rate Limiting**:
   - Implement application-level rate limiting
   - Monitor quota usage
   - Set up alerts for quota nearing limits

## Troubleshooting

### API Not Responding

1. Check API server is running
2. Check `YOUTUBE_API_KEY` is set in environment
3. Check googleapis package is installed
4. Check logs: `docker logs api_container`

### Stats Not Updating

1. Check campaign has valid `youtube_url`
2. Check video is public and accessible
3. Check `last_youtube_api_fetch` timestamp
4. Check `youtube_api_error` column for error messages

### Quota Issues

1. Check current quota usage in Google Cloud Console
2. Reduce fetch frequency
3. Request quota increase from Google
4. Implement smarter fetching (only active campaigns, prioritize by importance)

## Future Enhancements

- [ ] Auto-enable API fetch for new campaigns
- [ ] Smart scheduling (fetch more frequently for active campaigns)
- [ ] Historical stats tracking (daily snapshots)
- [ ] Webhooks for YouTube API quota alerts
- [ ] Dashboard for API usage and stats
- [ ] Fetch additional metrics (avg watch time, traffic sources)
- [ ] Batch stats export to CSV

---

**Status**: ✅ Implemented and Ready for Testing  
**Last Updated**: 2025-11-17  
**API Version**: YouTube Data API v3  
**Package**: googleapis@^128.0.0

