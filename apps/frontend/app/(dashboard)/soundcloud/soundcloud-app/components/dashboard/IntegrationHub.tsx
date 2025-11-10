"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '../../integrations/supabase/client'
import { useToast } from '../../hooks/use-toast'
import { 
  Music, Users, Activity, AlertTriangle, CheckCircle, 
  XCircle, Clock, RefreshCw, BarChart3, Webhook, MessageSquare
} from 'lucide-react'
import { format } from 'date-fns'

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

interface TrackMetrics {
  id: string
  track_url: string
  track_title?: string
  artist_handle?: string
  play_count: number
  like_count: number
  repost_count: number
  comment_count: number
  collected_at: string
}

interface CommunicationIntegration {
  id: string
  platform: string
  name: string
  enabled: boolean
  notification_types: string[]
}

export const IntegrationHub = () => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [scrapingHistory, setScrapingHistory] = useState<ScrapingHistory[]>([])
  const [trackMetrics, setTrackMetrics] = useState<TrackMetrics[]>([])
  const [communications, setCommunications] = useState<CommunicationIntegration[]>([])
  const [stats, setStats] = useState({
    total_scrapes: 0,
    success_rate: 0,
    avg_response_time: 0,
    last_24h_scrapes: 0
  })

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch scraping history
      const { data: historyData, error: historyError } = await supabase
        .from('scraping_history')
        .select('*')
        .order('scraped_at', { ascending: false })
        .limit(50)

      if (historyError) throw historyError

      // Fetch track metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('track_metrics')
        .select('*')
        .order('collected_at', { ascending: false })
        .limit(20)

      if (metricsError) throw metricsError

      // Fetch communication integrations
      const { data: commData, error: commError } = await supabase
        .from('communication_integrations')
        .select('*')

      if (commError) throw commError

      setScrapingHistory(historyData || [])
      setTrackMetrics(metricsData || [])
      setCommunications((commData || []).map(item => ({
        ...item,
        notification_types: Array.isArray(item.notification_types) 
          ? item.notification_types.filter((t): t is string => typeof t === 'string')
          : []
      })))

      // Calculate stats
      if (historyData) {
        const totalScrapes = historyData.length
        const successfulScrapes = historyData.filter(h => h.status === 'success').length
        const successRate = totalScrapes > 0 ? (successfulScrapes / totalScrapes) * 100 : 0
        const avgResponseTime = historyData
          .filter(h => h.response_time_ms)
          .reduce((acc, h) => acc + (h.response_time_ms || 0), 0) / (historyData.filter(h => h.response_time_ms).length || 1)
        
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const last24hScrapes = historyData.filter(h => new Date(h.scraped_at) > last24h).length

        setStats({
          total_scrapes: totalScrapes,
          success_rate: Math.round(successRate * 10) / 10,
          avg_response_time: Math.round(avgResponseTime),
          last_24h_scrapes: last24hScrapes
        })
      }

    } catch (error: any) {
      console.error('Error fetching integration data:', error)
      toast({
        title: "Error",
        description: "Failed to load integration data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-success" />
      case 'failed': return <XCircle className="h-4 w-4 text-destructive" />
      case 'pending': return <Clock className="h-4 w-4 text-warning" />
      default: return <AlertTriangle className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'success': return 'default'
      case 'failed': return 'destructive'
      case 'pending': return 'secondary'
      default: return 'outline'
    }
  }

  if (loading) {
    return <Skeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Integration Hub</h1>
          <p className="text-muted-foreground">
            Manage web scraping, communications, and external integrations
          </p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Scrapes</p>
                <p className="text-2xl font-bold">{stats.total_scrapes}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{stats.success_rate}%</p>
              </div>
              <CheckCircle className={`h-8 w-8 ${stats.success_rate > 80 ? 'text-success' : 'text-warning'}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Response</p>
                <p className="text-2xl font-bold">{stats.avg_response_time}ms</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last 24h</p>
                <p className="text-2xl font-bold">{stats.last_24h_scrapes}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="scraping" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scraping">Web Scraping</TabsTrigger>
          <TabsTrigger value="tracks">Track Metrics</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
        </TabsList>

        <TabsContent value="scraping" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Scraping History
              </CardTitle>
              <CardDescription>
                Recent SoundCloud profile and track scraping operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scrapingHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No scraping history available
                  </div>
                ) : (
                  scrapingHistory.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(item.status)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.target_type}</span>
                            <Badge variant="outline">{item.target_handle || 'N/A'}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate max-w-md">
                            {item.target_url}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={getStatusBadgeVariant(item.status)}>
                          {item.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(item.scraped_at), 'MMM d, HH:mm')}
                        </p>
                        {item.response_time_ms && (
                          <p className="text-xs text-muted-foreground">
                            {item.response_time_ms}ms
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Track Metrics
              </CardTitle>
              <CardDescription>
                Recently scraped SoundCloud track performance data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trackMetrics.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No track metrics available
                  </div>
                ) : (
                  trackMetrics.map((track) => (
                    <div key={track.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{track.track_title || 'Unknown Track'}</h4>
                          <p className="text-sm text-muted-foreground">by @{track.artist_handle}</p>
                        </div>
                        <Badge variant="outline">
                          {format(new Date(track.collected_at), 'MMM d, HH:mm')}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                        <div className="text-center">
                          <p className="text-lg font-bold">{track.play_count.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Plays</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold">{track.like_count.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Likes</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold">{track.repost_count.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Reposts</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold">{track.comment_count.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Comments</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Communication Integrations
              </CardTitle>
              <CardDescription>
                Slack, Discord, and webhook configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {communications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No communication integrations configured</p>
                    <Button className="mt-4" variant="outline">
                      Add Integration
                    </Button>
                  </div>
                ) : (
                  communications.map((comm) => (
                    <div key={comm.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="h-5 w-5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{comm.name}</span>
                            <Badge variant="outline">{comm.platform}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {comm.notification_types.length} notification types
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={comm.enabled ? 'default' : 'secondary'}>
                          {comm.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                        <Button variant="secondary" size="sm">Settings</Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}