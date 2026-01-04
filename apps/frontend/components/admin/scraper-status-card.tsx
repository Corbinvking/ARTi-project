"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, Play, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react"
import { useScraperStatus, useTriggerScraper, useScraperLogs, useScraperHealth } from "@/hooks/useScraperControl"
import { formatDistanceToNow } from "date-fns"

export function ScraperStatusCard() {
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useScraperStatus()
  const { data: health, refetch: refetchHealth } = useScraperHealth()
  const triggerScraper = useTriggerScraper()
  const [showLogs, setShowLogs] = useState(false)
  const [logType, setLogType] = useState<'production' | 'errors' | 'cron'>('production')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const { data: logs, refetch: fetchLogs, isFetching: logsLoading } = useScraperLogs(logType, 100)
  const logsContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (autoRefresh && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight
    }
  }, [logs, autoRefresh])

  const lastRunHoursAgo = status?.lastRun?.timestamp
    ? Math.floor((Date.now() - new Date(status.lastRun.timestamp).getTime()) / (1000 * 60 * 60))
    : null

  const isStale = lastRunHoursAgo !== null && lastRunHoursAgo > 36
  const isRunning = status?.isRunning ?? false

  // Auto-open logs and enable streaming when scraper is running
  useEffect(() => {
    if (isRunning) {
      setShowLogs(true)
      setAutoRefresh(true)
      setLogType('production')
      fetchLogs()
    } else {
      // Stop auto-refresh when scraper stops
      setAutoRefresh(false)
    }
  }, [isRunning])

  const getStatusColor = (healthStatus?: string) => {
    switch (healthStatus) {
      case 'healthy':
        return 'text-green-500'
      case 'degraded':
        return 'text-yellow-500'
      case 'unhealthy':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  const handleTrigger = async () => {
    console.log('🚀 Force Re-run button clicked!');
    console.log('Current status:', status);
    console.log('Is running:', status?.isRunning);
    console.log('Is pending:', triggerScraper.isPending);
    try {
      console.log('Calling triggerScraper.mutateAsync()...');
      const result = await triggerScraper.mutateAsync();
      console.log('✅ Trigger result:', result);
      // Refetch status after 2 seconds
      setTimeout(() => refetchStatus(), 2000)
    } catch (error: any) {
      console.error('❌ Failed to trigger scraper:', error)
    }
  }

  const handleHealthCheck = async () => {
    await refetchHealth()
  }

  const handleViewLogs = async (type: typeof logType) => {
    setLogType(type)
    if (showLogs && logType === type) {
      setShowLogs(false)
      setAutoRefresh(false) // Stop auto-refresh when closing logs
    } else {
      setShowLogs(true)
      await fetchLogs()
    }
  }

  const handleRefreshLogs = async () => {
    await fetchLogs()
  }

  // Auto-refresh logs every 3 seconds when enabled
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined
    
    if (autoRefresh && showLogs) {
      interval = setInterval(() => {
        fetchLogs()
      }, 3000) // Refresh every 3 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [autoRefresh, showLogs, fetchLogs])

  if (statusLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading scraper status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span>Spotify Scraper</span>
            {status?.isRunning ? (
              <Badge variant="destructive" className="flex items-center space-x-1">
                <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                <span>Running</span>
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <div className="h-2 w-2 rounded-full bg-gray-500" />
                <span>Idle</span>
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleHealthCheck}
              disabled={status?.isRunning}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Health Check
            </Button>
            <Button
              size="sm"
              onClick={handleTrigger}
              disabled={status?.isRunning || triggerScraper.isPending}
            >
              <Play className="h-4 w-4 mr-2" />
              {triggerScraper.isPending ? 'Triggering...' : 'Force Re-run'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Info */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Last Run</p>
            <p className={`text-lg font-semibold ${isStale ? 'text-red-500' : ''}`}>
              {lastRunHoursAgo !== null
                ? `${lastRunHoursAgo}h ago ${isStale ? '⚠️' : ''}`
                : 'Never'}
            </p>
            {status?.lastRun?.timestamp && (
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(status.lastRun.timestamp), { addSuffix: true })}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Last Status</p>
            <div className="flex items-center space-x-2">
              {status?.lastRun?.status === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : status?.lastRun?.status ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : null}
              <p className="text-lg font-semibold">
                {status?.lastRun?.status || 'Unknown'}
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Cron Schedule</p>
            <div className="flex items-center space-x-2">
              {status?.cronScheduled ? (
                <Badge variant="default">✓ Scheduled</Badge>
              ) : (
                <Badge variant="destructive">✗ Not Found</Badge>
              )}
            </div>
            {status?.cronSchedule && (
              <p className="text-xs text-muted-foreground font-mono mt-1">
                Daily at 2 AM
              </p>
            )}
          </div>
        </div>

        {/* Health Status */}
        {status?.lastHealthCheck && (
          <div className="border border-border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">System Health</span>
              <Badge
                variant={
                  status.lastHealthCheck.overall_status === 'healthy'
                    ? 'default'
                    : status.lastHealthCheck.overall_status === 'degraded'
                    ? 'secondary'
                    : 'destructive'
                }
              >
                {status.lastHealthCheck.overall_status.toUpperCase()}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(status.lastHealthCheck.checks).map(([check, result]) => (
                <div key={check} className="flex items-start space-x-2">
                  <span className="text-muted-foreground min-w-[120px]">{check}:</span>
                  <span className={result.startsWith('✓') ? 'text-green-500' : result.startsWith('⚠') ? 'text-yellow-500' : 'text-red-500'}>
                    {result}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alerts */}
        {isStale && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Scraper hasn't run in {lastRunHoursAgo} hours! Check logs or trigger manually.
            </AlertDescription>
          </Alert>
        )}

        {status?.lastHealthCheck?.errors && status.lastHealthCheck.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <strong>Recent Errors:</strong>
                <ul className="mt-2 space-y-1 text-xs font-mono list-disc list-inside">
                  {status.lastHealthCheck.errors.map((error: string, i: number) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {triggerScraper.isSuccess && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Scraper triggered successfully! It will start processing campaigns shortly.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {triggerScraper.isError && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {(triggerScraper.error as Error)?.message || 'Failed to trigger scraper'}
            </AlertDescription>
          </Alert>
        )}

        {/* Health Check Results */}
        {health && (
          <Alert variant={health.overall_status === 'healthy' ? 'default' : 'destructive'}>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <strong>Health Check Complete - Status: {health.overall_status.toUpperCase()}</strong>
                {health.errors.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs font-mono list-disc list-inside">
                    {health.errors.map((error: string, i: number) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Logs Toggle */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewLogs('production')}
            disabled={logsLoading}
          >
            {showLogs && logType === 'production' ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
            Production Logs
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewLogs('errors')}
            disabled={logsLoading}
          >
            {showLogs && logType === 'errors' ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
            Error Logs
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewLogs('cron')}
            disabled={logsLoading}
          >
            {showLogs && logType === 'cron' ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
            Cron Logs
          </Button>
        </div>

        {/* Logs Display */}
        {showLogs && logs && (
          <div ref={logsContainerRef} className="bg-muted rounded-lg p-4 max-h-96 overflow-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {logType.charAt(0).toUpperCase() + logType.slice(1)} Logs (Last {logs.logs.length} lines)
                {autoRefresh && <Badge variant="default" className="ml-2 text-xs">Auto-refreshing</Badge>}
              </span>
              <div className="flex items-center space-x-2">
                <Button 
                  variant={autoRefresh ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  title={autoRefresh ? "Disable auto-refresh" : "Enable auto-refresh (every 3s)"}
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
                  Auto
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefreshLogs}
                  disabled={logsLoading}
                  title="Refresh logs now"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${logsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowLogs(false)}>
                  Close
                </Button>
              </div>
            </div>
            <pre className="text-xs font-mono whitespace-pre-wrap break-all">
              {logs.logs.join('\n') || 'No logs available'}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

