'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '../integrations/supabase/client';

export interface CreatorRow {
  id: string;
  instagram_handle: string;
  email: string | null;
  followers: number;
  engagement_rate: number;
  base_country: string;
  music_genres: string[];
  content_types: string[];
  reel_rate: number;
  account_territory: string;
  account_territory_confidence: string;
  audience_territory: string;
  audience_territory_confidence: string;
  followers_last_updated_at: string | null;
  engagement_last_updated_at: string | null;
  scrape_status: string;
  created_at: string;
  // Computed from placements
  median_views: number | null;
  cp1k: number | null;
  reel_rate_pct: number | null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function useCreatorsTable() {
  const { data: rawCreators = [], isLoading: loadingCreators, refetch } = useQuery({
    queryKey: ['creators-table'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creators')
        .select('*')
        .order('followers', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: placementData = [] } = useQuery({
    queryKey: ['creators-table-placements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instagram_campaign_creators')
        .select('creator_id, campaign_id, rate, posts_count, post_status, payment_status, post_type, instagram_handle');
      if (error) return [];
      return data || [];
    },
  });

  const { data: postData = [] } = useQuery({
    queryKey: ['creators-table-posts'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('instagram_posts')
        .select('owner_username, video_view_count, likes_count, is_video, timestamp');
      if (error) return [];
      return data || [];
    },
  });

  const creators = useMemo((): CreatorRow[] => {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const postsByHandle: Record<string, any[]> = {};
    for (const p of postData) {
      const handle = (p.owner_username || '').toLowerCase();
      if (!handle) continue;
      if (!postsByHandle[handle]) postsByHandle[handle] = [];
      postsByHandle[handle].push(p);
    }

    const placementsByCreator: Record<string, any[]> = {};
    for (const p of placementData) {
      const key = p.creator_id || (p.instagram_handle || '').toLowerCase();
      if (!key) continue;
      if (!placementsByCreator[key]) placementsByCreator[key] = [];
      placementsByCreator[key].push(p);
    }

    return rawCreators.map((c: any) => {
      const handle = (c.instagram_handle || '').toLowerCase();

      const creatorPosts = (postsByHandle[handle] || [])
        .sort((a: any, b: any) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
        .slice(0, 10);

      const viewValues = creatorPosts
        .map((p: any) => p.video_view_count || (p.likes_count ? p.likes_count * 10 : 0))
        .filter((v: number) => v > 0);
      const medianViews = median(viewValues);

      const placements = placementsByCreator[c.id] || placementsByCreator[handle] || [];
      const recentPlacements = placements.filter((p: any) => {
        return true;
      });

      let totalSpend = 0;
      let totalViews = 0;
      let reelCount = 0;
      let totalPlacementCount = recentPlacements.length;

      for (const p of recentPlacements) {
        const spend = (Number(p.rate) || 0) * (p.posts_count || 1);
        if (p.payment_status === 'paid') totalSpend += spend;
        const pType = (p.post_type || '').toLowerCase();
        if (pType === 'reel' || pType === 'reels') reelCount++;
      }

      const handlePosts = postsByHandle[handle] || [];
      for (const p of handlePosts) {
        totalViews += p.video_view_count || (p.likes_count ? p.likes_count * 10 : 0);
      }

      const cp1k = totalViews > 0 && totalSpend > 0 ? (totalSpend / totalViews) * 1000 : null;
      const reelRatePct = totalPlacementCount > 0 ? (reelCount / totalPlacementCount) * 100 : null;

      return {
        id: c.id,
        instagram_handle: c.instagram_handle || '',
        email: c.email || null,
        followers: c.followers || 0,
        engagement_rate: c.engagement_rate || 0,
        base_country: c.base_country || '',
        music_genres: Array.isArray(c.music_genres) ? c.music_genres : [],
        content_types: Array.isArray(c.content_types) ? c.content_types : [],
        reel_rate: c.reel_rate || 0,
        account_territory: c.account_territory || 'Unknown',
        account_territory_confidence: c.account_territory_confidence || 'Low',
        audience_territory: c.audience_territory || 'Unknown',
        audience_territory_confidence: c.audience_territory_confidence || 'Low',
        followers_last_updated_at: c.followers_last_updated_at || null,
        engagement_last_updated_at: c.engagement_last_updated_at || null,
        scrape_status: c.scrape_status || 'pending',
        created_at: c.created_at || '',
        median_views: medianViews,
        cp1k,
        reel_rate_pct: reelRatePct,
      };
    });
  }, [rawCreators, placementData, postData]);

  return {
    creators,
    isLoading: loadingCreators,
    refetch,
  };
}
