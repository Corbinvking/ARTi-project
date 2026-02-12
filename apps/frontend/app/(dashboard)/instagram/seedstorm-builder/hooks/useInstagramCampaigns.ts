'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from './use-toast';

export interface InstagramCampaign {
  id: number;
  campaign: string;
  clients: string;
  start_date: string;
  price: string;
  spend: string;
  remaining: string;
  sound_url: string;
  status: string;
  tracker: string;
  campaign_started: string;
  send_tracker: string;
  send_final_report: string;
  invoice: string;
  salespeople: string;
  report_notes: string;
  client_notes: string;
  paid_ops: string;
  created_at: string;
  updated_at: string;
}

export interface FormattedCampaign {
  id: string;
  name: string;
  brand: string;
  budget: number;
  status: 'active' | 'completed' | 'draft' | 'paused';
  startDate: Date | null;
  creatorCount: number;
  totalSpend: number;
  remaining: number;
  soundUrl: string;
  tracker: string;
  notes: string;
  salesperson: string;
  createdAt: Date;
}

export function useInstagramCampaigns() {
  console.log('🎯 useInstagramCampaigns hook initialized');
  const [campaigns, setCampaigns] = useState<FormattedCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const parseCurrency = (value: string): number => {
    if (!value) return 0;
    // Remove $, commas, and any other non-numeric characters except decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 0;
  };

  const parseStatus = (status: string): 'active' | 'completed' | 'draft' | 'paused' => {
    if (!status) return 'draft';
    const normalized = status.toLowerCase().trim();
    
    if (normalized.includes('active') || normalized === 'ongoing') return 'active';
    if (normalized.includes('complete') || normalized === 'done' || normalized === 'finished') return 'completed';
    if (normalized.includes('pause') || normalized === 'on hold') return 'paused';
    return 'draft';
  };

  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };

  const fetchCampaigns = async () => {
    try {
      console.log('🔄 Starting to fetch Instagram campaigns...');
      setLoading(true);
      setError(null);

      // Query the actual instagram_campaigns table (migration 011 schema)
      console.log('📡 Querying instagram_campaigns table...');
      const { data, error: fetchError } = await supabase
        .from('instagram_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📊 Query result:', { 
        dataLength: data?.length, 
        error: fetchError,
        hasData: !!data 
      });

      if (fetchError) {
        console.error('❌ Fetch error:', fetchError);
        throw fetchError;
      }

      if (!data || data.length === 0) {
        console.log('⚠️ No Instagram campaigns found in database');
        setCampaigns([]);
        return;
      }

      console.log(`✅ Fetched ${data.length} Instagram campaigns from database`);

      // Fetch creator counts from instagram_campaign_creators
      const { data: creatorsData } = await supabase
        .from('instagram_campaign_creators')
        .select('campaign_id');

      // Build a map of campaign_id -> creator count
      const creatorCountMap: Record<string, number> = {};
      (creatorsData || []).forEach((c: any) => {
        const key = String(c.campaign_id);
        creatorCountMap[key] = (creatorCountMap[key] || 0) + 1;
      });

      // Transform the TEXT-based data to match frontend expectations
      const formatted: FormattedCampaign[] = data.map((row: any) => {
        const price = parseCurrency(row.price);
        const spend = parseCurrency(row.spend);
        const remaining = parseCurrency(row.remaining);

        return {
          id: row.id.toString(),
          name: row.campaign || 'Untitled Campaign',
          brand: row.clients || 'Unknown Client',
          budget: price,
          status: parseStatus(row.status),
          startDate: parseDate(row.start_date),
          creatorCount: creatorCountMap[String(row.id)] || 0,
          totalSpend: spend,
          remaining: remaining,
          soundUrl: row.sound_url || '',
          tracker: row.tracker || '',
          notes: row.client_notes || row.report_notes || '',
          salesperson: row.salespeople || '',
          createdAt: new Date(row.created_at)
        };
      });

      setCampaigns(formatted);
      
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch campaigns';
      console.error('❌ Error fetching Instagram campaigns:', err);
      setError(errorMessage);
      toast({
        title: 'Error loading campaigns',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔵 useEffect triggered - calling fetchCampaigns');
    fetchCampaigns();
  }, []);

  const refetch = () => {
    fetchCampaigns();
  };

  return {
    campaigns,
    loading,
    error,
    refetch,
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter(c => c.status === 'active').length,
    completedCampaigns: campaigns.filter(c => c.status === 'completed').length,
    totalBudget: campaigns.reduce((sum, c) => sum + c.budget, 0),
    totalSpend: campaigns.reduce((sum, c) => sum + c.totalSpend, 0),
  };
}

