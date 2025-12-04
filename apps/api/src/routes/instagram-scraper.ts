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

export default async function instagramScraperRoutes(fastify: FastifyInstance) {
  
  /**
   * POST /api/instagram-scraper/batch
   * Run batch scraping for all campaigns with scraper_enabled = true
   * This is the endpoint called by the cron job
   */
  fastify.post('/batch', async (
    request: FastifyRequest<{ Body: { resultsLimit?: number, dryRun?: boolean } }>,
    reply: FastifyReply
  ) => {
    try {
      const { resultsLimit = 30, dryRun = false } = request.body || {};
      
      logger.info({ resultsLimit, dryRun }, '🚀 Starting batch Instagram scraper');
      
      // Fetch all campaigns with scraper_enabled = true and instagram_url set
      const { data: campaigns, error: fetchError } = await supabase
        .from('instagram_campaigns')
        .select('id, campaign, clients, instagram_url, last_scraped_at')
        .eq('scraper_enabled', true)
        .not('instagram_url', 'is', null);
      
      if (fetchError) {
        logger.error({ error: fetchError }, '❌ Error fetching campaigns for batch scrape');
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch campaigns',
        });
      }
      
      if (!campaigns || campaigns.length === 0) {
        logger.info('📭 No campaigns with scraper enabled found');
        return reply.send({
          success: true,
          message: 'No campaigns to scrape',
          data: {
            processed: 0,
            succeeded: 0,
            failed: 0,
            campaigns: [],
          },
        });
      }
      
      logger.info({ campaignCount: campaigns.length }, `📋 Found ${campaigns.length} campaigns to scrape`);
      
      if (dryRun) {
        return reply.send({
          success: true,
          message: 'Dry run - no scraping performed',
          data: {
            campaigns: campaigns.map(c => ({
              id: c.id,
              name: c.campaign,
              client: c.clients,
              instagram_url: c.instagram_url,
              last_scraped_at: c.last_scraped_at,
            })),
          },
        });
      }
      
      // Process each campaign
      const results: {
        campaignId: number;
        name: string;
        status: 'success' | 'failed';
        postsScraped?: number;
        error?: string;
      }[] = [];
      
      for (const campaign of campaigns) {
        try {
          logger.info({ 
            campaignId: campaign.id, 
            name: campaign.campaign,
            url: campaign.instagram_url 
          }, `📸 Scraping campaign: ${campaign.campaign}`);
          
          // Parse the instagram_url (could be profile URL or post URL)
          const urls = [campaign.instagram_url];
          
          // Scrape posts
          const result = await scrapeInstagramPosts(urls, resultsLimit);
          
          if (result.error) {
            results.push({
              campaignId: campaign.id,
              name: campaign.campaign || `Campaign ${campaign.id}`,
              status: 'failed',
              error: result.error,
            });
            continue;
          }
          
          // Store posts
          if (result.posts.length > 0) {
            await storePostsWithUpdate(campaign.id, result.posts);
          }
          
          results.push({
            campaignId: campaign.id,
            name: campaign.campaign || `Campaign ${campaign.id}`,
            status: 'success',
            postsScraped: result.posts.length,
          });
          
          // Rate limiting between campaigns (2 seconds)
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error: any) {
          logger.error({ 
            error: error.message, 
            campaignId: campaign.id 
          }, `❌ Error scraping campaign ${campaign.id}`);
          
          results.push({
            campaignId: campaign.id,
            name: campaign.campaign || `Campaign ${campaign.id}`,
            status: 'failed',
            error: error.message,
          });
        }
      }
      
      const succeeded = results.filter(r => r.status === 'success').length;
      const failed = results.filter(r => r.status === 'failed').length;
      const totalPosts = results.reduce((sum, r) => sum + (r.postsScraped || 0), 0);
      
      logger.info({ 
        processed: campaigns.length, 
        succeeded, 
        failed, 
        totalPosts 
      }, '✅ Batch scraping complete');
      
      return reply.send({
        success: true,
        message: `Batch scraping complete: ${succeeded} succeeded, ${failed} failed`,
        data: {
          processed: campaigns.length,
          succeeded,
          failed,
          totalPosts,
          results,
        },
      });
    } catch (error: any) {
      logger.error({ error: error.message }, '❌ Fatal error in batch scraper');
      return reply.status(500).send({
        success: false,
        error: error.message || 'Internal server error',
      });
    }
  });

  /**
   * GET /api/instagram-scraper/campaigns
   * List all campaigns with their scraper status
   */
  fastify.get('/campaigns', async (
    _request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      const { data: campaigns, error } = await supabase
        .from('instagram_campaigns')
        .select('id, campaign, clients, instagram_url, scraper_enabled, last_scraped_at, created_at')
        .order('id', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      const enabledCount = campaigns?.filter(c => c.scraper_enabled).length || 0;
      const withUrlCount = campaigns?.filter(c => c.instagram_url).length || 0;
      
      return reply.send({
        success: true,
        data: {
          campaigns: campaigns || [],
          stats: {
            total: campaigns?.length || 0,
            scraperEnabled: enabledCount,
            withInstagramUrl: withUrlCount,
          },
        },
      });
    } catch (error: any) {
      logger.error({ error: error.message }, '❌ Error fetching campaigns');
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * PATCH /api/instagram-scraper/campaign/:campaignId
   * Update campaign scraper settings (instagram_url, scraper_enabled)
   */
  fastify.patch('/campaign/:campaignId', async (
    request: FastifyRequest<{ 
      Params: { campaignId: string },
      Body: { instagram_url?: string, scraper_enabled?: boolean }
    }>,
    reply: FastifyReply
  ) => {
    try {
      const campaignId = parseInt(request.params.campaignId);
      const { instagram_url, scraper_enabled } = request.body || {};
      
      if (isNaN(campaignId)) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid campaignId',
        });
      }
      
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      
      if (instagram_url !== undefined) {
        updateData.instagram_url = instagram_url;
      }
      
      if (scraper_enabled !== undefined) {
        updateData.scraper_enabled = scraper_enabled;
      }
      
      const { data, error } = await supabase
        .from('instagram_campaigns')
        .update(updateData)
        .eq('id', campaignId)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      logger.info({ campaignId, updateData }, '✅ Campaign scraper settings updated');
      
      return reply.send({
        success: true,
        data,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, '❌ Error updating campaign');
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

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

/**
 * Store posts in the database
 */
async function storePostsWithUpdate(campaignId: number, posts: InstagramPost[]): Promise<void> {
  try {
    // First store the posts
    await storePosts(campaignId, posts);
    
    // Then update the campaign's last_scraped_at timestamp
    const { error: updateError } = await supabase
      .from('instagram_campaigns')
      .update({ 
        last_scraped_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId);
    
    if (updateError) {
      logger.error({ error: updateError, campaignId }, '⚠️ Error updating campaign last_scraped_at');
    }
  } catch (error) {
    logger.error({ error, campaignId }, '❌ Error in storePostsWithUpdate');
    throw error;
  }
}

