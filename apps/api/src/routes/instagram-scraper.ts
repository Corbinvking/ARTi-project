import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { 
  scrapeInstagramPosts, 
  scrapeInstagramPost,
  calculateEngagementMetrics,
  generateTimeSeriesData,
  InstagramPost 
} from '../lib/instagram-apify';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

// Request body types
interface ScrapePostsRequest {
  usernames: string[];
  resultsLimit?: number;
  campaignId?: number;
}

interface ScrapePostRequest {
  postUrl: string;
  campaignId?: number;
}

interface GetCampaignAnalyticsRequest {
  campaignId: number;
}

export default async function instagramScraperRoutes(fastify: FastifyInstance) {
  
  /**
   * POST /api/instagram-scraper/posts
   * Scrape Instagram posts for given usernames/URLs
   */
  fastify.post('/posts', async (
    request: FastifyRequest<{ Body: ScrapePostsRequest }>,
    reply: FastifyReply
  ) => {
    try {
      const { usernames, resultsLimit = 30, campaignId } = request.body;

      if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'usernames array is required',
        });
      }

      logger.info({ usernames, resultsLimit, campaignId }, '📸 Scraping Instagram posts');

      // Scrape the posts
      const result = await scrapeInstagramPosts(usernames, resultsLimit);

      if (result.error) {
        return reply.status(500).send({
          success: false,
          error: result.error,
        });
      }

      // Calculate metrics
      const metrics = calculateEngagementMetrics(result.posts);
      const timeSeries = generateTimeSeriesData(result.posts);

      // Store posts in database if campaignId is provided
      if (campaignId && result.posts.length > 0) {
        await storePosts(campaignId, result.posts);
      }

      return reply.send({
        success: true,
        data: {
          posts: result.posts,
          metrics,
          timeSeries,
          count: result.posts.length,
        },
      });
    } catch (error: any) {
      logger.error({ error: error.message }, '❌ Error in /posts endpoint');
      return reply.status(500).send({
        success: false,
        error: error.message || 'Internal server error',
      });
    }
  });

  /**
   * POST /api/instagram-scraper/post
   * Scrape a single Instagram post by URL
   */
  fastify.post('/post', async (
    request: FastifyRequest<{ Body: ScrapePostRequest }>,
    reply: FastifyReply
  ) => {
    try {
      const { postUrl, campaignId } = request.body;

      if (!postUrl) {
        return reply.status(400).send({
          success: false,
          error: 'postUrl is required',
        });
      }

      logger.info({ postUrl, campaignId }, '📸 Scraping single Instagram post');

      const post = await scrapeInstagramPost(postUrl);

      if (!post) {
        return reply.status(404).send({
          success: false,
          error: 'Post not found or could not be scraped',
        });
      }

      // Store post in database if campaignId is provided
      if (campaignId) {
        await storePosts(campaignId, [post]);
      }

      return reply.send({
        success: true,
        data: post,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, '❌ Error in /post endpoint');
      return reply.status(500).send({
        success: false,
        error: error.message || 'Internal server error',
      });
    }
  });

  /**
   * GET /api/instagram-scraper/campaign/:campaignId/analytics
   * Get analytics for a specific campaign from stored data
   */
  fastify.get('/campaign/:campaignId/analytics', async (
    request: FastifyRequest<{ Params: { campaignId: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const campaignId = parseInt(request.params.campaignId);

      if (isNaN(campaignId)) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid campaignId',
        });
      }

      logger.info({ campaignId }, '📊 Fetching campaign analytics');

      // Get stored posts for this campaign
      const { data: posts, error } = await supabase
        .from('instagram_posts')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('timestamp', { ascending: false });

      if (error) {
        logger.error({ error }, '❌ Error fetching posts from database');
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch campaign data',
        });
      }

      if (!posts || posts.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'No posts found for this campaign',
        });
      }

      // Transform database rows to InstagramPost format
      const transformedPosts: InstagramPost[] = posts.map((p: any) => ({
        id: p.instagram_post_id,
        shortCode: p.short_code,
        caption: p.caption || '',
        commentsCount: p.comments_count || 0,
        likesCount: p.likes_count || 0,
        timestamp: p.timestamp || p.created_at,
        ownerUsername: p.owner_username || '',
        ownerId: p.owner_id || '',
        displayUrl: p.display_url || '',
        videoUrl: p.video_url,
        videoViewCount: p.video_view_count,
        isVideo: p.is_video || false,
        hashtags: p.hashtags || [],
        mentions: p.mentions || [],
        locationName: p.location_name,
        url: p.post_url,
        type: p.post_type || 'image',
      }));

      // Calculate metrics
      const metrics = calculateEngagementMetrics(transformedPosts);
      const timeSeries = generateTimeSeriesData(transformedPosts);

      return reply.send({
        success: true,
        data: {
          posts: transformedPosts,
          metrics,
          timeSeries,
          count: transformedPosts.length,
        },
      });
    } catch (error: any) {
      logger.error({ error: error.message }, '❌ Error in /campaign/:campaignId/analytics');
      return reply.status(500).send({
        success: false,
        error: error.message || 'Internal server error',
      });
    }
  });

  /**
   * POST /api/instagram-scraper/campaign/:campaignId/refresh
   * Refresh analytics data for a campaign by re-scraping posts
   */
  fastify.post('/campaign/:campaignId/refresh', async (
    request: FastifyRequest<{ 
      Params: { campaignId: string },
      Body: { usernames?: string[], resultsLimit?: number }
    }>,
    reply: FastifyReply
  ) => {
    try {
      const campaignId = parseInt(request.params.campaignId);
      const { usernames, resultsLimit = 30 } = request.body || {};

      if (isNaN(campaignId)) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid campaignId',
        });
      }

      // If no usernames provided, try to get from campaign tracker/sound_url
      let targetUsernames = usernames;
      
      if (!targetUsernames || targetUsernames.length === 0) {
        const { data: campaign } = await supabase
          .from('instagram_campaigns')
          .select('tracker, sound_url')
          .eq('id', campaignId)
          .single();

        if (campaign?.tracker) {
          // Extract Instagram URLs from tracker
          const urls = extractInstagramUrls(campaign.tracker);
          if (urls.length > 0) {
            targetUsernames = urls;
          }
        }
      }

      if (!targetUsernames || targetUsernames.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'No Instagram usernames or URLs provided, and none found in campaign',
        });
      }

      logger.info({ campaignId, targetUsernames, resultsLimit }, '🔄 Refreshing campaign analytics');

      // Scrape new data
      const result = await scrapeInstagramPosts(targetUsernames, resultsLimit);

      if (result.error) {
        return reply.status(500).send({
          success: false,
          error: result.error,
        });
      }

      // Store the new posts
      if (result.posts.length > 0) {
        await storePosts(campaignId, result.posts);
      }

      // Calculate metrics
      const metrics = calculateEngagementMetrics(result.posts);
      const timeSeries = generateTimeSeriesData(result.posts);

      return reply.send({
        success: true,
        data: {
          posts: result.posts,
          metrics,
          timeSeries,
          count: result.posts.length,
          message: `Refreshed ${result.posts.length} posts for campaign ${campaignId}`,
        },
      });
    } catch (error: any) {
      logger.error({ error: error.message }, '❌ Error in /campaign/:campaignId/refresh');
      return reply.status(500).send({
        success: false,
        error: error.message || 'Internal server error',
      });
    }
  });
}

