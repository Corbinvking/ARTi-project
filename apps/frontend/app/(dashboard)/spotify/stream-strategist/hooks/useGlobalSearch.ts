"use client"

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { APP_CAMPAIGN_SOURCE, APP_CAMPAIGN_TYPE } from "../lib/constants";

export interface SearchResult {
  id: string;
  type: 'campaign' | 'vendor' | 'client' | 'playlist';
  title: string;
  subtitle?: string;
  href: string;
}

export const useGlobalSearch = (searchTerm: string) => {
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  return useQuery({
    queryKey: ['global-search', debouncedTerm],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!debouncedTerm || debouncedTerm.length < 2) return [];

      const results: SearchResult[] = [];
      const searchPattern = `%${debouncedTerm}%`;

      // Search campaigns
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, name, brand_name, status')
        .eq('source', APP_CAMPAIGN_SOURCE)
        .eq('campaign_type', APP_CAMPAIGN_TYPE)
        .or(`name.ilike.${searchPattern},brand_name.ilike.${searchPattern},track_name.ilike.${searchPattern}`)
        .limit(5);

      campaigns?.forEach(campaign => {
        results.push({
          id: campaign.id,
          type: 'campaign',
          title: campaign.name,
          subtitle: campaign.brand_name || campaign.status,
          href: `/campaigns`
        });
      });

      // Search vendors
      const { data: vendors } = await supabase
        .from('vendors')
        .select('id, name')
        .ilike('name', searchPattern)
        .eq('is_active', true)
        .limit(5);

      vendors?.forEach(vendor => {
        results.push({
          id: vendor.id,
          type: 'vendor',
          title: vendor.name,
          subtitle: 'Vendor',
          href: `/playlists`
        });
      });

      // Search clients
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, contact_person')
        .or(`name.ilike.${searchPattern},contact_person.ilike.${searchPattern}`)
        .limit(5);

      clients?.forEach(client => {
        results.push({
          id: client.id,
          type: 'client',
          title: client.name,
          subtitle: client.contact_person || 'Client',
          href: `/clients`
        });
      });

      // Search playlists
      const { data: playlists } = await supabase
        .from('playlists')
        .select('id, name, genres, vendors!inner(name)')
        .ilike('name', searchPattern)
        .limit(5);

      playlists?.forEach(playlist => {
        results.push({
          id: playlist.id,
          type: 'playlist',
          title: playlist.name,
          subtitle: `${(playlist.vendors as any)?.name} • ${playlist.genres?.join(', ')}`,
          href: `/playlists`
        });
      });

      return results.slice(0, 10);
    },
    enabled: debouncedTerm.length >= 2,
  });
};








