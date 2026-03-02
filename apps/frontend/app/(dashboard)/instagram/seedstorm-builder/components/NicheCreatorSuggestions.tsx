'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Users, Eye, TrendingUp, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { SuggestedCreator } from '../hooks/useNicheCreatorSuggestions';
import { formatNumber } from '../lib/localStorage';

interface NicheCreatorSuggestionsProps {
  suggestions: SuggestedCreator[];
  totalMatchingCreators: number;
  selectedNiches: string[];
  isLoading?: boolean;
}

export function NicheCreatorSuggestions({
  suggestions,
  totalMatchingCreators,
  selectedNiches,
  isLoading = false,
}: NicheCreatorSuggestionsProps) {
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);

  if (selectedNiches.length === 0) return null;

  const displayedSuggestions = showAll ? suggestions : suggestions.slice(0, 5);

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Suggested Creators
            {totalMatchingCreators > 0 && (
              <Badge variant="secondary" className="text-xs font-normal">
                {totalMatchingCreators} match{totalMatchingCreators !== 1 ? 'es' : ''}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        {expanded && (
          <p className="text-xs text-muted-foreground mt-1">
            Creators whose niches match your selected campaign niches
          </p>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
              <span className="ml-2 text-sm text-muted-foreground">Finding matching creators...</span>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-4">
              <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No creators found matching{' '}
                {selectedNiches.map((n, i) => (
                  <span key={n}>
                    {i > 0 && (i === selectedNiches.length - 1 ? ' or ' : ', ')}
                    <strong>{n}</strong>
                  </span>
                ))}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Try selecting different niches or add creators with these niches
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayedSuggestions.map((creator) => (
                <CreatorSuggestionRow
                  key={creator.id}
                  creator={creator}
                  selectedNiches={selectedNiches}
                />
              ))}

              {suggestions.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll
                    ? 'Show less'
                    : `Show ${suggestions.length - 5} more creator${suggestions.length - 5 !== 1 ? 's' : ''}`}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function CreatorSuggestionRow({
  creator,
  selectedNiches,
}: {
  creator: SuggestedCreator;
  selectedNiches: string[];
}) {
  const profileUrl = `https://instagram.com/${creator.instagram_handle.replace(/^@/, '')}`;

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background border border-border/50 hover:border-border transition-colors">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
        <span className="text-xs font-bold text-primary">
          {creator.instagram_handle.charAt(0).toUpperCase()}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate"
          >
            @{creator.instagram_handle}
          </a>
          <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {creator.matchingNiches.map((niche) => (
            <Badge
              key={niche}
              variant="default"
              className="text-[10px] px-1.5 py-0 h-4 font-normal"
            >
              {niche}
            </Badge>
          ))}
          {creator.music_genres
            .filter(
              (g) =>
                !creator.matchingNiches
                  .map((n) => n.toLowerCase())
                  .includes(g.toLowerCase())
            )
            .slice(0, 2)
            .map((genre) => (
              <Badge
                key={genre}
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 font-normal text-muted-foreground"
              >
                {genre}
              </Badge>
            ))}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0 text-xs text-muted-foreground">
        <div className="flex items-center gap-1" title="Followers">
          <Users className="h-3 w-3" />
          <span>{formatNumber(creator.followers)}</span>
        </div>
        {creator.median_views_per_video > 0 && (
          <div className="flex items-center gap-1" title="Median Views">
            <Eye className="h-3 w-3" />
            <span>{formatNumber(creator.median_views_per_video)}</span>
          </div>
        )}
        {creator.engagement_rate > 0 && (
          <div className="flex items-center gap-1" title="Engagement Rate">
            <TrendingUp className="h-3 w-3" />
            <span>
              {creator.engagement_rate < 1
                ? `${(creator.engagement_rate * 100).toFixed(1)}%`
                : `${creator.engagement_rate.toFixed(1)}%`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
