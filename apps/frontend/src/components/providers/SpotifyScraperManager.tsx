'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  Trash2,
  Download,
  AlertTriangle,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScrapingJob {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  songCount: number
  startedAt?: string
  completedAt?: string
  successCount: number
  failureCount: number
  errorMessage?: string
}

interface ScraperHealth {
  status: 'healthy' | 'unhealthy'
  activeJobs: number
  completedJobs: number
  failedJobs: number
  averageExecutionTime: number
  lastSuccessfulRun?: string
}

export function SpotifyScraperManager() {
  const [songUrls, setSongUrls] = useState('')
  const [jobs, setJobs] = useState<ScrapingJob[]>([])
  const [health, setHealth] = useState<ScraperHealth | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Load initial data
  useEffect(() => {
    loadJobs()
    loadHealth()
    
    // Set up polling for job updates
    const interval = setInterval(() => {
      loadJobs()
      loadHealth()
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(interval)
  }, [])

  const loadJobs = async () => {
    try {
      const response = await fetch('/api/providers/spotify/scrape', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setJobs(data.jobs || [])
      }
    } catch (error) {
      console.error('Failed to load jobs:', error)
    }
  }

  const loadHealth = async () => {
    try {
      const response = await fetch('/api/providers/spotify/health', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setHealth(data.health)
      }
    } catch (error) {
      console.error('Failed to load health:', error)
    }
  }

  const startScraping = async () => {
    if (!songUrls.trim()) {
      setError('Please enter at least one Spotify song URL')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Parse URLs from textarea (one per line)
      const urls = songUrls
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0)

      const response = await fetch('/api/providers/spotify/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ songUrls: urls })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(`Scraping job started successfully! Job ID: ${data.jobId}`)
        setSongUrls('') // Clear the input
        loadJobs() // Refresh job list
      } else {
        setError(data.message || 'Failed to start scraping job')
      }
    } catch (error) {
      setError('Network error occurred')
      console.error('Scraping error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default' // Green
      case 'running':
        return 'secondary' // Blue  
      case 'pending':
        return 'outline' // Yellow
      case 'failed':
        return 'destructive' // Red
      default:
        return 'outline'
    }
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`
    return `${Math.round(seconds / 3600)}h`
  }

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Spotify Scraper</h2>
          <p className="text-muted-foreground">
            Scrape Spotify playlist data for your songs
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => { loadJobs(); loadHealth(); }}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Health Status */}
      {health && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Scraper Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className={cn(
                  "text-2xl font-bold",
                  health.status === 'healthy' ? "text-green-600" : "text-red-600"
                )}>
                  {health.status === 'healthy' ? '✓' : '✗'}
                </div>
                <div className="text-sm text-muted-foreground">Status</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{health.activeJobs}</div>
                <div className="text-sm text-muted-foreground">Active Jobs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{health.completedJobs}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{health.failedJobs}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formatDuration(health.averageExecutionTime)}
                </div>
                <div className="text-sm text-muted-foreground">Avg Time</div>
              </div>
            </div>
            {health.lastSuccessfulRun && (
              <div className="mt-4 text-sm text-muted-foreground">
                Last successful run: {formatDateTime(health.lastSuccessfulRun)}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Start New Job */}
      <Card>
        <CardHeader>
          <CardTitle>Start New Scraping Job</CardTitle>
          <CardDescription>
            Enter Spotify song URLs (one per line) to start scraping playlist data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="songUrls">Song URLs</Label>
            <Textarea
              id="songUrls"
              placeholder="https://artists.spotify.com/c/artist/xxx/song/xxx/playlists&#10;https://artists.spotify.com/c/artist/yyy/song/yyy/playlists"
              value={songUrls}
              onChange={(e) => setSongUrls(e.target.value)}
              rows={4}
              disabled={isLoading}
            />
            <div className="text-sm text-muted-foreground">
              Each URL should be from artists.spotify.com and contain /song/
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={startScraping} 
            disabled={isLoading || !songUrls.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Starting Scraper...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Scraping
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Job History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Scraping Jobs</CardTitle>
          <CardDescription>
            Track the progress and results of your scraping jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No scraping jobs found. Start your first job above!
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div 
                  key={job.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(job.status)}
                      <div>
                        <div className="font-medium">Job {job.id.slice(-8)}</div>
                        <div className="text-sm text-muted-foreground">
                          {job.songCount} songs
                        </div>
                      </div>
                    </div>
                    <Badge variant={getStatusBadgeVariant(job.status)}>
                      {job.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Started</div>
                      <div>{formatDateTime(job.startedAt)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Completed</div>
                      <div>{formatDateTime(job.completedAt)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Success</div>
                      <div className="text-green-600">{job.successCount}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Failed</div>
                      <div className="text-red-600">{job.failureCount}</div>
                    </div>
                  </div>

                  {job.errorMessage && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{job.errorMessage}</AlertDescription>
                    </Alert>
                  )}

                  {job.status === 'completed' && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download Results
                      </Button>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
