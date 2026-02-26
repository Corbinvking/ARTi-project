import { ApifyClient } from 'apify-client';
import { logger } from './logger';

// Apify configuration - API token must be set in environment
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN || '';
const INSTAGRAM_PROFILE_SCRAPER_ID = 'nH2AHrwxeTRJoN5hX';
const INSTAGRAM_REEL_SCRAPER_ID = 'xMc5Ga1oCONPmWJIa';

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
 * Options for scrapeInstagramPosts (Apify actor input)
 */
export interface ScrapeInstagramPostsOptions {
  /** If true, pinned posts are skipped when they don't match the date filter (per Apify docs) */
  skipPinnedPosts?: boolean;
}

/**
 * Scrape Instagram posts for a given username or URL
 * @param usernames Array of Instagram usernames or URLs
 * @param resultsLimit Number of posts to fetch per account (default: 30)
 * @param options Optional: skipPinnedPosts (per insta-scraper docs)
 */
export async function scrapeInstagramPosts(
  usernames: string[],
  resultsLimit: number = 30,
  options?: ScrapeInstagramPostsOptions
): Promise<InstagramScraperResult> {
  try {
    logger.info({ usernames, resultsLimit, options }, '🔄 Starting Instagram scraper');

    // Prepare Actor input (align with apify/instagram-post-scraper)
    const input: Record<string, unknown> = {
      username: usernames,
      resultsLimit,
    };
    if (options?.skipPinnedPosts !== undefined) {
      input.skipPinnedPosts = options.skipPinnedPosts;
    }

    // Run the Actor and wait for it to finish
    const run = await client.actor(INSTAGRAM_PROFILE_SCRAPER_ID).call(input);

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
      videoViewCount: item.videoPlayCount || item.videoViewCount || item.video_view_count || item.video_play_count || undefined,
      isVideo: item.isVideo || item.is_video || false,
      hashtags: item.hashtags || [],
      mentions: item.mentions || [],
      locationName: item.locationName || item.location?.name || undefined,
      url: item.url || `https://www.instagram.com/p/${item.shortCode || item.code}/`,
      type: item.type || (item.isVideo ? 'video' : 'image'),
    }));

    logger.info({ postCount: posts.length }, '📊 Processed Instagram posts');

    // Extract profile info from the first raw item if available
    const firstItem: any = items[0];
    let profile: InstagramProfile | undefined;
    if (firstItem) {
      const followersCount = firstItem.followersCount ?? firstItem.ownerFollowersCount ?? firstItem.followers_count;
      if (followersCount != null) {
        profile = {
          id: firstItem.ownerId || firstItem.owner_id || firstItem.id || '',
          username: firstItem.ownerUsername || firstItem.username || usernames[0] || '',
          fullName: firstItem.ownerFullName || firstItem.full_name || '',
          biography: firstItem.biography || '',
          followersCount: Number(followersCount),
          followsCount: Number(firstItem.followsCount ?? firstItem.followingCount ?? 0),
          postsCount: Number(firstItem.postsCount ?? firstItem.mediaCount ?? 0),
          profilePicUrl: firstItem.profilePicUrl || firstItem.profile_pic_url || '',
          isVerified: firstItem.isVerified ?? firstItem.verified ?? false,
          isPrivate: firstItem.isPrivate ?? firstItem.is_private ?? false,
        };
        logger.info({ username: profile.username, followers: profile.followersCount }, '👤 Extracted profile info');
      }
    }

    return { posts, ...(profile ? { profile } : {}) };
  } catch (error: any) {
    logger.error({ error: error.message }, '❌ Instagram scraper error');
    return {
      posts: [],
      error: error.message || 'Failed to scrape Instagram data',
    };
  }
}

/**
 * Scrape a single Instagram post/reel by direct URL.
 * Tries the official apify/instagram-reel-scraper (xMc5Ga1oCONPmWJIa) first,
 * then falls back to the profile scraper if it fails.
 */
