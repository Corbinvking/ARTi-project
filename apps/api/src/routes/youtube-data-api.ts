import { FastifyInstance } from 'fastify';
import { google } from 'googleapis';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

// Initialize YouTube API
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY || ''
});

/**
 * Extract video ID from various YouTube URL formats
 */
function extractVideoId(url: string): string | null {
  if (!url) return null;
  
  // Handle youtu.be short URLs
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch && shortMatch[1]) return shortMatch[1];
  
  // Handle youtube.com URLs with v= parameter
  const longMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (longMatch && longMatch[1]) return longMatch[1];
  
  // Handle youtube.com/embed/ URLs
  const embedMatch = url.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch && embedMatch[1]) return embedMatch[1];
  
  // Handle youtube.com/v/ URLs
  const vMatch = url.match(/\/v\/([a-zA-Z0-9_-]{11})/);
  if (vMatch && vMatch[1]) return vMatch[1];
  
  // If it's already just a video ID (11 characters)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  
  return null;
}

/**
 * Fetch stats for a single video from YouTube API
 */
async function fetchVideoStats(videoId: string) {
  try {
    const response = await youtube.videos.list({
      part: ['statistics', 'contentDetails', 'snippet'],
      id: [videoId]
    });

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error(`Video not found: ${videoId}`);
    }

    const video = response.data.items[0];
    if (!video) {
      throw new Error(`Video data not available: ${videoId}`);
    }
    
    const stats = video.statistics;

    return {
      videoId,
      viewCount: parseInt(stats?.viewCount || '0'),
      likeCount: parseInt(stats?.likeCount || '0'),
      commentCount: parseInt(stats?.commentCount || '0'),
      title: video.snippet?.title || '',
      publishedAt: video.snippet?.publishedAt || null,
      duration: video.contentDetails?.duration || '',
      success: true,
      error: null
    };
  } catch (error: any) {
    console.error(`Error fetching stats for video ${videoId}:`, error.message);
    return {
      videoId,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      title: '',
      publishedAt: null,
      duration: '',
      success: false,
      error: error.message
    };
  }
}

/**
 * YouTube Data API Routes
 * Endpoints for fetching YouTube video statistics and updating campaigns
 */
