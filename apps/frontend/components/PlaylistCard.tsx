/**
 * PlaylistCard Component
 * 
 * Displays enriched playlist information including follower count,
 * track count, and other metadata from Spotify Web API
 */

import { Users, Music, ExternalLink, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PlaylistCardProps {
  name: string;
  url: string;
  followerCount?: number | null;
  trackCount?: number | null;
  description?: string | null;
  ownerName?: string | null;
  isAlgorithmic?: boolean;
  avgDailyStreams?: number;
  campaignCount?: number;
}

export function PlaylistCard({
  name,
  url,
  followerCount,
  trackCount,
  description,
  ownerName,
  isAlgorithmic = false,
  avgDailyStreams,
  campaignCount,
}: PlaylistCardProps) {
  const formatNumber = (num?: number | null) => {
    if (!num) return 'N/A';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const calculateEngagementRate = () => {
    if (!avgDailyStreams || !followerCount || followerCount === 0) return null;
    return ((avgDailyStreams / followerCount) * 100).toFixed(2);
  };

  const engagementRate = calculateEngagementRate();

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold line-clamp-2">
              {name}
            </CardTitle>
            {ownerName && (
              <CardDescription className="mt-1">
                by {ownerName}
              </CardDescription>
            )}
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 p-2 hover:bg-accent rounded-md transition-colors"
            title="Open in Spotify"
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>

        {isAlgorithmic && (
          <Badge variant="secondary" className="mt-2 w-fit">
            Algorithmic
          </Badge>
        )}
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Follower Count */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">{formatNumber(followerCount)}</div>
              <div className="text-xs text-muted-foreground">Followers</div>
            </div>
          </div>

          {/* Track Count */}
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">{formatNumber(trackCount)}</div>
              <div className="text-xs text-muted-foreground">Tracks</div>
            </div>
          </div>

          {/* Average Daily Streams */}
          {avgDailyStreams !== undefined && avgDailyStreams > 0 && (
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">{formatNumber(avgDailyStreams)}</div>
                <div className="text-xs text-muted-foreground">Daily Streams</div>
              </div>
            </div>
          )}

          {/* Campaign Count */}
          {campaignCount !== undefined && campaignCount > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-semibold text-primary">{campaignCount}</span>
              </div>
              <div>
                <div className="text-sm font-medium">{campaignCount}</div>
                <div className="text-xs text-muted-foreground">
                  {campaignCount === 1 ? 'Campaign' : 'Campaigns'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Engagement Rate */}
        {engagementRate && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Engagement Rate</span>
              <span className="text-sm font-semibold text-green-600">
                {engagementRate}%
              </span>
            </div>
            <div className="mt-2 w-full bg-secondary rounded-full h-2 overflow-hidden">
              <div
                className="bg-green-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(parseFloat(engagementRate) * 10, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Description (truncated) */}
        {description && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground line-clamp-2">
              {description}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact version for lists/tables
 */
export function PlaylistCompactCard({
  name,
  url,
  followerCount,
  ownerName,
  isAlgorithmic = false,
}: Pick<PlaylistCardProps, 'name' | 'url' | 'followerCount' | 'ownerName' | 'isAlgorithmic'>) {
  const formatNumber = (num?: number | null) => {
    if (!num) return 'N/A';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium truncate">{name}</h4>
          {isAlgorithmic && (
            <Badge variant="outline" className="text-xs">
              Algo
            </Badge>
          )}
        </div>
        {ownerName && (
          <p className="text-xs text-muted-foreground mt-0.5">{ownerName}</p>
        )}
      </div>
      
      <div className="flex items-center gap-4 ml-4">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span className="text-sm font-medium">{formatNumber(followerCount)}</span>
        </div>
        
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 hover:bg-accent rounded-md transition-colors"
          title="Open in Spotify"
        >
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
        </a>
      </div>
    </div>
  );
}

