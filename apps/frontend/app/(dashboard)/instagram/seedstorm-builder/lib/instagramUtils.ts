// Instagram URL processing and validation utilities

export interface InstagramPostInfo {
  handle?: string;
  postType: 'reel' | 'post' | 'story' | 'carousel';
  isValid: boolean;
  error?: string;
}

export const detectPostType = (url: string, oembedData?: any): 'reel' | 'post' | 'story' | 'carousel' => {
  // Check for specific URL patterns first
  if (url.includes('/reel/')) return 'reel';
  if (url.includes('/stories/')) return 'story';
  if (url.includes('/tv/')) return 'reel'; // IGTV is now merged with Reels
  
  // For /p/ URLs, try to detect carousel vs single post
  if (url.includes('/p/')) {
    // If we have oEmbed data, try to detect carousel from metadata
    if (oembedData) {
      // Look for indicators in title, description, or other metadata
      const title = oembedData.title?.toLowerCase() || '';
      const description = oembedData.description?.toLowerCase() || '';
      
      // Instagram sometimes includes carousel indicators in metadata
      if (title.includes('carousel') || description.includes('carousel') ||
          title.includes('slides') || description.includes('slides')) {
        return 'carousel';
      }
    }
    
    // Heuristic: /p/ URLs with certain characteristics might be carousels
    // This is limited without API access, but we can make educated guesses
    const postId = extractPostIdFromUrl(url);
    if (postId) {
      // Some patterns that might indicate carousels (very rough heuristic)
      // Instagram post IDs have certain patterns, but this is not foolproof
      const idLength = postId.length;
      const hasMultipleChars = /[A-Z].*[A-Z]|[a-z].*[a-z]/.test(postId);
      
      // Longer IDs or certain patterns might indicate carousels
      // This is a very rough approximation and should be improved with real API data
      if (idLength > 10 && hasMultipleChars) {
        return 'carousel';
      }
    }
    
    return 'post'; // Default for /p/ URLs
  }
  
  return 'reel'; // Default fallback
};

export const extractHandleFromUrl = (url: string): string | null => {
  try {
    // Match patterns like instagram.com/username/ or instagram.com/username/p/
    const match = url.match(/instagram\.com\/([^\/\?]+)/);
    if (match && match[1] && !['p', 'reel', 'stories', 'tv'].includes(match[1])) {
      return match[1].replace('@', '');
    }
    return null;
  } catch {
    return null;
  }
};

export const extractPostIdFromUrl = (url: string): string | null => {
  try {
    // Extract post ID from URLs like instagram.com/p/ABC123/ or instagram.com/reel/XYZ789/
    const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

export const generateInstagramPlaceholder = (url: string, postType: string, handle?: string): string => {
  const postId = extractPostIdFromUrl(url);
  const colors = getPostTypeGradient(postType);
  
  // Create a unique gradient based on post ID and type
  const gradientStyle = `linear-gradient(135deg, ${colors.from}, ${colors.to})`;
  
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.from}"/>
          <stop offset="100%" style="stop-color:${colors.to}"/>
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#gradient)"/>
      <circle cx="350" cy="50" r="20" fill="rgba(255,255,255,0.2)"/>
      <path d="M340 50 L350 40 L360 50 L350 60 Z" fill="white"/>
    </svg>
  `)}`;
};

const getPostTypeGradient = (type: string) => {
  switch (type.toLowerCase()) {
    case 'reel':
      return { from: 'hsl(270, 91%, 65%)', to: 'hsl(329, 86%, 70%)' }; // Enhanced Purple to Pink
    case 'story':
      return { from: 'hsl(25, 95%, 53%)', to: 'hsl(45, 93%, 47%)' }; // Enhanced Orange to Yellow
    case 'carousel':
      return { from: 'hsl(217, 91%, 60%)', to: 'hsl(188, 95%, 45%)' }; // Enhanced Blue to Cyan
    default:
      return { from: 'hsl(240, 5%, 34%)', to: 'hsl(0, 78%, 60%)' }; // Gray to Brand Red
  }
};

export const validateInstagramUrl = (url: string): InstagramPostInfo => {
  if (!url || url.trim() === '') {
    return {
      isValid: false,
      error: 'URL is required',
      postType: 'reel'
    };
  }

  const cleanUrl = url.trim();
  
  // Check if it's a valid Instagram URL
  const instagramRegex = /^https?:\/\/(www\.)?(instagram\.com|instagr\.am)\//;
  if (!instagramRegex.test(cleanUrl)) {
    return {
      isValid: false,
      error: 'Please enter a valid Instagram URL',
      postType: 'reel'
    };
  }

  // Check for specific post patterns
  const postPatterns = [
    /\/p\/[A-Za-z0-9_-]+/,    // Regular posts
    /\/reel\/[A-Za-z0-9_-]+/, // Reels
    /\/tv\/[A-Za-z0-9_-]+/,   // IGTV (now Reels)
    /\/stories\/[^\/]+\/[0-9]+/ // Stories
  ];

  const isValidPost = postPatterns.some(pattern => pattern.test(cleanUrl));
  
  if (!isValidPost) {
    return {
      isValid: false,
      error: 'URL must be a direct link to an Instagram post, reel, or story',
      postType: 'reel'
    };
  }

  const postType = detectPostType(cleanUrl);
  const handle = extractHandleFromUrl(cleanUrl);

  return {
    isValid: true,
    postType,
    handle: handle || undefined
  };
};

export const calculateEngagementRate = (views: number, likes: number, comments: number, shares: number = 0): number => {
  if (views === 0) return 0;
  const totalEngagements = likes + comments + shares;
  return (totalEngagements / views) * 100;
};

export const formatEngagementNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export const getCurrentDateTime = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};