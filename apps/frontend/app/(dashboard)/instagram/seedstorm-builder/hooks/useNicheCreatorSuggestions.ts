'use client';

import { useMemo } from 'react';
import { Creator } from '../lib/types';

export interface SuggestedCreator extends Creator {
  matchingNiches: string[];
  matchScore: number;
}

interface UseNicheCreatorSuggestionsOptions {
  selectedNiches: string[];
  creators: Creator[];
  maxResults?: number;
  excludeIds?: string[];
}

export function useNicheCreatorSuggestions({
  selectedNiches,
  creators,
  maxResults = 10,
  excludeIds = [],
}: UseNicheCreatorSuggestionsOptions) {
  const suggestions = useMemo((): SuggestedCreator[] => {
    if (selectedNiches.length === 0 || creators.length === 0) return [];

    const lowerNiches = selectedNiches.map((n) => n.toLowerCase());
    const excludeSet = new Set(excludeIds);

    const matched: SuggestedCreator[] = [];

    for (const creator of creators) {
      if (excludeSet.has(creator.id)) continue;
      if (!Array.isArray(creator.music_genres) || creator.music_genres.length === 0) continue;

      const creatorGenresLower = creator.music_genres.map((g) => g.toLowerCase());
      const matchingNiches = selectedNiches.filter((niche) =>
        creatorGenresLower.includes(niche.toLowerCase())
      );

      if (matchingNiches.length === 0) continue;

      const nicheOverlapRatio = matchingNiches.length / selectedNiches.length;
      const engagementScore = Math.min(creator.engagement_rate * 10, 30);
      const followersScore = Math.min(Math.log10(Math.max(creator.followers, 1)) * 5, 25);
      const viewsScore =
        creator.median_views_per_video > 0
          ? Math.min(Math.log10(creator.median_views_per_video) * 5, 20)
          : 0;

      const matchScore =
        nicheOverlapRatio * 40 + engagementScore + followersScore + viewsScore;

      matched.push({
        ...creator,
        matchingNiches,
        matchScore,
      });
    }

    matched.sort((a, b) => b.matchScore - a.matchScore);
    return matched.slice(0, maxResults);
  }, [selectedNiches, creators, maxResults, excludeIds]);

  const totalMatchingCreators = useMemo(() => {
    if (selectedNiches.length === 0 || creators.length === 0) return 0;
    const lowerNiches = selectedNiches.map((n) => n.toLowerCase());
    return creators.filter((creator) => {
      if (!Array.isArray(creator.music_genres) || creator.music_genres.length === 0) return false;
      return creator.music_genres.some((g) => lowerNiches.includes(g.toLowerCase()));
    }).length;
  }, [selectedNiches, creators]);

  return {
    suggestions,
    totalMatchingCreators,
    hasResults: suggestions.length > 0,
  };
}
