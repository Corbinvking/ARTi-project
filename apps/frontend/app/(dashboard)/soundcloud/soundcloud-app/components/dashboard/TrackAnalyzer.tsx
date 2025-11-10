"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '../../integrations/supabase/client'
import { useToast } from '../../hooks/use-toast'
import { 
  Music, Play, Heart, Repeat, MessageCircle, 
  TrendingUp, Clock, BarChart3, RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'

interface TrackMetrics {
  track_url: string
  track_title?: string
  artist_handle?: string
  play_count: number
  like_count: number
  repost_count: number
  comment_count: number
  collected_at: string
}

interface AnalysisResult {
  success: boolean
  metrics?: TrackMetrics
  scraping_time_ms?: number
  error?: string
}

export const TrackAnalyzer = () => {
  const { toast } = useToast()
  const [trackUrl, setTrackUrl] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [results, setResults] = useState<AnalysisResult | null>(null)
  const [history, setHistory] = useState<TrackMetrics[]>([])

  const handleAnalyzeTrack = async () => {
    if (!trackUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a SoundCloud track URL",
        variant: "destructive",
      })
      return
    }

    if (!trackUrl.includes('soundcloud.com/')) {
      toast({
        title: "Error",
        description: "Please enter a valid SoundCloud track URL",
        variant: "destructive",
      })
      return
    }

    setAnalyzing(true)
    setResults(null)

    try {
      const { data, error } = await supabase.functions.invoke('scrape-soundcloud-track', {
        body: { track_url: trackUrl.trim() }
      })

      if (error) throw error

      setResults(data)

      if (data.success) {
        toast({
          title: "Success",
          description: `Track analyzed in ${data.scraping_time_ms}ms`,
        })
        
        // Refresh history
        await fetchHistory()
        setTrackUrl('')
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to analyze track",
          variant: "destructive",
        })
      }

    } catch (error: any) {
      console.error('Error analyzing track:', error)
      setResults({
        success: false,
        error: error.message || 'Failed to analyze track'
      })
      toast({
        title: "Error",
        description: error.message || "Failed to analyze track",
        variant: "destructive",
      })
    } finally {
      setAnalyzing(false)
    }
  }

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('track_metrics')
        .select('*')
        .order('collected_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setHistory(data || [])

    } catch (error: any) {
      console.error('Error fetching history:', error)
    }
  }

  const calculateEngagementRate = (metrics: TrackMetrics): string => {
    if (metrics.play_count === 0) return "0.00"
    const totalEngagement = metrics.like_count + metrics.repost_count + metrics.comment_count
    return ((totalEngagement / metrics.play_count) * 100).toFixed(2)
  }

  const getEngagementColor = (rate: number) => {
    if (rate >= 5) return 'text-success'
    if (rate >= 2) return 'text-warning'
    return 'text-muted-foreground'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Track Analyzer</h1>
        <p className="text-muted-foreground">
          Analyze SoundCloud track performance metrics and engagement
        </p>
      </div>

      {/* Track Analysis Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Analyze Track
          </CardTitle>
          <CardDescription>
            Enter a SoundCloud track URL to scrape current performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://soundcloud.com/artist/track-name"
              value={trackUrl}
              onChange={(e) => setTrackUrl(e.target.value)}
              className="flex-1"
              disabled={analyzing}
            />
            <Button 
              onClick={handleAnalyzeTrack}
              disabled={!trackUrl.trim() || analyzing}
            >
              {analyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analyze
                </>
              )}
            </Button>
          </div>

          {/* Analysis Results */}
          {results && (
            <div className="mt-4">
              {results.success && results.metrics ? (
                <Card className="border-success">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{results.metrics.track_title}</h3>
                        <p className="text-muted-foreground">by @{results.metrics.artist_handle}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="default">
                          Analyzed in {results.scraping_time_ms}ms
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(results.metrics.collected_at), 'MMM d, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-background rounded-lg">
                        <Play className="h-6 w-6 mx-auto mb-2 text-primary" />
                        <p className="text-2xl font-bold">{results.metrics.play_count.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Plays</p>
                      </div>
                      <div className="text-center p-3 bg-background rounded-lg">
                        <Heart className="h-6 w-6 mx-auto mb-2 text-red-500" />
                        <p className="text-2xl font-bold">{results.metrics.like_count.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Likes</p>
                      </div>
                      <div className="text-center p-3 bg-background rounded-lg">
                        <Repeat className="h-6 w-6 mx-auto mb-2 text-green-500" />
                        <p className="text-2xl font-bold">{results.metrics.repost_count.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Reposts</p>
                      </div>
                      <div className="text-center p-3 bg-background rounded-lg">
                        <MessageCircle className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                        <p className="text-2xl font-bold">{results.metrics.comment_count.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Comments</p>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-background rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          <span className="font-medium">Engagement Rate</span>
                        </div>
                        <span className={`text-lg font-bold ${getEngagementColor(parseFloat(calculateEngagementRate(results.metrics)))}`}>
                          {calculateEngagementRate(results.metrics)}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-destructive">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-destructive">
                      <RefreshCw className="h-5 w-5" />
                      <span className="font-medium">Analysis Failed</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {results.error || 'Unknown error occurred'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Analysis History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Analyses
              </CardTitle>
              <CardDescription>
                Previously analyzed tracks and their performance metrics
              </CardDescription>
            </div>
            <Button variant="outline" onClick={fetchHistory}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No track analyses yet</p>
                <p className="text-sm">Analyze your first track above to see results here</p>
              </div>
            ) : (
              history.map((track, index) => (
                <div key={`${track.track_url}-${index}`} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{track.track_title || 'Unknown Track'}</h4>
                      <p className="text-sm text-muted-foreground">by @{track.artist_handle}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">
                        {format(new Date(track.collected_at), 'MMM d, HH:mm')}
                      </Badge>
                      <p className={`text-sm font-medium mt-1 ${getEngagementColor(parseFloat(calculateEngagementRate(track)))}`}>
                        {calculateEngagementRate(track)}% engagement
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold">{track.play_count.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Plays</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{track.like_count.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Likes</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{track.repost_count.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Reposts</p>
                    </div>
                    <div>
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
    </div>
  )
}