'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from './use-toast';

export interface InstagramCreator {
  id: string;
  instagram_handle: string;
  email?: string;
  base_country: string;
  followers: number;
  median_views_per_video: number;
  engagement_rate: number;
  content_types: string[];
  music_genres: string[];
  audience_territories: string[];
  reel_rate: number;
  carousel_rate: number;
  story_rate: number;
  avg_performance_score: number;
  campaign_fit_score: number;
  created_at: string;
  updated_at: string;
}

export function useInstagramCreators() {
  const [creators, setCreators] = useState<InstagramCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCreators = async () => {
    try {
      setLoading(true);
      setError(null);

      // Query the creators table
      const { data, error: fetchError } = await supabase
        .from('creators')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      if (!data || data.length === 0) {
        console.log('No creators found in database');
        setCreators([]);
        return;
      }

      console.log(`✅ Fetched ${data.length} creators from database`);

      // Transform data to match frontend interface
      const formatted: InstagramCreator[] = data.map((row: any) => ({
        id: row.id,
        instagram_handle: row.instagram_handle,
        email: row.email,
        base_country: row.base_country,
        followers: Number(row.followers) || 0,
        median_views_per_video: Number(row.median_views_per_video) || 0,
        engagement_rate: Number(row.engagement_rate) || 0,
        content_types: Array.isArray(row.content_types) ? row.content_types : [],
        music_genres: Array.isArray(row.music_genres) ? row.music_genres : [],
        audience_territories: Array.isArray(row.audience_territories) ? row.audience_territories : [],
        reel_rate: Number(row.reel_rate) || 0,
        carousel_rate: Number(row.carousel_rate) || 0,
        story_rate: Number(row.story_rate) || 0,
        avg_performance_score: Number(row.avg_performance_score) || 0,
        campaign_fit_score: Number(row.campaign_fit_score) || 0,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));

      setCreators(formatted);
      
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch creators';
      console.error('❌ Error fetching creators:', err);
      setError(errorMessage);
      toast({
        title: 'Error loading creators',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreators();
  }, []);

  const refetch = () => {
    fetchCreators();
  };

  return {
    creators,
    loading,
    error,
    refetch,
    totalCreators: creators.length,
    averageEngagement: creators.length > 0 
      ? creators.reduce((sum, c) => sum + c.engagement_rate, 0) / creators.length 
      : 0,
    totalReach: creators.reduce((sum, c) => sum + c.followers, 0),
    topCreators: [...creators]
      .sort((a, b) => b.followers - a.followers)
      .slice(0, 10)
  };
}

