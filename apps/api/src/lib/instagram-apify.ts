import { ApifyClient } from 'apify-client';
import { logger } from './logger';

// Apify configuration - API token must be set in environment
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN || '';
const INSTAGRAM_SCRAPER_ACTOR_ID = 'nH2AHrwxeTRJoN5hX';

if (!APIFY_API_TOKEN) {
  console.warn('⚠️ APIFY_API_TOKEN is not set. Instagram scraping will fail.');
}

// Initialize the Apify client
const client = new ApifyClient({
  token: APIFY_API_TOKEN,
});

// Types for Instagram post data
export interface InstagramPost {
  id: string;
  shortCode: string;
  caption: string;
  commentsCount: number;
  likesCount: number;
  timestamp: string;
  ownerUsername: string;
  ownerId: string;
  displayUrl: string;
  videoUrl?: string;
  videoViewCount?: number;
  isVideo: boolean;
  hashtags: string[];
  mentions: string[];
  locationName?: string;
  url: string;
  type: string;
}

export interface InstagramProfile {
  id: string;
  username: string;
  fullName: string;
  biography: string;
  followersCount: number;
  followsCount: number;
  postsCount: number;
  profilePicUrl: string;
  isVerified: boolean;
  isPrivate: boolean;
}

export interface InstagramScraperResult {
  posts: InstagramPost[];
  profile?: InstagramProfile;
  error?: string;
}

/**
 * Scrape Instagram posts for a given username or URL
 * @param usernames Array of Instagram usernames or URLs
 * @param resultsLimit Number of posts to fetch per account (default: 30)
 */
export async function scrapeInstagramPosts(
  usernames: string[],
  resultsLimit: number = 30
): Promise<InstagramScraperResult> {
  try {
    logger.info({ usernames, resultsLimit }, '🔄 Starting Instagram scraper');

    // Prepare Actor input
    const input = {
      username: usernames,
      resultsLimit,
    };

    // Run the Actor and wait for it to finish
    const run = await client.actor(INSTAGRAM_SCRAPER_ACTOR_ID).call(input);

    logger.info({ runId: run.id, status: run.status }, '✅ Apify Actor run completed');

    // Fetch results from the run's dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    // Transform the raw data into our format
    const posts: InstagramPost[] = items.map((item: any) => ({
      id: item.id || item.pk || String(item.timestamp),
      shortCode: item.shortCode || item.code || '',
      caption: item.caption || item.text || '',
      commentsCount: item.commentsCount || item.comments_count || 0,
      likesCount: item.likesCount || item.likes_count || item.like_count || 0,
      timestamp: item.timestamp || item.taken_at || new Date().toISOString(),
      ownerUsername: item.ownerUsername || item.username || '',
      ownerId: item.ownerId || item.owner_id || '',
      displayUrl: item.displayUrl || item.display_url || item.thumbnail_url || '',
      videoUrl: item.videoUrl || item.video_url || undefined,
      videoViewCount: item.videoViewCount || item.video_view_count || undefined,
      isVideo: item.isVideo || item.is_video || false,
      hashtags: item.hashtags || [],
      mentions: item.mentions || [],
      locationName: item.locationName || item.location?.name || undefined,
      url: item.url || `https://www.instagram.com/p/${item.shortCode || item.code}/`,
      type: item.type || (item.isVideo ? 'video' : 'image'),
    }));

    logger.info({ postCount: posts.length }, '📊 Processed Instagram posts');

    return { posts };
  } catch (error: any) {
    logger.error({ error: error.message }, '❌ Instagram scraper error');
    return {
      posts: [],
      error: error.message || 'Failed to scrape Instagram data',
    };
  }
}

/**
 * Scrape Instagram post by direct URL
 * @param postUrl Instagram post URL (e.g., https://www.instagram.com/p/ABC123/)
 */
export async function scrapeInstagramPost(postUrl: string): Promise<InstagramPost | null> {
  try {
    const result = await scrapeInstagramPosts([postUrl], 1);
    return result.posts[0] || null;
  } catch (error) {
    logger.error({ error, postUrl }, '❌ Error scraping single Instagram post');
    return null;
  }
}

/**
 * Calculate engagement metrics from posts
 */
export function calculateEngagementMetrics(posts: InstagramPost[]) {
  if (posts.length === 0) {
    return {
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      engagementRate: 0,
      avgLikesPerPost: 0,
      avgCommentsPerPost: 0,
      livePosts: 0,
    };
  }

  const totalLikes = posts.reduce((sum, post) => sum + post.likesCount, 0);
  const totalComments = posts.reduce((sum, post) => sum + post.commentsCount, 0);
  const totalViews = posts.reduce((sum, post) => sum + (post.videoViewCount || post.likesCount * 10), 0);
  
  // Estimate shares (Instagram doesn't expose this, we estimate ~1% of likes)
  const totalShares = Math.round(totalLikes * 0.01);

  // Engagement rate: (likes + comments) / estimated reach * 100
  const totalEngagements = totalLikes + totalComments;
  const estimatedReach = totalViews;
  const engagementRate = estimatedReach > 0 ? (totalEngagements / estimatedReach) * 100 : 0;

  return {
    totalViews,
    totalLikes,
    totalComments,
    totalShares,
    engagementRate: Math.round(engagementRate * 100) / 100,
    avgLikesPerPost: Math.round(totalLikes / posts.length),
    avgCommentsPerPost: Math.round(totalComments / posts.length),
    livePosts: posts.length,
  };
}

/**
 * Generate time series data from posts
 */
export function generateTimeSeriesData(posts: InstagramPost[]) {
  // Group posts by date
  const postsByDate = new Map<string, InstagramPost[]>();
  
  posts.forEach((post) => {
    const dateStr = new Date(post.timestamp).toISOString().split('T')[0] as string;
    const existing = postsByDate.get(dateStr) || [];
    postsByDate.set(dateStr, [...existing, post]);
  });

  // Convert to time series format
  const timeSeries = Array.from(postsByDate.entries())
    .map(([date, datePosts]) => {
      const likes = datePosts.reduce((sum, p) => sum + p.likesCount, 0);
      const comments = datePosts.reduce((sum, p) => sum + p.commentsCount, 0);
      const views = datePosts.reduce((sum, p) => sum + (p.videoViewCount || p.likesCount * 10), 0);
      const shares = Math.round(likes * 0.01);
      
      return {
        date,
        views,
        likes,
        comments,
        shares,
        engagement: views > 0 ? ((likes + comments) / views) * 100 : 0,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return timeSeries;
}

export { client as apifyClient };

