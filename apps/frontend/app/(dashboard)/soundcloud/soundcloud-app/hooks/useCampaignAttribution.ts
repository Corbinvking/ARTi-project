import { useState, useEffect } from 'react'
import { supabase } from '../integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface CampaignAttribution {
  campaign_id: string
  artist_name: string
  track_name: string
  track_url: string
  start_date: string
  end_date: string | null
  status: string
  goal_reposts: number | null
  price_usd: number | null
  baseline_plays: number | null
  baseline_likes: number | null
  baseline_reposts: number | null
  baseline_comments: number | null
  baseline_date: string | null
  current_plays: number | null
  current_likes: number | null
  current_reposts: number | null
  current_comments: number | null
  latest_date: string | null
  days_tracked: number | null
  plays_gained: number
  likes_gained: number
  reposts_gained: number
  comments_gained: number
  repost_goal_progress_pct: number | null
  cost_per_repost: number | null
  cost_per_play: number | null
}

export const useCampaignAttribution = () => {
  const [campaigns, setCampaigns] = useState<CampaignAttribution[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const fetchCampaignAttribution = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('campaign_attribution_analytics')
        .select('*')
        .order('start_date', { ascending: false })

      if (error) {
        throw error
      }

      setCampaigns(data || [])
    } catch (error: any) {
      console.error('Error fetching campaign attribution:', error)
      toast({
        title: "Error",
        description: "Failed to fetch campaign attribution data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const captureBaseline = async (campaignId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('capture-campaign-baseline', {
        body: { campaign_id: campaignId }
      })

      if (error) {
        throw error
      }

      if (data?.success) {
        toast({
          title: "Success",
          description: "Baseline metrics captured successfully",
        })
        
        // Refresh the data
        await fetchCampaignAttribution()
        return data
      } else {
        throw new Error(data?.error || 'Failed to capture baseline')
      }
    } catch (error: any) {
      console.error('Error capturing baseline:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to capture baseline metrics",
        variant: "destructive",
      })
      throw error
    }
  }

  const syncCampaignMetrics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('sync-campaign-metrics')

      if (error) {
        throw error
      }

      if (data?.success) {
        toast({
          title: "Success",
          description: `Synced ${data.successful_syncs || 0} campaigns successfully`,
        })
        
        // Refresh the data
        await fetchCampaignAttribution()
        return data
      } else {
        throw new Error(data?.error || 'Failed to sync metrics')
      }
    } catch (error: any) {
      console.error('Error syncing campaign metrics:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to sync campaign metrics",
        variant: "destructive",
      })
      throw error
    }
  }

  useEffect(() => {
    fetchCampaignAttribution()
  }, [])

  return {
    campaigns,
    loading,
    fetchCampaignAttribution,
    captureBaseline,
    syncCampaignMetrics,
    refetch: fetchCampaignAttribution
  }
}