"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  BookOpen,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
  Wifi,
  Server,
  ChevronDown,
  ChevronUp,
  Link2,
  Unlink,
  Clock,
  Shield,
  Activity,
  Zap,
  AlertTriangle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  useQBOStatus,
  useQBOMetrics,
  useQBOWebhookEvents,
  useQBORequestLog,
  useTriggerQBOSync,
  useTriggerQBOIncrementalSync,
  useQBOConnect,
  useQBODisconnect,
  useQBOTestConnection,
  useQBORefreshToken,
} from "@/hooks/useQuickBooks"
import { formatDistanceToNow } from "date-fns"

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never"
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
  } catch {
    return "Unknown"
  }
}

export function QuickBooksStatusCard() {
  const { toast } = useToast()
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQBOStatus()
  const { data: metrics, refetch: refetchMetrics } = useQBOMetrics()
  const { data: webhookData, refetch: fetchWebhooks, isFetching: webhooksLoading } = useQBOWebhookEvents()
  const { data: requestLogData, refetch: fetchRequestLog, isFetching: logsLoading } = useQBORequestLog()
  const { refetch: testConnection, data: testResult, isFetching: testingConnection } = useQBOTestConnection()
  const triggerSync = useTriggerQBOSync()
  const triggerIncremental = useTriggerQBOIncrementalSync()
  const connectQBO = useQBOConnect()
  const disconnectQBO = useQBODisconnect()
  const refreshToken = useQBORefreshToken()

  const [showSyncTable, setShowSyncTable] = useState(true)
  const [showApiHealth, setShowApiHealth] = useState(false)
  const [showWebhooks, setShowWebhooks] = useState(false)
  const [showRequestLog, setShowRequestLog] = useState(false)
  const [syncingEntity, setSyncingEntity] = useState<string | null>(null)

  const isConnected = status?.connected ?? false
  const conn = status?.connection

  // ---- Alert conditions ----
  const tokenExpiresSoon = (status?.token_health?.expires_in_minutes ?? 999) < 10
  const tokenExpired = status?.token_health?.is_expired ?? false
  const highThrottleRate = metrics?.api_calls_24h && parseFloat(metrics.api_calls_24h.throttle_rate) > 2
  const webhookLagHigh = metrics?.webhooks_24h?.lag_p95_ms != null && metrics.webhooks_24h.lag_p95_ms > 600000
  const tokenRefreshFailures = (metrics?.token_refresh_24h?.failed ?? 0) > 5
  const hasAlerts = tokenExpired || tokenExpiresSoon || highThrottleRate || webhookLagHigh || tokenRefreshFailures

  // ---- Handlers ----
  const handleConnect = async () => {
    try {
      const result = await connectQBO.mutateAsync()
      if (result.auth_url) {
        window.location.href = result.auth_url
      }
    } catch (err: any) {
      toast({ title: "Connection Failed", description: err.message, variant: "destructive" })
    }
  }

  const handleDisconnect = async () => {
    try {
      await disconnectQBO.mutateAsync()
      toast({ title: "Disconnected", description: "QuickBooks has been disconnected." })
      refetchStatus()
    } catch (err: any) {
      toast({ title: "Disconnect Failed", description: err.message, variant: "destructive" })
    }
  }

  const handleFullSync = async (entityType?: string) => {
    setSyncingEntity(entityType || 'all')
    try {
      const result = await triggerSync.mutateAsync(entityType)
      toast({ title: "Sync Complete", description: entityType ? `${entityType}: ${result.count} records` : "All entities synced." })
      refetchStatus()
      refetchMetrics()
    } catch (err: any) {
      toast({ title: "Sync Failed", description: err.message, variant: "destructive" })
    } finally {
      setSyncingEntity(null)
    }
  }

  const handleIncrementalSync = async () => {
    setSyncingEntity('incremental')
    try {
      await triggerIncremental.mutateAsync()
      toast({ title: "Incremental Sync Complete", description: "CDC sync finished." })
      refetchStatus()
    } catch (err: any) {
      toast({ title: "Sync Failed", description: err.message, variant: "destructive" })
    } finally {
      setSyncingEntity(null)
    }
  }

  const handleTestConnection = async () => {
    await testConnection()
    toast({
      title: "Connection Test",
      description: testResult?.ok ? `OK — ${testResult.latency_ms}ms` : (testResult?.error || "Test complete"),
      variant: testResult?.ok ? "default" : "destructive",
    })
  }

  const handleRefreshToken = async () => {
    try {
      await refreshToken.mutateAsync()
      toast({ title: "Token Refreshed", description: "Access token has been refreshed." })
      refetchStatus()
    } catch (err: any) {
      toast({ title: "Refresh Failed", description: err.message, variant: "destructive" })
    }
  }

  // ---- Loading state ----
  if (statusLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading QuickBooks status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const entityTypes = ['Customer', 'Invoice', 'Payment', 'Vendor', 'Item', 'Account']

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BookOpen className="h-5 w-5 text-green-600" />
            <span>QuickBooks Integration</span>
            {isConnected ? (
              <Badge className="bg-green-500">Connected</Badge>
            ) : (
              <Badge variant="secondary">Disconnected</Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {isConnected && (
              <Button variant="outline" size="sm" onClick={() => { refetchStatus(); refetchMetrics(); }}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            )}
            {isConnected ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnectQBO.isPending}
              >
                <Unlink className="h-4 w-4 mr-2" />
                {disconnectQBO.isPending ? "Disconnecting..." : "Disconnect"}
              </Button>
            ) : (
              <Button size="sm" onClick={handleConnect} disabled={connectQBO.isPending}>
                <Link2 className="h-4 w-4 mr-2" />
                {connectQBO.isPending ? "Connecting..." : "Connect QuickBooks"}
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ---- Alert Banners ---- */}
        {hasAlerts && (
          <div className="space-y-2">
            {tokenExpired && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Access token is expired! API calls will fail.</span>
                  <Button size="sm" variant="outline" onClick={handleRefreshToken} disabled={refreshToken.isPending}>
                    {refreshToken.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Refresh Now"}
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {!tokenExpired && tokenExpiresSoon && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Access token expires in {status?.token_health?.expires_in_minutes} minutes. Auto-refresh will trigger on next API call.
                </AlertDescription>
              </Alert>
            )}
            {highThrottleRate && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  High API throttle rate ({metrics?.api_calls_24h.throttle_rate}) in the last 24h. Consider reducing sync frequency.
                </AlertDescription>
              </Alert>
            )}
            {webhookLagHigh && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Webhook processing lag is high (p95: {Math.round((metrics?.webhooks_24h.lag_p95_ms || 0) / 1000)}s). Check async processing pipeline.
                </AlertDescription>
              </Alert>
            )}
            {tokenRefreshFailures && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {metrics?.token_refresh_24h.failed} token refresh failures in the last 24h. The connection may need re-authorization.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* ---- Not Connected State ---- */}
        {!isConnected && (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No QuickBooks account connected.</p>
            <p className="text-xs mt-1">Click "Connect QuickBooks" to authorize access to your accounting data.</p>
          </div>
        )}

        {/* ---- Connected State ---- */}
        {isConnected && conn && (
          <>
            {/* Connection Health Grid */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Company</p>
                <p className="text-lg font-semibold">{conn.company_name || "Unknown"}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  Realm: {conn.realm_id}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Token Health</p>
                <div className="flex items-center space-x-2">
                  {tokenExpired ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : tokenExpiresSoon ? (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  <span className="text-lg font-semibold">
                    {tokenExpired ? "Expired" : `${status?.token_health?.expires_in_minutes}m`}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Refreshed {formatRelativeTime(status?.token_health?.last_refreshed_at ?? null)}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">API Quota</p>
                <p className="text-lg font-semibold">
                  {status?.api_quota?.requests_this_minute ?? 0} / 500
                </p>
                <Progress
                  value={((status?.api_quota?.requests_this_minute ?? 0) / 500) * 100}
                  className="h-1.5"
                />
                <p className="text-xs text-muted-foreground">req/min this minute</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Environment</p>
                <Badge variant={conn.environment === 'production' ? 'default' : 'secondary'}>
                  {conn.environment}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Connected {formatRelativeTime(conn.connected_at)}
                </p>
              </div>
            </div>

            {/* ---- Sync Status Table ---- */}
            <div className="border border-border rounded-lg">
              <button
                className="flex items-center justify-between w-full p-3 text-left"
                onClick={() => setShowSyncTable(!showSyncTable)}
              >
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Sync Status</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleIncrementalSync(); }}
                    disabled={syncingEntity !== null}
                  >
                    {syncingEntity === 'incremental' ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Zap className="h-3 w-3 mr-1" />
                    )}
                    CDC Sync
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleFullSync(); }}
                    disabled={syncingEntity !== null}
                  >
                    {syncingEntity === 'all' ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    Full Sync All
                  </Button>
                  {showSyncTable ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>

              {showSyncTable && (
                <div className="border-t border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left p-2 pl-3 font-medium text-muted-foreground">Entity</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Local Count</th>
                        <th className="text-left p-2 font-medium text-muted-foreground">Last Synced</th>
                        <th className="text-left p-2 font-medium text-muted-foreground">Last Webhook</th>
                        <th className="text-right p-2 pr-3 font-medium text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entityTypes.map((entity) => {
                        const cursor = status?.sync_status?.find((s) => s.entity_type === entity)
                        const count = status?.entity_counts?.[entity] ?? 0
                        const lastSync = cursor?.last_full_sync_at || cursor?.last_cdc_since
                        const isSyncing = syncingEntity === entity

                        return (
                          <tr key={entity} className="border-b border-border last:border-b-0">
                            <td className="p-2 pl-3 font-medium">{entity}s</td>
                            <td className="p-2 text-right font-mono">{count.toLocaleString()}</td>
                            <td className="p-2 text-muted-foreground text-xs">
                              {formatRelativeTime(lastSync ?? null)}
                            </td>
                            <td className="p-2 text-muted-foreground text-xs">
                              {formatRelativeTime(cursor?.last_webhook_ts ?? null)}
                            </td>
                            <td className="p-2 pr-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFullSync(entity)}
                                disabled={syncingEntity !== null}
                              >
                                {isSyncing ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3 w-3" />
                                )}
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ---- API Health Panel ---- */}
            <div className="border border-border rounded-lg">
              <button
                className="flex items-center justify-between w-full p-3 text-left"
                onClick={() => {
                  setShowApiHealth(!showApiHealth)
                  if (!showApiHealth) {
                    testConnection()
                    refetchMetrics()
                  }
                }}
              >
                <div className="flex items-center space-x-2">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">API Health</span>
                  {metrics?.api_calls_24h && (
                    <Badge variant="outline" className="text-[10px]">
                      {metrics.api_calls_24h.total} calls / 24h
                    </Badge>
                  )}
                </div>
                {showApiHealth ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showApiHealth && metrics && (
                <div className="border-t border-border p-3 space-y-3">
                  {/* Test connection result */}
                  {testResult && (
                    <div className="flex items-start gap-2">
                      {testResult.ok ? (
                        <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">QBO API</span>
                          {testResult.latency_ms && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                              {testResult.latency_ms}ms
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {testResult.ok ? testResult.company_name : testResult.error}
                          {testResult.intuit_tid && ` | tid: ${testResult.intuit_tid}`}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleTestConnection} disabled={testingConnection}>
                        {testingConnection ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wifi className="h-3 w-3" />}
                      </Button>
                    </div>
                  )}

                  {/* API Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-muted/50 rounded-md p-2">
                      <p className="text-xs text-muted-foreground">Success (24h)</p>
                      <p className="text-lg font-semibold text-green-500">{metrics.api_calls_24h.success}</p>
                    </div>
                    <div className="bg-muted/50 rounded-md p-2">
                      <p className="text-xs text-muted-foreground">Errors (24h)</p>
                      <p className="text-lg font-semibold text-red-500">{metrics.api_calls_24h.errors}</p>
                    </div>
                    <div className="bg-muted/50 rounded-md p-2">
                      <p className="text-xs text-muted-foreground">Throttled (429)</p>
                      <p className="text-lg font-semibold text-yellow-500">{metrics.api_calls_24h.throttled}</p>
                    </div>
                    <div className="bg-muted/50 rounded-md p-2">
                      <p className="text-xs text-muted-foreground">Avg Latency</p>
                      <p className="text-lg font-semibold">{metrics.api_calls_24h.avg_duration_ms}ms</p>
                    </div>
                  </div>

                  {/* Token refresh stats */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <Shield className="h-3.5 w-3.5" />
                    <span>Token refresh (24h): {metrics.token_refresh_24h.success} ok, {metrics.token_refresh_24h.failed} failed</span>
                    <span>|</span>
                    <span>Throttle rate: {metrics.api_calls_24h.throttle_rate}</span>
                  </div>
                </div>
              )}
            </div>

            {/* ---- Webhook Monitor ---- */}
            <div className="border border-border rounded-lg">
              <button
                className="flex items-center justify-between w-full p-3 text-left"
                onClick={() => {
                  setShowWebhooks(!showWebhooks)
                  if (!showWebhooks) fetchWebhooks()
                }}
              >
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Webhooks</span>
                  {metrics?.webhooks_24h && (
                    <Badge variant="outline" className="text-[10px]">
                      {metrics.webhooks_24h.total} events / 24h
                    </Badge>
                  )}
                </div>
                {showWebhooks ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showWebhooks && (
                <div className="border-t border-border p-3 space-y-2">
                  {/* Webhook summary */}
                  {metrics?.webhooks_24h && (
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-muted-foreground">Total</p>
                        <p className="font-semibold">{metrics.webhooks_24h.total}</p>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-muted-foreground">Processed</p>
                        <p className="font-semibold text-green-500">{metrics.webhooks_24h.processed}</p>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-muted-foreground">Invalid Sig</p>
                        <p className="font-semibold text-red-500">{metrics.webhooks_24h.invalid_signature}</p>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-muted-foreground">Lag (p95)</p>
                        <p className="font-semibold">
                          {metrics.webhooks_24h.lag_p95_ms != null
                            ? `${Math.round(metrics.webhooks_24h.lag_p95_ms / 1000)}s`
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Recent events */}
                  {webhooksLoading && (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-xs text-muted-foreground">Loading events...</span>
                    </div>
                  )}

                  {webhookData?.events && webhookData.events.length > 0 && (
                    <div className="max-h-48 overflow-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left p-1 font-medium text-muted-foreground">Time</th>
                            <th className="text-left p-1 font-medium text-muted-foreground">Entities</th>
                            <th className="text-center p-1 font-medium text-muted-foreground">Sig</th>
                            <th className="text-center p-1 font-medium text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {webhookData.events.map((event) => {
                            const entities = event.payload?.dataChangeEvent?.entities || []
                            return (
                              <tr key={event.id} className="border-b border-border last:border-b-0">
                                <td className="p-1 text-muted-foreground">
                                  {formatRelativeTime(event.received_at)}
                                </td>
                                <td className="p-1">
                                  {entities.map((e: any) => `${e.name} ${e.operation}`).join(', ') || 'N/A'}
                                </td>
                                <td className="p-1 text-center">
                                  {event.signature_valid ? (
                                    <CheckCircle className="h-3 w-3 text-green-500 inline" />
                                  ) : (
                                    <XCircle className="h-3 w-3 text-red-500 inline" />
                                  )}
                                </td>
                                <td className="p-1 text-center">
                                  {event.processed ? (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0">Done</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-[9px] px-1 py-0">Pending</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {webhookData?.events?.length === 0 && !webhooksLoading && (
                    <p className="text-xs text-muted-foreground text-center py-2">No webhook events in the last 24h.</p>
                  )}
                </div>
              )}
            </div>

            {/* ---- Request Log ---- */}
            <div className="border border-border rounded-lg">
              <button
                className="flex items-center justify-between w-full p-3 text-left"
                onClick={() => {
                  setShowRequestLog(!showRequestLog)
                  if (!showRequestLog) fetchRequestLog()
                }}
              >
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Request Log</span>
                </div>
                <div className="flex items-center space-x-2">
                  {showRequestLog && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); fetchRequestLog(); }}
                      disabled={logsLoading}
                    >
                      <RefreshCw className={`h-3 w-3 ${logsLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  )}
                  {showRequestLog ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>

              {showRequestLog && (
                <div className="border-t border-border">
                  {logsLoading && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-xs text-muted-foreground">Loading logs...</span>
                    </div>
                  )}

                  {requestLogData?.logs && requestLogData.logs.length > 0 && (
                    <div className="max-h-64 overflow-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted/50 sticky top-0">
                            <th className="text-left p-1.5 pl-3 font-medium text-muted-foreground">Time</th>
                            <th className="text-left p-1.5 font-medium text-muted-foreground">Method</th>
                            <th className="text-left p-1.5 font-medium text-muted-foreground">Path</th>
                            <th className="text-center p-1.5 font-medium text-muted-foreground">Status</th>
                            <th className="text-right p-1.5 font-medium text-muted-foreground">Duration</th>
                            <th className="text-left p-1.5 pr-3 font-medium text-muted-foreground">TID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {requestLogData.logs.map((log) => (
                            <tr key={log.id} className="border-b border-border last:border-b-0">
                              <td className="p-1.5 pl-3 text-muted-foreground whitespace-nowrap">
                                {formatRelativeTime(log.created_at)}
                              </td>
                              <td className="p-1.5">
                                <Badge variant="outline" className="text-[9px] px-1 py-0">{log.method}</Badge>
                              </td>
                              <td className="p-1.5 font-mono max-w-[200px] truncate" title={log.path}>
                                {log.path}
                              </td>
                              <td className="p-1.5 text-center">
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] px-1 py-0 ${
                                    log.status_code && log.status_code >= 200 && log.status_code < 300
                                      ? 'text-green-500 border-green-500/30'
                                      : log.status_code && log.status_code >= 400
                                        ? 'text-red-500 border-red-500/30'
                                        : ''
                                  }`}
                                >
                                  {log.status_code || '?'}
                                </Badge>
                              </td>
                              <td className="p-1.5 text-right text-muted-foreground">
                                {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                              </td>
                              <td className="p-1.5 pr-3 font-mono text-muted-foreground max-w-[120px] truncate" title={log.intuit_tid || ''}>
                                {log.intuit_tid ? log.intuit_tid.substring(0, 12) + '...' : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {requestLogData?.logs?.length === 0 && !logsLoading && (
                    <p className="text-xs text-muted-foreground text-center py-4">No API requests logged yet.</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
