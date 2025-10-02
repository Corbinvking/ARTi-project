"use client"

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../hooks/useAuth';

interface SalespersonCampaign {
  id: string;
  name: string;
  client_name: string;
  status: string;
  budget: number;
  price_paid: number;
  stream_goal: number;
  remaining_streams: number;
  daily_streams: number;
  weekly_streams: number;
  start_date: string;
  duration_days: number;
  created_at: string;
  progress_percentage: number;
  commission_amount: number;
  selected_playlists: any;
  vendor_allocations: any;
  salesperson: string;
  track_url: string;
  track_name: string;
  music_genres: string[];
  territory_preferences: string[];
  content_types: string[];
}

export function useSalespersonCampaigns() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['salesperson-campaigns', user?.email],
    queryFn: async (): Promise<SalespersonCampaign[]> => {
      if (!user?.email) {
        throw new Error('User email not available');
      }

      // Get campaigns with submission data joined
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select(`
          *,
          campaign_submissions!inner(
            client_name,
            price_paid
          )
        `)
        .eq('salesperson', user.email)
        .in('status', ['active', 'completed', 'paused', 'draft', 'built', 'unreleased'])
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;

      // Enhance campaigns with calculated fields
      const enhancedCampaigns = (campaigns || []).map(campaign => {
        const streamsCompleted = campaign.stream_goal - (campaign.remaining_streams || campaign.stream_goal);
        const progressPercentage = Math.round((streamsCompleted / campaign.stream_goal) * 100);
        const commissionAmount = Math.round((campaign.budget || 0) * 0.2 * 100) / 100; // 20% commission

        return {
          ...campaign,
          progress_percentage: progressPercentage,
          commission_amount: commissionAmount,
          daily_streams: campaign.daily_streams || 0,
          weekly_streams: campaign.weekly_streams || 0,
          remaining_streams: campaign.remaining_streams || campaign.stream_goal,
          client_name: campaign.campaign_submissions?.client_name || campaign.client_name || campaign.client || '',
          price_paid: campaign.campaign_submissions?.price_paid || 0,
        };
      });

      return enhancedCampaigns;
    },
    enabled: !!user?.email,
  });
}

export function useSalespersonCommissionStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['salesperson-commission-stats', user?.email],
    queryFn: async () => {
      if (!user?.email) {
        throw new Error('User email not available');
      }

      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select(`
          budget, 
          status,
          campaign_submissions!inner(
            price_paid
          )
        `)
        .eq('salesperson', user.email);

      if (error) throw error;

      const totalCommission = campaigns.reduce((sum, campaign) => {
        return sum + ((campaign.budget || 0) * 0.2);
      }, 0);

      const totalSales = campaigns.reduce((sum, campaign) => {
        return sum + (campaign.campaign_submissions?.price_paid || 0);
      }, 0);

      const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

      return {
        totalCommission,
        totalSales,
        activeCampaigns,
        totalCampaigns: campaigns.length,
      };
    },
    enabled: !!user?.email,
  });
}








