import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Eye, Share2, ExternalLink, Instagram } from "lucide-react";
import { formatNumber } from "../lib/localStorage";
import { generateInstagramPlaceholder, extractHandleFromUrl, extractPostIdFromUrl, detectPostType } from "../lib/instagramUtils";

interface PostPreviewCardProps {
  post: {
    id: string;
    instagram_handle: string;
    post_type: string;
    posted_at: string | null;
    thumbnail_url?: string;
    content_description?: string;
    post_url?: string;
    analytics?: {
      views: number;
      likes: number;
      comments: number;
      shares: number;
      engagement_rate: number;
    };
  };
}

const PostPreviewCard = ({ post }: PostPreviewCardProps) => {
  const handleCardClick = () => {
    if (post.post_url) {
      window.open(post.post_url, '_blank', 'noopener,noreferrer');
    }
  };

  const displayType = React.useMemo(() => {
    try {
      if (post.post_url) {
        const detected = detectPostType(post.post_url);
        if (post.post_type?.toLowerCase() === 'post' && detected && detected !== 'post') {
          return detected;
        }
      }
    } catch {}
    return post.post_type;
  }, [post.post_url, post.post_type]);

  const getPostTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'reel':
        return 'bg-[var(--gradient-reel)] hover:opacity-90 transition-opacity';
      case 'story':
        return 'bg-[var(--gradient-story)] hover:opacity-90 transition-opacity';
      case 'carousel':
        return 'bg-[var(--gradient-carousel)] hover:opacity-90 transition-opacity';
      default:
        return 'bg-[var(--gradient-post)] hover:opacity-90 transition-opacity';
    }
  };

  const getEnhancedThumbnail = () => {
    // If we have a real thumbnail, use it
    if (post.thumbnail_url && !post.thumbnail_url.startsWith('data:image/svg+xml')) {
      return post.thumbnail_url;
    }
    
    // Generate enhanced placeholder
    if (post.post_url) {
      const handle = extractHandleFromUrl(post.post_url) || post.instagram_handle.replace('@', '');
      return generateInstagramPlaceholder(post.post_url, displayType, handle);
    }
    
    return null;
  };

  const getTimeAgo = (postedAt: string | null) => {
    if (!postedAt) return 'Not posted yet';
    
    const now = new Date();
    const posted = new Date(postedAt);
    const diffInHours = Math.floor((now.getTime() - posted.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <Card 
      className={`w-32 aspect-[9/16] hover:shadow-lg transition-all duration-300 group ${
        post.post_url ? 'cursor-pointer hover:shadow-xl hover:scale-[1.02]' : ''
      }`}
      onClick={post.post_url ? handleCardClick : undefined}
      role={post.post_url ? "button" : undefined}
      tabIndex={post.post_url ? 0 : undefined}
      aria-label={post.post_url ? `View Instagram post by @${post.instagram_handle}` : undefined}
      onKeyDown={(e) => {
        if (post.post_url && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      <CardContent className="p-2 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-primary">
                {post.instagram_handle.charAt(0).toUpperCase()}
              </span>
            </div>
            {post.post_url && (
              <ExternalLink className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
          <Badge 
            variant="secondary" 
            className={`text-white text-xs px-1 py-0.5 ${getPostTypeColor(displayType)}`}
          >
            {displayType.toUpperCase()}
          </Badge>
        </div>

        {/* Username and Time */}
        <div className="mb-2">
          <p className="font-semibold text-xs text-foreground truncate">
            @{post.instagram_handle.replace('@', '')}
          </p>
          <p className="text-xs text-muted-foreground">
            {getTimeAgo(post.posted_at)}
          </p>
        </div>

        {/* Post Preview - Takes up most of the card */}
        <div className="flex-1 mb-2 relative">
          {getEnhancedThumbnail() ? (
            <div className="w-full h-full bg-muted rounded-md overflow-hidden relative group/image">
              <img 
                src={getEnhancedThumbnail()!} 
                alt={`Instagram ${displayType} by @${post.instagram_handle.replace('@', '')}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {/* Instagram overlay indicator */}
              <div className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5 opacity-80 group-hover/image:opacity-100 transition-opacity">
                <Instagram className="h-2 w-2 text-white" />
              </div>
            </div>
          ) : (
            <div className="w-full h-full bg-muted rounded-md flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
              <div className="text-center">
                <div className={`w-6 h-6 rounded-full ${getPostTypeColor(displayType)} flex items-center justify-center mx-auto mb-1`}>
                  <Instagram className="h-3 w-3 text-white" />
                </div>
                <p className="text-xs text-muted-foreground px-1">Loading...</p>
              </div>
            </div>
          )}
        </div>

        {/* Engagement Summary - Compact */}
        {post.analytics && (
          <div className="space-y-1">
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Eye className="h-2.5 w-2.5" />
                <span className="text-xs">{formatNumber(post.analytics.views)}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Heart className="h-2.5 w-2.5" />
                <span className="text-xs">{formatNumber(post.analytics.likes)}</span>
              </div>
            </div>
            
            {/* Engagement Rate */}
            <div className="text-center">
              <span className={`text-xs font-semibold ${
                post.analytics.engagement_rate > 3 ? 'text-success' :
                post.analytics.engagement_rate > 1.5 ? 'text-warning' :
                'text-muted-foreground'
              }`}>
                {post.analytics.engagement_rate.toFixed(1)}%
              </span>
            </div>

            {/* Engagement Bar */}
            <div className="w-full bg-muted/50 rounded-full h-1">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  post.analytics.engagement_rate > 3 ? 'bg-success' :
                  post.analytics.engagement_rate > 1.5 ? 'bg-warning' :
                  'bg-muted-foreground'
                }`}
                style={{ width: `${Math.min(post.analytics.engagement_rate * 10, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PostPreviewCard;