/**
 * Store posts in the database
 */
async function storePosts(campaignId: number, posts: InstagramPost[]): Promise<void> {
  try {
    const postsToInsert = posts.map((post) => ({
      campaign_id: campaignId,
      instagram_post_id: post.id,
      short_code: post.shortCode,
      caption: post.caption,
      comments_count: post.commentsCount,
      likes_count: post.likesCount,
      timestamp: post.timestamp,
      owner_username: post.ownerUsername,
      owner_id: post.ownerId,
      display_url: post.displayUrl,
      video_url: post.videoUrl,
      video_view_count: post.videoViewCount,
      is_video: post.isVideo,
      hashtags: post.hashtags,
      mentions: post.mentions,
      location_name: post.locationName,
      post_url: post.url,
      post_type: post.type,
    }));

    // Upsert posts (update if exists, insert if new)
    const { error } = await supabase
      .from('instagram_posts')
      .upsert(postsToInsert, {
        onConflict: 'campaign_id,instagram_post_id',
        ignoreDuplicates: false,
      });

    if (error) {
      logger.error({ error }, '❌ Error storing posts in database');
      throw error;
    }

    logger.info({ campaignId, postCount: posts.length }, '✅ Posts stored in database');
  } catch (error) {
    logger.error({ error }, '❌ Error in storePosts');
    throw error;
  }
}

/**
 * Extract Instagram URLs from text
 */
function extractInstagramUrls(text: string): string[] {
  const urlRegex = /https?:\/\/(www\.)?instagram\.com\/[^\s]+/gi;
  const matches = text.match(urlRegex) || [];
  return matches;
}