export async function scrapeInstagramPost(postUrl: string): Promise<InstagramPost | null> {
  const post = await scrapeWithReelActor(postUrl);
  if (post) return post;

  logger.info({ postUrl }, '🔄 Falling back to profile scraper for individual post');
  try {
    const result = await scrapeInstagramPosts([postUrl], 1);
    return result.posts[0] || null;
  } catch (error: any) {
    logger.error({ error: error.message, postUrl }, '❌ Fallback scraper also failed');
    return null;
  }
}

function mapRawItemToPost(item: any, fallbackUrl: string): InstagramPost {
  return {
    id: item.id || item.pk || item.shortCode || '',
    shortCode: item.shortCode || item.code || '',
    caption: item.caption || item.text || '',
    commentsCount: item.commentsCount ?? item.comments_count ?? 0,
    likesCount: item.likesCount ?? item.likes_count ?? item.like_count ?? 0,
    timestamp: item.timestamp || item.taken_at || new Date().toISOString(),
    ownerUsername: item.ownerUsername || item.username || item.user?.username || '',
    ownerId: item.ownerId || item.owner_id || item.user?.pk || '',
    displayUrl: item.displayUrl || item.display_url || item.thumbnail_url || item.image_versions2?.candidates?.[0]?.url || '',
    videoUrl: item.videoUrl || item.video_url || item.video_versions?.[0]?.url || undefined,
    videoViewCount: item.videoPlayCount ?? item.videoViewCount ?? item.video_play_count ?? item.view_count ?? item.play_count ?? undefined,
    isVideo: item.isVideo ?? item.is_video ?? (item.media_type === 2 || item.type === 'Video'),
    hashtags: item.hashtags || [],
    mentions: item.mentions || [],
    locationName: item.locationName || item.location?.name || undefined,
    url: item.url || fallbackUrl,
    type: item.type || item.product_type || (item.isVideo ? 'video' : 'image'),
  };
}

