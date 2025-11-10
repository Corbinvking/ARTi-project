import { useState, useEffect } from 'react'
import { supabase } from '../integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface CampaignReachData {
  campaign_id: string
  total_reach: number
}

export const useCampaignReachData = () => {
  const [reachData, setReachData] = useState<CampaignReachData[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const fetchCampaignReachData = async () => {
    try {
      setLoading(true)
      
      // Fetch aggregated reach data for all campaigns
      const { data, error } = await supabase
        .from('campaign_receipt_links')
        .select('campaign_id, reach_amount')
      
      if (error) {
        throw error
      }

      // Group by campaign_id and sum reach_amount
      const reachMap = new Map<string, number>()
      
      data?.forEach(link => {
        const currentTotal = reachMap.get(link.campaign_id) || 0
        reachMap.set(link.campaign_id, currentTotal + (link.reach_amount || 0))
      })

      // Convert map to array
      const reachDataArray = Array.from(reachMap.entries()).map(([campaign_id, total_reach]) => ({
        campaign_id,
        total_reach
      }))

      setReachData(reachDataArray)
    } catch (error: any) {
      console.error('Error fetching campaign reach data:', error)
      toast({
        title: "Error",
        description: "Failed to fetch campaign reach data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getTotalReach = (campaignId: string): number => {
    const found = reachData.find(item => item.campaign_id === campaignId)
    return found ? found.total_reach : 0
  }

  useEffect(() => {
    fetchCampaignReachData()
  }, [])

  return {
    reachData,
    loading,
    fetchCampaignReachData,
    getTotalReach,
    refetch: fetchCampaignReachData
  }
}