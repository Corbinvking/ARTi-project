/**
 * YouTube URL utilities for consistent link handling
 */

/**
 * Extracts video ID from various YouTube URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  
  // Clean the URL
  const cleanUrl = url.trim();
  
  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
    /(?:youtube\.com\/v\/)([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Creates a canonical YouTube watch URL from a video ID
 */
export function createCanonicalYouTubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Gets a clean, canonical YouTube URL from any YouTube URL format
 * This ensures consistent URLs that work reliably across different contexts
 */
export function getCanonicalYouTubeUrl(url: string): string {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    // Return the original URL if we can't extract a video ID
    return url.trim();
  }
  return createCanonicalYouTubeUrl(videoId);
}

/**
 * Sanitizes a YouTube URL for form input - trims whitespace and normalizes format
 */
export function sanitizeYouTubeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  
  // Return canonical format to ensure consistency
  return getCanonicalYouTubeUrl(trimmed);
}

/**
 * Gets a YouTube embed URL from a video ID or any YouTube URL format
 * This is safe for embedding in iframes, unlike watch URLs
 */
export function getYouTubeEmbedUrl(urlOrId: string): string {
  const videoId = extractYouTubeVideoId(urlOrId);
  if (!videoId) {
    // If we can't extract a video ID, assume it's already an ID
    return `https://www.youtube.com/embed/${urlOrId}`;
  }
  return `https://www.youtube.com/embed/${videoId}`;
}