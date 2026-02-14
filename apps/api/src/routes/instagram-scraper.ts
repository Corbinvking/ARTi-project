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
   * Run batch scraping for ALL active campaigns with valid instagram_url
   * Skips only campaigns with status = 'inactive'
   * This is the endpoint called by the cron job
   */
  fastify.post('/batch', async (
    request: FastifyRequest<{ Body: { resultsLimit?: number, dryRun?: boolean } }>,
    reply: FastifyReply
  ) => {
    try {
      const { resultsLimit = 30, dryRun = false } = request.body || {};
      
      logger.info({ resultsLimit, dryRun }, '🚀 Starting batch Instagram scraper');

      // Fetch ALL active campaigns that have instagram_url, tracker, or sound_url (any can contain Instagram links)
      const { data: allCampaigns, error: fetchError } = await supabase
        .from('instagram_campaigns')
        .select('id, campaign, clients, instagram_url, tracker, sound_url, status, last_scraped_at');

      if (fetchError) {
        logger.error({ error: fetchError }, '❌ Error fetching campaigns for batch scrape');
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch campaigns',
        });
      }

      // Filter out inactive campaigns
      const activeCampaigns = allCampaigns?.filter(c => {
        const status = (c.status || '').toLowerCase();
        return !status.includes('inactive') && !status.includes('cancelled') && !status.includes('canceled');
      }) || [];

      // Resolve scrape URL per campaign: instagram_url first, else Instagram URLs from tracker, else sound_url if Instagram
      const campaignsWithUrls = activeCampaigns
        .map((c: any) => {
          let urls: string[] = [];
          if (c.instagram_url?.trim()) {
            urls = [c.instagram_url.trim()];
          } else if (c.tracker?.trim()) {
            urls = extractInstagramUrls(c.tracker);
          }
          if (urls.length === 0 && c.sound_url?.trim()) {
            const fromSound = extractInstagramUrls(c.sound_url);
            if (fromSound.length > 0) urls = fromSound;
          }
          return { ...c, _scrapeUrls: urls };
        })
        .filter((c: any) => c._scrapeUrls.length > 0);

      const skippedCount = (allCampaigns?.length || 0) - activeCampaigns.length;
      const noUrlCount = activeCampaigns.length - campaignsWithUrls.length;
      if (skippedCount > 0 || noUrlCount > 0) {
        logger.info({ skippedCount, noUrlCount }, `⏭️ Skipped ${skippedCount} inactive, ${noUrlCount} with no Instagram URL`);
      }

      if (campaignsWithUrls.length === 0) {
        logger.info('📭 No active campaigns with Instagram URLs (instagram_url, tracker, or sound_url) found');
        return reply.send({
          success: true,
          message: 'No campaigns to scrape',
          data: {
            processed: 0,
            succeeded: 0,
            failed: 0,
            skipped: skippedCount + noUrlCount,
            campaigns: [],
          },
        });
      }

      logger.info({ campaignCount: campaignsWithUrls.length }, `📋 Found ${campaignsWithUrls.length} campaigns to scrape`);

      if (dryRun) {
        return reply.send({
          success: true,
          message: 'Dry run - no scraping performed',
          data: {
            campaigns: campaignsWithUrls.map((c: any) => ({
              id: c.id,
              name: c.campaign,
              client: c.clients,
              instagram_url: c.instagram_url,
              scrape_urls: c._scrapeUrls,
              last_scraped_at: c.last_scraped_at,
            })),
          },
        });
      }

      const results: {
        campaignId: number;
        name: string;
        status: 'success' | 'failed';
        postsScraped?: number;
        error?: string;
      }[] = [];

      for (const campaign of campaignsWithUrls) {
        const urls = campaign._scrapeUrls as string[];
        try {
          logger.info({
            campaignId: campaign.id,
            name: campaign.campaign,
            urls,
          }, `📸 Scraping campaign: ${campaign.campaign}`);
          
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
      
      const processedCount = campaignsWithUrls.length;
      logger.info({
        processed: processedCount,
        succeeded,
        failed,
        totalPosts,
        skipped: skippedCount + noUrlCount,
      }, '✅ Batch scraping complete');

      return reply.send({
        success: true,
        message: `Batch scraping complete: ${succeeded} succeeded, ${failed} failed, ${skippedCount + noUrlCount} skipped`,
        data: {
          processed: processedCount,
          succeeded,
          failed,
          skipped: skippedCount + noUrlCount,
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
   * Shows which campaigns will be automatically scraped (active + has instagram_url)
   */
  fastify.get('/campaigns', async (
    _request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      const { data: campaigns, error } = await supabase
        .from('instagram_campaigns')
        .select('id, campaign, clients, instagram_url, status, last_scraped_at, created_at')
        .order('id', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      // Calculate stats based on new logic
      const withUrlCount = campaigns?.filter(c => c.instagram_url).length || 0;
      const activeWithUrl = campaigns?.filter(c => {
        const status = (c.status || '').toLowerCase();
        const isInactive = status.includes('inactive') || status.includes('cancelled') || status.includes('canceled');
        return c.instagram_url && !isInactive;
      }).length || 0;
      const inactiveCount = campaigns?.filter(c => {
        const status = (c.status || '').toLowerCase();
        return status.includes('inactive') || status.includes('cancelled') || status.includes('canceled');
      }).length || 0;
      
      // Add a computed field showing if campaign will be scraped
      const enrichedCampaigns = campaigns?.map(c => {
        const status = (c.status || '').toLowerCase();
        const isInactive = status.includes('inactive') || status.includes('cancelled') || status.includes('canceled');
        return {
          ...c,
          will_be_scraped: c.instagram_url && !isInactive,
        };
      }) || [];
      
      return reply.send({
        success: true,
        data: {
          campaigns: enrichedCampaigns,
          stats: {
            total: campaigns?.length || 0,
            withInstagramUrl: withUrlCount,
            activeWithUrl: activeWithUrl, // Will be scraped
            inactive: inactiveCount,      // Skipped
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
   * GET /api/instagram-scraper/posts-by-sound
   * Search posts by sound (campaign name) and/or creator (clients). Returns posts with campaign_name and clients attached.
   */
  fastify.get('/posts-by-sound', async (
    request: FastifyRequest<{ Querystring: { sound?: string; creator?: string; limit?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { sound, creator, limit: limitParam } = request.query || {};
      const limit = Math.min(Math.max(parseInt(limitParam || '100', 10) || 100, 1), 200);

      let campaignsQuery = supabase
        .from('instagram_campaigns')
        .select('id, campaign, clients');

      if (sound?.trim()) {
        campaignsQuery = campaignsQuery.ilike('campaign', `%${sound.trim()}%`);
      }
      if (creator?.trim()) {
        campaignsQuery = campaignsQuery.ilike('clients', `%${creator.trim()}%`);
      }

      const { data: campaigns, error: campaignsError } = await campaignsQuery;

      if (campaignsError) {
        logger.error({ error: campaignsError }, '❌ Error fetching campaigns for posts-by-sound');
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch campaigns',
        });
      }

      if (!campaigns || campaigns.length === 0) {
        return reply.send({
          success: true,
          data: { posts: [], total: 0 },
        });
      }

      const campaignIds = campaigns.map((c: any) => c.id);
      const campaignById = new Map(campaigns.map((c: any) => [c.id, c]));

      const { data: postsRows, error: postsError } = await supabase
        .from('instagram_posts')
        .select('*')
        .in('campaign_id', campaignIds)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (postsError) {
        logger.error({ error: postsError }, '❌ Error fetching posts for posts-by-sound');
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch posts',
        });
      }

      const posts = (postsRows || []).map((p: any) => {
        const campaign = campaignById.get(p.campaign_id);
        return {
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
          campaign_name: campaign?.campaign || '',
          clients: campaign?.clients || '',
        };
      });

      return reply.send({
        success: true,
        data: { posts, total: posts.length },
      });
    } catch (error: any) {
      logger.error({ error: error.message }, '❌ Error in posts-by-sound');
      return reply.status(500).send({
        success: false,
        error: error.message || 'Internal server error',
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

      // If no usernames provided, use campaign instagram_url first, then tracker
      let targetUsernames = usernames;

      if (!targetUsernames || targetUsernames.length === 0) {
        const { data: campaign } = await supabase
          .from('instagram_campaigns')
          .select('instagram_url, tracker, sound_url')
          .eq('id', campaignId)
          .single();

        if (campaign?.instagram_url) {
          targetUsernames = [campaign.instagram_url];
        } else if (campaign?.tracker) {
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