async function scrapeWithReelActor(postUrl: string): Promise<InstagramPost | null> {
  try {
    logger.info({ postUrl }, '🔄 Scraping reel via apify/instagram-reel-scraper');

    const input = {
      username: [postUrl],
      resultsLimit: 1,
      skipPinnedPosts: false,
      includeSharesCount: false,
      includeTranscript: false,
      includeDownloadedVideo: false,
    };

    const run = await client.actor(INSTAGRAM_REEL_SCRAPER_ID).call(input);
    logger.info({ runId: run.id, status: run.status }, '✅ Reel scraper run completed');

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    if (!items || items.length === 0) {
      logger.warn({ postUrl }, '⚠️ Reel scraper returned no data');
      return null;
    }

    const item: any = items[0];

    const post: InstagramPost = {
      id: item.id || item.shortCode || '',
      shortCode: item.shortCode || '',
      caption: item.caption || '',
      commentsCount: item.commentsCount ?? 0,
      likesCount: item.likesCount ?? 0,
      timestamp: item.timestamp || new Date().toISOString(),
      ownerUsername: item.ownerUsername || '',
      ownerId: item.ownerId || '',
      displayUrl: item.displayUrl || item.images?.[0] || '',
      videoUrl: item.videoUrl || undefined,
      videoViewCount: item.videoPlayCount ?? item.videoViewCount ?? undefined,
      isVideo: item.type === 'Video' || item.productType === 'clips',
      hashtags: item.hashtags || [],
      mentions: item.mentions || [],
      url: item.url || postUrl,
      type: item.productType || item.type || 'video',
    };

    logger.info({
      shortCode: post.shortCode,
      views: post.videoViewCount,
      likes: post.likesCount,
      comments: post.commentsCount,
      displayUrl: post.displayUrl ? 'present' : 'missing',
    }, '📊 Reel scrape result');

    return post;
  } catch (error: any) {
    logger.warn({ error: error.message, postUrl }, '⚠️ Reel scraper unavailable, will try fallback');
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
      // Computed metrics
      sentimentScore: 0,
      relevanceScore: 0,
      viralityScore: 0,
      growthRate: 0,
      peakEngagementDay: null,
      topHashtags: [],
      avgPostsPerDay: 0,
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

  // === COMPUTED METRICS ===
  
  // Sentiment Score: Based on comments-to-likes ratio (higher ratio = more engagement/discussion)
  // Scale: 0-100 where 50 is average
  const commentsToLikesRatio = totalLikes > 0 ? (totalComments / totalLikes) : 0;
  // Typical ratio is 1-5%, so 3% = 50 score
  const sentimentScore = Math.min(100, Math.max(0, Math.round((commentsToLikesRatio / 0.03) * 50)));
  
  // Relevance Score: Based on hashtag coverage and content consistency
  const allHashtags = posts.flatMap(p => p.hashtags || []);
  const uniqueHashtags = new Set(allHashtags);
  const hashtagDiversity = uniqueHashtags.size / Math.max(1, allHashtags.length);
  // Higher diversity with good engagement = higher relevance
  const relevanceScore = Math.min(100, Math.max(0, Math.round(
    (engagementRate * 10) + (hashtagDiversity * 30) + (posts.length * 2)
  )));
  
  // Virality Score: Based on views-to-engagement conversion
  const viralityConversion = totalViews > 0 ? (totalEngagements / totalViews) * 100 : 0;
  const viralityScore = Math.min(100, Math.max(0, Math.round(viralityConversion * 20)));
  
  // Growth Rate: Compare first half vs second half of posts (by timestamp)
  const sortedPosts = [...posts].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const midpoint = Math.floor(sortedPosts.length / 2);
  const firstHalf = sortedPosts.slice(0, midpoint);
  const secondHalf = sortedPosts.slice(midpoint);
  
  const firstHalfEngagement = firstHalf.reduce((sum, p) => sum + p.likesCount + p.commentsCount, 0);
  const secondHalfEngagement = secondHalf.reduce((sum, p) => sum + p.likesCount + p.commentsCount, 0);
  
  const growthRate = firstHalfEngagement > 0 
    ? ((secondHalfEngagement - firstHalfEngagement) / firstHalfEngagement) * 100 
    : 0;
  
  // Peak Engagement Day: Find the day with highest engagement
  const engagementByDay: Record<string, number> = {};
  posts.forEach(post => {
    const day = post.timestamp?.split('T')[0] || new Date().toISOString().split('T')[0];
    if (day) {
      engagementByDay[day] = (engagementByDay[day] || 0) + post.likesCount + post.commentsCount;
    }
  });
  
  const peakDay = Object.entries(engagementByDay).reduce((max, [day, eng]) => 
    eng > (max.engagement || 0) ? { day, engagement: eng } : max, 
    { day: '', engagement: 0 }
  );
  
  // Top Hashtags: Most used across all posts
  const hashtagCounts: Record<string, number> = {};
  allHashtags.forEach(tag => {
    hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
  });
  const topHashtags = Object.entries(hashtagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);
  
  // Average posts per day
  const timestamps = posts.map(p => new Date(p.timestamp).getTime());
  const dateRange = timestamps.length > 1 
    ? (Math.max(...timestamps) - Math.min(...timestamps)) / (1000 * 60 * 60 * 24)
    : 1;
  const avgPostsPerDay = posts.length / Math.max(1, dateRange);

  return {
    totalViews,
    totalLikes,
    totalComments,
    totalShares,
    engagementRate: Math.round(engagementRate * 100) / 100,
    avgLikesPerPost: Math.round(totalLikes / posts.length),
    avgCommentsPerPost: Math.round(totalComments / posts.length),
    livePosts: posts.length,
    // Computed metrics
    sentimentScore,
    relevanceScore,
    viralityScore,
    growthRate: Math.round(growthRate * 10) / 10,
    peakEngagementDay: peakDay.day || null,
    topHashtags,
    avgPostsPerDay: Math.round(avgPostsPerDay * 10) / 10,
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