export async function youtubeDataApiRoutes(server: FastifyInstance) {
  
  /**
   * POST /youtube-data-api/fetch-video-stats
   * Fetch stats for a single video
   */
  server.post('/youtube-data-api/fetch-video-stats', async (request, reply) => {
    try {
      const { videoUrl, campaignId } = request.body as { videoUrl: string; campaignId?: string };

      if (!videoUrl) {
        return reply.status(400).send({ error: 'videoUrl is required' });
      }

      const videoId = extractVideoId(videoUrl);
      if (!videoId) {
        return reply.status(400).send({ error: 'Invalid YouTube URL' });
      }

      logger.info({ videoId }, '🎬 Fetching stats for video');
      
      const stats = await fetchVideoStats(videoId);

      // If campaignId provided, update the campaign
      if (campaignId && stats.success) {
        // Fetch current stats to calculate 7-day changes
        const { data: currentCampaign } = await supabase
          .from('youtube_campaigns')
          .select('current_views, current_likes, current_comments')
          .eq('id', campaignId)
          .single();

        const updateData: any = {
          current_views: stats.viewCount,
          current_likes: stats.likeCount,
          current_comments: stats.commentCount,
          last_youtube_api_fetch: new Date().toISOString(),
          youtube_api_error: null,
          video_id: videoId
        };

        // Calculate 7-day changes if we have previous data
        if (currentCampaign) {
          updateData.views_7_days = Math.max(0, stats.viewCount - (currentCampaign.current_views || 0));
          updateData.likes_7_days = Math.max(0, stats.likeCount - (currentCampaign.current_likes || 0));
          updateData.comments_7_days = Math.max(0, stats.commentCount - (currentCampaign.current_comments || 0));
        }

        const { error: updateError } = await supabase
          .from('youtube_campaigns')
          .update(updateData)
          .eq('id', campaignId);

        if (updateError) {
          logger.error({ campaignId, error: updateError }, 'Error updating campaign');
          return reply.status(500).send({ error: 'Failed to update campaign', details: updateError.message });
        }

        logger.info({ campaignId }, '✅ Updated campaign with new stats');
      }

      return stats;
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error in /fetch-video-stats');
      return reply.status(500).send({ error: 'Internal server error', message: error.message });
    }
  });

  /**
   * POST /youtube-data-api/fetch-all-campaigns
   * Fetch stats for all active campaigns
   */
  server.post('/youtube-data-api/fetch-all-campaigns', async (request, reply) => {
    try {
      const { orgId } = request.body as { orgId: string };

      logger.info('🎬 Fetching stats for all campaigns...');

      // Fetch all campaigns with youtube_api_enabled = true or all active campaigns
      const { data: campaigns, error: fetchError } = await supabase
        .from('youtube_campaigns')
        .select('id, campaign_name, youtube_url, video_id, current_views, current_likes, current_comments, status')
        .eq('org_id', orgId)
        .in('status', ['active', 'pending', 'complete'])
        .order('created_at', { ascending: false });

      if (fetchError) {
        logger.error({ error: fetchError }, 'Error fetching campaigns');
        return reply.status(500).send({ error: 'Failed to fetch campaigns', details: fetchError.message });
      }

      if (!campaigns || campaigns.length === 0) {
        return { message: 'No campaigns to update', updated: 0, errors: 0 };
      }

      logger.info({ count: campaigns.length }, `📊 Found campaigns to update`);

    const results = {
      total: campaigns.length,
      updated: 0,
      errors: 0,
      details: [] as any[]
    };

    // Process campaigns in batches to avoid rate limits
    const BATCH_SIZE = 50; // YouTube API allows 50 videos per request
    const batches = [];
    
    for (let i = 0; i < campaigns.length; i += BATCH_SIZE) {
      batches.push(campaigns.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
      // Extract video IDs
      const videoIds = batch
        .map(c => c.video_id || extractVideoId(c.youtube_url))
        .filter(Boolean) as string[];

      if (videoIds.length === 0) continue;

      try {
        // Fetch stats for all videos in batch
        const response = await youtube.videos.list({
          part: ['statistics'],
          id: videoIds
        });

        if (!response.data.items) continue;

        // Create a map of videoId -> stats
        const statsMap = new Map();
        response.data.items.forEach(video => {
          if (video.id && video.statistics) {
            statsMap.set(video.id, {
              viewCount: parseInt(video.statistics.viewCount || '0'),
              likeCount: parseInt(video.statistics.likeCount || '0'),
              commentCount: parseInt(video.statistics.commentCount || '0')
            });
          }
        });

        // Update each campaign
        for (const campaign of batch) {
          const videoId = campaign.video_id || extractVideoId(campaign.youtube_url);
          if (!videoId) {
            results.errors++;
            results.details.push({
              campaignId: campaign.id,
              campaignName: campaign.campaign_name,
              error: 'Invalid or missing video ID'
            });
            continue;
          }

          const stats = statsMap.get(videoId);
          if (!stats) {
            results.errors++;
            results.details.push({
              campaignId: campaign.id,
              campaignName: campaign.campaign_name,
              error: 'Video not found in YouTube API response'
            });
            continue;
          }

          const updateData: any = {
            current_views: stats.viewCount,
            current_likes: stats.likeCount,
            current_comments: stats.commentCount,
            last_youtube_api_fetch: new Date().toISOString(),
            youtube_api_error: null,
            video_id: videoId
          };

          // Calculate 7-day changes
          updateData.views_7_days = Math.max(0, stats.viewCount - (campaign.current_views || 0));
          updateData.likes_7_days = Math.max(0, stats.likeCount - (campaign.current_likes || 0));
          updateData.comments_7_days = Math.max(0, stats.commentCount - (campaign.current_comments || 0));

          const { error: updateError } = await supabase
            .from('youtube_campaigns')
            .update(updateData)
            .eq('id', campaign.id);

          if (updateError) {
            results.errors++;
            results.details.push({
              campaignId: campaign.id,
              campaignName: campaign.campaign_name,
              error: updateError.message
            });
          } else {
            results.updated++;
            results.details.push({
              campaignId: campaign.id,
              campaignName: campaign.campaign_name,
              previousViews: campaign.current_views,
              newViews: stats.viewCount,
              change: stats.viewCount - (campaign.current_views || 0)
            });
          }
        }

        // Add delay between batches to respect rate limits (200ms)
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error: any) {
        logger.error({ error: error.message }, 'Error processing batch');
        batch.forEach(campaign => {
          results.errors++;
          results.details.push({
            campaignId: campaign.id,
            campaignName: campaign.campaign_name,
            error: error.message
          });
        });
      }
    }

    logger.info({ updated: results.updated, errors: results.errors }, '✅ Bulk update complete');

    return results;
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error in /fetch-all-campaigns');
      return reply.status(500).send({ error: 'Internal server error', message: error.message });
    }
  });

  /**
   * GET /youtube-data-api/extract-video-id
   * Extract video ID from YouTube URL
   */
  server.get('/youtube-data-api/extract-video-id', async (request, reply) => {
    const { url } = request.query as { url?: string };
    
    if (!url || typeof url !== 'string') {
      return reply.status(400).send({ error: 'url parameter is required' });
    }

    const videoId = extractVideoId(url);
    
    if (!videoId) {
      return reply.status(400).send({ error: 'Invalid YouTube URL' });
    }

    return { videoId, url };
  });
}

