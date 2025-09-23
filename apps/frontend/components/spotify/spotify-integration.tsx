"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Music, Users, TrendingUp, PlayCircle, RefreshCw } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface SpotifyConnection {
  provider: string
  account_name: string
  last_sync_at: string
  created_at: string
}

interface SpotifyMetric {
  id: string
  kpi: string
  value: string
  ts: string
  source: string
}

export function SpotifyIntegration() {
  const [connection, setConnection] = useState<SpotifyConnection | null>(null)
  const [metrics, setMetrics] = useState<SpotifyMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    loadSpotifyData()
  }, [])

  const loadSpotifyData = async () => {
    try {
      setLoading(true)
      
      // Load connections
      const connectionsResponse = await fetch('/api/providers/connections')
      if (connectionsResponse.ok) {
        const { connections } = await connectionsResponse.json()
        const spotifyConnection = connections.find((c: any) => c.provider === 'spotify')
        setConnection(spotifyConnection || null)
      }

      // Load metrics
      const metricsResponse = await fetch('/api/metrics/spotify')
      if (metricsResponse.ok) {
        const { metrics } = await metricsResponse.json()
        setMetrics(metrics || [])
      }
      
    } catch (error) {
      console.error('Error loading Spotify data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    try {
      const response = await fetch('/api/providers/spotify/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const { auth_url } = await response.json()
        window.open(auth_url, '_blank')
      }
    } catch (error) {
      console.error('Error connecting Spotify:', error)
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      const response = await fetch('/api/providers/spotify/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        // Reload data after sync
        setTimeout(() => {
          loadSpotifyData()
          setSyncing(false)
        }, 2000)
      }
    } catch (error) {
      console.error('Error syncing Spotify:', error)
      setSyncing(false)
    }
  }

  const getLatestMetric = (kpi: string) => {
    const metric = metrics
      .filter(m => m.kpi === kpi)
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())[0]
    return metric ? parseInt(metric.value) : 0
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner className="mr-2" />
        <span>Loading Spotify integration...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">Spotify Connection</CardTitle>
          <Music className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          {connection ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <Badge variant="default" className="bg-green-500">Connected</Badge>
                  <span className="text-sm text-muted-foreground">
                    {connection.account_name || 'Spotify Account'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Last sync: {connection.last_sync_at ? new Date(connection.last_sync_at).toLocaleString() : 'Never'}
                </p>
              </div>
              <Button 
                onClick={handleSync} 
                disabled={syncing}
                size="sm"
                variant="outline"
              >
                {syncing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Now
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <Badge variant="secondary">Not Connected</Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  Connect your Spotify account to start tracking metrics
                </p>
              </div>
              <Button onClick={handleConnect} size="sm">
                <Music className="mr-2 h-4 w-4" />
                Connect Spotify
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metrics Overview */}
      {connection && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Followers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(getLatestMetric('followers'))}</div>
              <p className="text-xs text-muted-foreground">
                Total Spotify followers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Listeners</CardTitle>
              <PlayCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(getLatestMetric('monthly_listeners'))}</div>
              <p className="text-xs text-muted-foreground">
                Unique monthly listeners
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Popularity Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getLatestMetric('popularity')}</div>
              <p className="text-xs text-muted-foreground">
                Spotify popularity index
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Metrics */}
      {connection && metrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.slice(0, 10).map((metric, index) => (
                <div key={metric.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {metric.kpi.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(metric.ts).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatNumber(parseInt(metric.value))}</p>
                      <Badge variant="outline" className="text-xs">
                        {metric.source}
                      </Badge>
                    </div>
                  </div>
                  {index < metrics.slice(0, 10).length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {connection && metrics.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Music className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium">No metrics data</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Click "Sync Now" to fetch your latest Spotify metrics.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
