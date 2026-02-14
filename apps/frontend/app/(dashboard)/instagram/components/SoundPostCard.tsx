'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, MessageCircle, Play, Instagram, Music } from 'lucide-react';

export interface SoundPostCardPost {
  id: string;
  url: string;
  displayUrl: string;
  caption?: string;
  likesCount: number;
  commentsCount: number;
  videoViewCount?: number;
  timestamp?: string;
  ownerUsername: string;
  campaign_name: string;
  clients: string;
  isVideo?: boolean;
}

function formatCompact(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return num.toLocaleString();
}

function getTimeAgo(timestamp: string | null | undefined): string {
  if (!timestamp) return '';
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffWeeks === 1) return 'a week ago';
  if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
  if (diffDays < 60) return 'a month ago';
  return `${Math.floor(diffDays / 30)} months ago`;
}

export function SoundPostCard({ post }: { post: SoundPostCardPost }) {
  const views = post.videoViewCount ?? (post.likesCount * 10);
  const captionSnippet = post.caption?.slice(0, 100)?.trim();
  const timeAgo = getTimeAgo(post.timestamp);

  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
    >
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 h-full flex flex-col">
        <CardContent className="p-0 flex flex-col h-full">
          {/* Top row: platform icon + time ago */}
          <div className="flex items-center justify-between px-3 pt-2 pb-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Instagram className="h-3 w-3 text-white" />
              </div>
              <span className="text-xs">Instagram</span>
            </div>
            {timeAgo && (
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
            )}
          </div>

          {/* Thumbnail */}
          <div className="aspect-[9/10] bg-muted relative overflow-hidden flex-shrink-0">
            {post.displayUrl ? (
              <img
                src={post.displayUrl}
                alt={captionSnippet || 'Post'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Play className="h-10 w-10" />
              </div>
            )}
          </div>

          {/* Sound + creator */}
          <div className="px-3 pt-2 flex items-center gap-2 flex-shrink-0">
            <Music className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              {post.campaign_name && (
                <p className="text-sm font-medium truncate">{post.campaign_name}</p>
              )}
              {post.clients && (
                <p className="text-xs text-muted-foreground truncate">{post.clients}</p>
              )}
            </div>
          </div>

          {/* Metrics: views, likes, comments */}
          <div className="flex items-center gap-4 px-3 py-1.5 text-xs text-muted-foreground flex-shrink-0">
            <span className="flex items-center gap-1">
              <Play className="h-3 w-3" />
              {post.videoViewCount != null ? formatCompact(post.videoViewCount) : formatCompact(views)}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {formatCompact(post.likesCount)}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {formatCompact(post.commentsCount)}
            </span>
          </div>

          {/* Handle + caption snippet */}
          <div className="px-3 pb-3 mt-auto flex-shrink-0">
            {post.ownerUsername && (
              <p className="text-xs font-medium text-foreground truncate">
                @{post.ownerUsername.replace('@', '')}
              </p>
            )}
            {captionSnippet && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {captionSnippet}{post.caption && post.caption.length > 100 ? '...' : ''}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </a>
  );
}
