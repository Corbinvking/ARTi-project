/**
 * Calculate monthly repost limit based on SoundCloud follower count
 * Tier 1: <100k followers = 1 repost per month
 * Tier 2: <500k followers = 2 reposts per month  
 * Tier 3: <5M followers = 3 reposts per month
 * Tier 4: 5M+ followers = 3 reposts per month (max)
 */
export const calculateRepostLimit = (followerCount: number | undefined | null): number => {
  if (!followerCount || followerCount < 0) return 1; // Default to T1
  if (followerCount < 100000) return 1;
  if (followerCount < 500000) return 2;
  if (followerCount < 5000000) return 3;
  return 3; // Max limit for 5M+ followers
};

/**
 * Get tier name based on follower count
 */
export const getFollowerTier = (followerCount: number | undefined | null): string => {
  if (!followerCount || followerCount < 0) return 'T1 (<100k)'; // Default to T1
  if (followerCount < 100000) return 'T1 (<100k)';
  if (followerCount < 500000) return 'T2 (<500k)';
  if (followerCount < 5000000) return 'T3 (<5M)';
  return 'T4 (5M+)';
};

/**
 * Format follower count for display
 */
export const formatFollowerCount = (count: number | undefined | null): string => {
  // Handle undefined, null, or invalid values
  if (count === undefined || count === null || isNaN(count)) {
    return '0';
  }
  
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
};