import { useState, useEffect } from 'react'
import { supabase } from '../integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface ScrapingStats {
  total_scrapes: number
  success_rate: number
  avg_response_time: number
  last_24h_scrapes: number
  profile_scrapes: number
  track_scrapes: number
}

interface ScrapingHistory {
  id: string
  target_type: string
  target_url: string
  target_handle?: string
  status: string
  data_scraped?: any
  error_message?: string
  response_time_ms?: number
  scraped_at: string
}

export const useScrapingAnalytics = () => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ScrapingStats>({
    total_scrapes: 0,
    success_rate: 0,
    avg_response_time: 0,
    last_24h_scrapes: 0,
    profile_scrapes: 0,
    track_scrapes: 0
  })
  const [history, setHistory] = useState<ScrapingHistory[]>([])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)

      // Fetch scraping history
      const { data: historyData, error: historyError } = await supabase
        .from('scraping_history')
        .select('*')
        .order('scraped_at', { ascending: false })
        .limit(100)

      if (historyError) throw historyError

      setHistory(historyData || [])

      // Calculate stats
      if (historyData && historyData.length > 0) {
        const totalScrapes = historyData.length
        const successfulScrapes = historyData.filter(h => h.status === 'success').length
        const successRate = totalScrapes > 0 ? (successfulScrapes / totalScrapes) * 100 : 0
        
        const responseTimes = historyData.filter(h => h.response_time_ms && h.response_time_ms > 0)
        const avgResponseTime = responseTimes.length > 0 
          ? responseTimes.reduce((acc, h) => acc + (h.response_time_ms || 0), 0) / responseTimes.length
          : 0
        
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const last24hScrapes = historyData.filter(h => new Date(h.scraped_at) > last24h).length

        const profileScrapes = historyData.filter(h => h.target_type === 'profile').length
        const trackScrapes = historyData.filter(h => h.target_type === 'track').length

        setStats({
          total_scrapes: totalScrapes,
          success_rate: Math.round(successRate * 10) / 10,
          avg_response_time: Math.round(avgResponseTime),
          last_24h_scrapes: last24hScrapes,
          profile_scrapes: profileScrapes,
          track_scrapes: trackScrapes
        })
      }

    } catch (error: any) {
      console.error('Error fetching scraping analytics:', error)
      toast({
        title: "Error",
        description: "Failed to load scraping analytics",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const scrapeTrack = async (trackUrl: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('scrape-soundcloud-track', {
        body: { track_url: trackUrl }
      })

      if (error) throw error

      if (data.success) {
        toast({
          title: "Success",
          description: `Track scraped in ${data.scraping_time_ms}ms`,
        })
        await fetchAnalytics() // Refresh data
        return data
      } else {
        throw new Error(data.error || 'Failed to scrape track')
      }

    } catch (error: any) {
      console.error('Error scraping track:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to scrape track",
        variant: "destructive",
      })
      throw error
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  return {
    loading,
    stats,
    history,
    fetchAnalytics,
    scrapeTrack
  }
}