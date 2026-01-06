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
      // Fallback to oEmbed to still retrieve title for public/unlisted videos
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
          `https://www.youtube.com/watch?v=${videoId}`
        )}&format=json`;
        const oembedRes = await fetch(oembedUrl, { method: 'GET' });
        if (oembedRes.ok) {
          const oembed = (await oembedRes.json()) as { title?: string };
          if (oembed?.title) {
            return {
              videoId,
              viewCount: 0,
              likeCount: 0,
              commentCount: 0,
              title: oembed.title,
              publishedAt: null,
              duration: '',
              success: false,
              error: `Video not found via YouTube Data API (may be private/region-blocked). Title recovered via oEmbed.`,
            };
          }
        }
      } catch {
        // ignore oEmbed errors
      }

      throw new Error(`Video not found: ${videoId}`);
    }

    const video = response.data.items[0];
    if (!video) {
      throw new Error(`Video data not available: ${videoId}`);
    }
    
    const stats = video.statistics;
    let title = video.snippet?.title || '';
    let publishedAt = video.snippet?.publishedAt || null;
    let duration = video.contentDetails?.duration || '';

    // Fallback: some deployments/configs have returned blank snippet/contentDetails.
    // Use YouTube oEmbed (no API key required) to fetch title reliably for public videos.
    if (!title) {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
          `https://www.youtube.com/watch?v=${videoId}`
        )}&format=json`;
        // Node 18+ has global fetch
        const oembedRes = await fetch(oembedUrl, { method: 'GET' });
        if (oembedRes.ok) {
          const oembed = (await oembedRes.json()) as { title?: string };
          if (oembed?.title) {
            title = oembed.title;
          }
        }
      } catch {
        // ignore oEmbed errors; we still return stats
      }
    }

    return {
      videoId,
      viewCount: parseInt(stats?.viewCount || '0'),
      likeCount: parseInt(stats?.likeCount || '0'),
      commentCount: parseInt(stats?.commentCount || '0'),
      title,
      publishedAt,
      duration,
      success: true,
      error: null
    };
  } catch (error: any) {
    // Last-resort fallback: try oEmbed for title even when YouTube API errors
    let title = '';
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`
      )}&format=json`;
      const oembedRes = await fetch(oembedUrl, { method: 'GET' });
      if (oembedRes.ok) {
        const oembed = (await oembedRes.json()) as { title?: string };
        title = oembed?.title || '';
      }
    } catch {
      // ignore
    }

    console.error(`Error fetching stats for video ${videoId}:`, error.message);
    return {
      videoId,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      title,
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
      const { orgId, includeComplete = false } = request.body as { orgId: string; includeComplete?: boolean };

      logger.info('🎬 Fetching stats for all campaigns...');

      // Fetch campaigns - by default only active/pending, optionally include complete
      const statuses = includeComplete ? ['active', 'pending', 'complete'] : ['active', 'pending'];
      
      const { data: campaigns, error: fetchError } = await supabase
        .from('youtube_campaigns')
        .select('id, campaign_name, youtube_url, video_id, current_views, current_likes, current_comments, status')
        .eq('org_id', orgId)
        .in('status', statuses)
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

  /**
   * POST /youtube-data-api/collect-daily-stats
   * Collect stats for a campaign and store in campaign_stats_daily table
   * This endpoint is designed to be called 3x daily (morning, afternoon, evening)
   */
  server.post('/youtube-data-api/collect-daily-stats', async (request, reply) => {
    try {
      const { campaignId, timeOfDay } = request.body as { campaignId: string; timeOfDay?: string };

      if (!campaignId) {
        return reply.status(400).send({ error: 'campaignId is required' });
      }

      // Determine time of day
      const hour = new Date().getHours();
      const detectedTimeOfDay = timeOfDay || (hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening');

      logger.info({ campaignId, timeOfDay: detectedTimeOfDay }, '📊 Collecting daily stats');

      // Fetch campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('youtube_campaigns')
        .select('id, youtube_url, video_id, current_views, current_likes, current_comments')
        .eq('id', campaignId)
        .single();

      if (campaignError) {
        logger.error({ campaignId, error: campaignError.message, code: campaignError.code }, '❌ Error fetching campaign');
        return reply.status(404).send({ error: 'Campaign not found', details: campaignError.message });
      }
      
      if (!campaign) {
        logger.warn({ campaignId }, '⚠️ Campaign not found in database');
        return reply.status(404).send({ error: 'Campaign not found' });
      }
      
      logger.info({ campaignId, videoId: campaign.video_id }, '✅ Campaign found');

      const videoId = campaign.video_id || extractVideoId(campaign.youtube_url);
      if (!videoId) {
        return reply.status(400).send({ error: 'No valid video ID for campaign' });
      }

      // Fetch fresh stats from YouTube
      const stats = await fetchVideoStats(videoId);
      if (!stats.success) {
        return reply.status(500).send({ error: 'Failed to fetch YouTube stats', details: stats.error });
      }

      // Get today's date
      const today = new Date().toISOString().split('T')[0];

      // Insert or update daily stats (subscriber tracking not implemented yet)
      const { data: insertedStats, error: insertError } = await supabase
        .from('campaign_stats_daily')
        .upsert({
          campaign_id: campaignId,
          date: today,
          time_of_day: detectedTimeOfDay,
          views: stats.viewCount,
          likes: stats.likeCount,
          comments: stats.commentCount,
          total_subscribers: 0,
          subscribers_gained: 0,
          collected_at: new Date().toISOString()
        }, {
          onConflict: 'campaign_id,date,time_of_day'
        })
        .select()
        .single();

      if (insertError) {
        logger.error({ error: insertError }, 'Error inserting daily stats');
        return reply.status(500).send({ error: 'Failed to store daily stats', details: insertError.message });
      }

      // Also update the campaign's current stats
      await supabase
        .from('youtube_campaigns')
        .update({
          current_views: stats.viewCount,
          current_likes: stats.likeCount,
          current_comments: stats.commentCount,
          last_youtube_api_fetch: new Date().toISOString()
        })
        .eq('id', campaignId);

      logger.info({ campaignId, date: today, timeOfDay: detectedTimeOfDay }, '✅ Daily stats collected');

      return {
        success: true,
        campaignId,
        date: today,
        timeOfDay: detectedTimeOfDay,
        stats: insertedStats
      };
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error in /collect-daily-stats');
      return reply.status(500).send({ error: 'Internal server error', message: error.message });
    }
  });

  /**
   * POST /youtube-data-api/collect-all-daily-stats
   * Collect daily stats for all active campaigns with youtube_api_enabled = true
   */
  server.post('/youtube-data-api/collect-all-daily-stats', async (request, reply) => {
    try {
      const { timeOfDay } = request.body as { timeOfDay?: string };

      // Determine time of day
      const hour = new Date().getHours();
      const detectedTimeOfDay = timeOfDay || (hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening');
      const today = new Date().toISOString().split('T')[0];

      logger.info({ timeOfDay: detectedTimeOfDay }, '📊 Collecting daily stats for all active campaigns');

      // Fetch all active campaigns (collect stats for all, not just API-enabled ones)
      const { data: campaigns, error: fetchError } = await supabase
        .from('youtube_campaigns')
        .select('id, youtube_url, video_id, current_views, current_likes, current_comments')
        .in('status', ['active', 'pending']);

      if (fetchError) {
        logger.error({ error: fetchError.message, code: fetchError.code, details: fetchError.details }, '❌ Failed to fetch campaigns');
        return reply.status(500).send({ error: 'Failed to fetch campaigns', details: fetchError.message });
      }
      
      logger.info({ campaignCount: campaigns?.length || 0 }, '✅ Campaigns fetched successfully');

      if (!campaigns || campaigns.length === 0) {
        return { message: 'No campaigns to collect stats for', collected: 0 };
      }

      const results = {
        total: campaigns.length,
        collected: 0,
        errors: 0,
        details: [] as any[]
      };

      // Process campaigns in batches
      const BATCH_SIZE = 50;
      const batches = [];
      for (let i = 0; i < campaigns.length; i += BATCH_SIZE) {
        batches.push(campaigns.slice(i, i + BATCH_SIZE));
      }

      for (const batch of batches) {
        const videoIds = batch
          .map(c => c.video_id || extractVideoId(c.youtube_url))
          .filter(Boolean) as string[];

        if (videoIds.length === 0) continue;

        try {
          const response = await youtube.videos.list({
            part: ['statistics'],
            id: videoIds
          });

          if (!response.data.items) continue;

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

          for (const campaign of batch) {
            const videoId = campaign.video_id || extractVideoId(campaign.youtube_url);
            if (!videoId) continue;

            const stats = statsMap.get(videoId);
            if (!stats) continue;

            // Insert daily stats
            const { error: insertError } = await supabase
              .from('campaign_stats_daily')
              .upsert({
                campaign_id: campaign.id,
                date: today,
                time_of_day: detectedTimeOfDay,
                views: stats.viewCount,
                likes: stats.likeCount,
                comments: stats.commentCount,
                total_subscribers: 0,
                subscribers_gained: 0,
                collected_at: new Date().toISOString()
              }, {
                onConflict: 'campaign_id,date,time_of_day'
              });

            if (insertError) {
              results.errors++;
              results.details.push({
                campaignId: campaign.id,
                error: insertError.message
              });
            } else {
              results.collected++;
              
              // Update campaign's current stats
              await supabase
                .from('youtube_campaigns')
                .update({
                  current_views: stats.viewCount,
                  current_likes: stats.likeCount,
                  current_comments: stats.commentCount,
                  last_youtube_api_fetch: new Date().toISOString()
                })
                .eq('id', campaign.id);
            }
          }

          // Rate limit delay
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error: any) {
          logger.error({ 
            error: error.message, 
            videoIds: batch.map((c: any) => c.video_id || extractVideoId(c.youtube_url)).filter(Boolean),
            stack: error.stack?.slice(0, 500)
          }, 'Error processing batch');
          results.errors += batch.length;
        }
      }

      logger.info({ collected: results.collected, errors: results.errors }, '✅ Daily stats collection complete');

      return results;
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error in /collect-all-daily-stats');
      return reply.status(500).send({ error: 'Internal server error', message: error.message });
    }
  });

  /**
   * GET /youtube-data-api/campaign-stats-history/:campaignId
   * Get historical stats for a campaign
   */
  server.get('/youtube-data-api/campaign-stats-history/:campaignId', async (request, reply) => {
    const { campaignId } = request.params as { campaignId: string };
    const { days = '30' } = request.query as { days?: string };

    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));

      const { data, error } = await supabase
        .from('campaign_stats_daily')
        .select('*')
        .eq('campaign_id', campaignId)
        .gte('date', daysAgo.toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('collected_at', { ascending: true });

      if (error) {
        return reply.status(500).send({ error: 'Failed to fetch stats history', details: error.message });
      }

      return { campaignId, days: parseInt(days), stats: data || [] };
    } catch (error: any) {
      return reply.status(500).send({ error: 'Internal server error', message: error.message });
    }
  });
}

