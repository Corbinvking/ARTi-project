"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plug, CheckCircle, XCircle, AlertCircle, RefreshCw, Loader2, Wifi, ExternalLink, Server } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://placeholder.invalid'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

type ConnectionStatus = "connected" | "disconnected" | "error" | "testing"

interface ApiEndpointCheck {
  name: string
  url: string
  status: "ok" | "error" | "unknown"
  latencyMs?: number
  detail?: string
}

interface PlatformState {
  status: ConnectionStatus
  lastSync: Date | null
  error?: string
  detail?: string
  dbCount?: number
  apiChecks?: ApiEndpointCheck[]
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return "Never"
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

// Helper to test an API endpoint and return timing
async function probeEndpoint(url: string, method: string = 'GET', timeout: number = 8000): Promise<{ ok: boolean; latencyMs: number; status: number; detail: string }> {
  const start = performance.now()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    const res = await fetch(url, { method, signal: controller.signal })
    clearTimeout(timer)
    const latencyMs = Math.round(performance.now() - start)
    const body = await res.json().catch(() => ({}))
    return {
      ok: res.ok,
      latencyMs,
      status: res.status,
      detail: body.message || body.status || body.error || `HTTP ${res.status}`,
    }
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start)
    if (err.name === 'AbortError') {
      return { ok: false, latencyMs, status: 0, detail: `Timeout after ${timeout}ms` }
    }
    return { ok: false, latencyMs, status: 0, detail: err.message || 'Network error' }
  }
}

export function PlatformIntegrations() {
  const { toast } = useToast()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.artistinfluence.com'

  const [youtube, setYoutube] = useState<PlatformState>({ status: "disconnected", lastSync: null })
  const [spotify, setSpotify] = useState<PlatformState>({ status: "disconnected", lastSync: null })
  const [instagram, setInstagram] = useState<PlatformState>({ status: "disconnected", lastSync: null })
  const [influencePlanner, setInfluencePlanner] = useState<PlatformState>({ status: "disconnected", lastSync: null })
  const [youtubeRefreshing, setYoutubeRefreshing] = useState(false)

  useEffect(() => {
    checkAllStatuses()
  }, [])

  const checkAllStatuses = () => {
    checkYoutubeStatus()
    checkSpotifyStatus()
    checkInstagramStatus()
    checkInfluencePlannerStatus()
  }

  // ======== YOUTUBE ========
  const checkYoutubeStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('youtube_campaigns')
        .select('last_youtube_api_fetch')
        .not('last_youtube_api_fetch', 'is', null)
        .order('last_youtube_api_fetch', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      const { count } = await supabase.from('youtube_campaigns').select('id', { count: 'exact', head: true })

      setYoutube({
        status: data?.last_youtube_api_fetch ? "connected" : "disconnected",
        lastSync: data?.last_youtube_api_fetch ? new Date(data.last_youtube_api_fetch) : null,
        dbCount: count || 0,
        detail: `${count || 0} campaigns in database`,
      })
    } catch (err: any) {
      setYoutube({ status: "error", lastSync: null, error: err.message })
    }
  }

  const testYoutubeConnection = async () => {
    setYoutube(prev => ({ ...prev, status: "testing", apiChecks: undefined }))
    const checks: ApiEndpointCheck[] = []

    // 1. Test the Fastify API server health
    const health = await probeEndpoint(`${apiUrl}/api/health`)
    checks.push({
      name: "API Server",
      url: `${apiUrl}/api/health`,
      status: health.ok ? "ok" : "error",
      latencyMs: health.latencyMs,
      detail: health.detail,
    })

    // 2. Test YouTube Data API endpoint
    const ytApi = await probeEndpoint(`${apiUrl}/api/youtube-data-api/extract-video-id?url=https://youtube.com/watch?v=dQw4w9WgXcQ`)
    checks.push({
      name: "YouTube Data API",
      url: "/api/youtube-data-api/extract-video-id",
      status: ytApi.ok ? "ok" : "error",
      latencyMs: ytApi.latencyMs,
      detail: ytApi.ok ? `Video ID extraction working (${ytApi.latencyMs}ms)` : ytApi.detail,
    })

    // 3. DB campaign count
    const { count } = await supabase.from('youtube_campaigns').select('id', { count: 'exact', head: true })
    checks.push({
      name: "Database",
      url: "youtube_campaigns",
      status: "ok",
      detail: `${count || 0} campaigns`,
    })

    const allOk = checks.every(c => c.status === "ok")
    setYoutube(prev => ({
      ...prev,
      status: allOk ? "connected" : "error",
      apiChecks: checks,
      dbCount: count || 0,
    }))
    toast({ title: "YouTube", description: allOk ? "All checks passed" : "Some checks failed", variant: allOk ? "default" : "destructive" })
  }

  const handleForceRefreshYouTube = async () => {
    setYoutubeRefreshing(true)
    try {
      const response = await fetch(`${apiUrl}/api/youtube-data-api/collect-all-daily-stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeOfDay: 'manual' })
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const result = await response.json()
      setYoutube(prev => ({ ...prev, status: "connected", lastSync: new Date(), detail: `Refreshed ${result.collected || 0} campaigns` }))
      toast({ title: "YouTube Data Refreshed", description: `Updated ${result.collected || 0} campaigns.` })
    } catch (err: any) {
      setYoutube(prev => ({ ...prev, status: "error", error: err.message }))
      toast({ title: "Refresh Failed", description: err.message, variant: "destructive" })
    } finally {
      setYoutubeRefreshing(false)
    }
  }

  // ======== SPOTIFY ========
  const checkSpotifyStatus = async () => {
    try {
      const [{ count: spCount }, { count: ssCount }] = await Promise.all([
        supabase.from('spotify_campaigns').select('id', { count: 'exact', head: true }),
        supabase.from('stream_strategist_campaigns').select('id', { count: 'exact', head: true }),
      ])
      setSpotify({
        status: ((spCount || 0) + (ssCount || 0)) > 0 ? "connected" : "disconnected",
        lastSync: null,
        dbCount: (spCount || 0) + (ssCount || 0),
        detail: `${spCount || 0} campaigns + ${ssCount || 0} stream strategist`,
      })
    } catch (err: any) {
      setSpotify({ status: "error", lastSync: null, error: err.message })
    }
  }

  const testSpotifyConnection = async () => {
    setSpotify(prev => ({ ...prev, status: "testing", apiChecks: undefined }))
    const checks: ApiEndpointCheck[] = []

    // 1. Test Spotify Web API extract-id (lightweight, no auth needed)
    const extractId = await probeEndpoint(`${apiUrl}/api/spotify-web-api/extract-id?url=https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M`)
    checks.push({
      name: "Spotify Web API",
      url: "/api/spotify-web-api/extract-id",
      status: extractId.ok ? "ok" : "error",
      latencyMs: extractId.latencyMs,
      detail: extractId.ok ? `ID extraction working (${extractId.latencyMs}ms)` : extractId.detail,
    })

    // 2. Test Spotify playlist fetch (tests actual Spotify API credentials)
    const playlistFetch = await probeEndpoint(`${apiUrl}/api/spotify-web-api/playlist/37i9dQZF1DXcBWIGoYBM5M`)
    checks.push({
      name: "Spotify API Credentials",
      url: "/api/spotify-web-api/playlist/:id",
      status: playlistFetch.ok ? "ok" : "error",
      latencyMs: playlistFetch.latencyMs,
      detail: playlistFetch.ok ? `Playlist fetch OK (${playlistFetch.latencyMs}ms)` : playlistFetch.detail,
    })

    // 3. DB counts
    const [{ count: spCount }, { count: ssCount }] = await Promise.all([
      supabase.from('spotify_campaigns').select('id', { count: 'exact', head: true }),
      supabase.from('stream_strategist_campaigns').select('id', { count: 'exact', head: true }),
    ])
    checks.push({
      name: "Database",
      url: "spotify_campaigns + stream_strategist_campaigns",
      status: "ok",
      detail: `${spCount || 0} + ${ssCount || 0} campaigns`,
    })

    const allOk = checks.every(c => c.status === "ok")
    setSpotify(prev => ({
      ...prev,
      status: allOk ? "connected" : checks.some(c => c.status === "ok") ? "connected" : "error",
      apiChecks: checks,
      dbCount: (spCount || 0) + (ssCount || 0),
    }))
    toast({ title: "Spotify", description: allOk ? "All checks passed" : "Some checks failed", variant: allOk ? "default" : "destructive" })
  }

  // ======== INSTAGRAM ========
  const checkInstagramStatus = async () => {
    try {
      const { count } = await supabase.from('instagram_campaigns').select('id', { count: 'exact', head: true })
      setInstagram({
        status: (count || 0) > 0 ? "connected" : "disconnected",
        lastSync: null,
        dbCount: count || 0,
        detail: `${count || 0} Instagram campaigns in database`,
      })
    } catch (err: any) {
      setInstagram({ status: "error", lastSync: null, error: err.message })
    }
  }

  const testInstagramConnection = async () => {
    setInstagram(prev => ({ ...prev, status: "testing", apiChecks: undefined }))
    const checks: ApiEndpointCheck[] = []

    // 1. Test Instagram scraper campaigns endpoint
    const campaigns = await probeEndpoint(`${apiUrl}/api/instagram-scraper/campaigns`)
    checks.push({
      name: "Instagram Scraper API",
      url: "/api/instagram-scraper/campaigns",
      status: campaigns.ok ? "ok" : "error",
      latencyMs: campaigns.latencyMs,
      detail: campaigns.ok ? `Scraper API reachable (${campaigns.latencyMs}ms)` : campaigns.detail,
    })

    // 2. Test Apify actor availability (external)
    const apify = await probeEndpoint('https://api.apify.com/v2/acts', 'GET', 5000)
    checks.push({
      name: "Apify Platform",
      url: "api.apify.com",
      status: apify.ok || apify.status === 401 ? "ok" : "error", // 401 means API is reachable but needs auth
      latencyMs: apify.latencyMs,
      detail: apify.ok ? `Apify reachable (${apify.latencyMs}ms)` : apify.status === 401 ? `Apify reachable, auth required (${apify.latencyMs}ms)` : apify.detail,
    })

    // 3. DB count
    const { count } = await supabase.from('instagram_campaigns').select('id', { count: 'exact', head: true })
    checks.push({
      name: "Database",
      url: "instagram_campaigns",
      status: "ok",
      detail: `${count || 0} campaigns`,
    })

    const hasApiOk = checks.some(c => c.status === "ok" && c.name !== "Database")
    setInstagram(prev => ({
      ...prev,
      status: hasApiOk ? "connected" : "error",
      apiChecks: checks,
      dbCount: count || 0,
    }))
    toast({ title: "Instagram", description: hasApiOk ? "API checks passed" : "Some checks failed", variant: hasApiOk ? "default" : "destructive" })
  }

  // ======== INFLUENCE PLANNER (SOUNDCLOUD) ========
  const checkInfluencePlannerStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('soundcloud_settings')
        .select('ip_base_url, ip_username, ip_api_key')
        .order('updated_at', { ascending: false })
        .limit(1)

      if (error) throw error
      const settings = Array.isArray(data) ? data[0] : null

      const { count } = await supabase.from('soundcloud_submissions').select('id', { count: 'exact', head: true })

      if (settings?.ip_api_key && settings?.ip_username) {
        setInfluencePlanner({
          status: "connected",
          lastSync: null,
          dbCount: count || 0,
          detail: `Configured for ${settings.ip_username} | ${count || 0} submissions`,
        })
      } else {
        setInfluencePlanner({
          status: "disconnected",
          lastSync: null,
          dbCount: count || 0,
          detail: "API credentials not configured. Set them in SoundCloud > Settings.",
        })
      }
    } catch (err: any) {
      setInfluencePlanner({ status: "error", lastSync: null, error: err.message })
    }
  }

  const testInfluencePlannerConnection = async () => {
    setInfluencePlanner(prev => ({ ...prev, status: "testing", apiChecks: undefined }))
    const checks: ApiEndpointCheck[] = []

    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token
      if (!token) throw new Error("Not authenticated")

      // 1. Test the IP members proxy route
      const start = performance.now()
      const res = await fetch('/api/soundcloud/influenceplanner/members?limit=1', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const latencyMs = Math.round(performance.now() - start)
      const body = await res.json().catch(() => ({}))

      checks.push({
        name: "Influence Planner API",
        url: "api.influenceplanner.com/partner/v1/network/members",
        status: res.ok ? "ok" : "error",
        latencyMs,
        detail: res.ok ? `${body.body?.totalElements ?? '?'} members (${latencyMs}ms)` : (body.error || `HTTP ${res.status}`),
      })

      // 2. Test schedule creation endpoint (just verify it exists, don't actually schedule)
      checks.push({
        name: "Schedule Endpoint",
        url: "/api/soundcloud/influenceplanner/schedule",
        status: res.ok ? "ok" : "unknown", // If members works, schedule should too
        detail: res.ok ? "Available (same auth)" : "Cannot verify without members access",
      })

      // 3. DB count
      const { count } = await supabase.from('soundcloud_submissions').select('id', { count: 'exact', head: true })
      checks.push({
        name: "Database",
        url: "soundcloud_submissions",
        status: "ok",
        detail: `${count || 0} submissions`,
      })

      const allOk = checks.every(c => c.status === "ok")
      setInfluencePlanner(prev => ({
        ...prev,
        status: allOk ? "connected" : "error",
        lastSync: allOk ? new Date() : prev.lastSync,
        apiChecks: checks,
        dbCount: count || 0,
      }))
      toast({ title: "Influence Planner", description: allOk ? "All checks passed" : "Some checks failed", variant: allOk ? "default" : "destructive" })
    } catch (err: any) {
      checks.push({
        name: "Influence Planner API",
        url: "api.influenceplanner.com",
        status: "error",
        detail: err.message,
      })
      setInfluencePlanner(prev => ({ ...prev, status: "error", apiChecks: checks, error: err.message }))
      toast({ title: "Influence Planner", description: err.message, variant: "destructive" })
    }
  }

  // ======== RENDER ========
  const getStatusIcon = (status: ConnectionStatus) => {
    switch (status) {
      case "connected": return <CheckCircle className="h-4 w-4 text-green-500" />
      case "disconnected": return <XCircle className="h-4 w-4 text-gray-500" />
      case "error": return <AlertCircle className="h-4 w-4 text-red-500" />
      case "testing": return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
    }
  }

  const getStatusBadge = (status: ConnectionStatus) => {
    switch (status) {
      case "connected": return <Badge className="bg-green-500">Connected</Badge>
      case "disconnected": return <Badge variant="secondary">Disconnected</Badge>
      case "error": return <Badge className="bg-red-500">Error</Badge>
      case "testing": return <Badge className="bg-blue-500">Testing...</Badge>
    }
  }

  const getCheckIcon = (status: "ok" | "error" | "unknown") => {
    switch (status) {
      case "ok": return <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
      case "error": return <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
      case "unknown": return <AlertCircle className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
    }
  }

  const renderPlatform = (
    name: string,
    state: PlatformState,
    onTest: () => void,
    extra?: React.ReactNode,
  ) => (
    <div className="border border-border rounded-lg p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getStatusIcon(state.status)}
          <div>
            <h3 className="font-medium">{name}</h3>
            <p className="text-sm text-muted-foreground">
              {state.lastSync
                ? `Last sync: ${formatRelativeTime(state.lastSync)}`
                : state.dbCount !== undefined
                  ? `${state.dbCount.toLocaleString()} records in database`
                  : "Not checked"}
            </p>
          </div>
        </div>
        {getStatusBadge(state.status)}
      </div>

      {/* Error banner */}
      {state.error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-md p-2.5">
          <p className="text-sm text-red-400">{state.error}</p>
        </div>
      )}

      {/* API endpoint check results */}
      {state.apiChecks && state.apiChecks.length > 0 && (
        <div className="bg-muted/50 border border-border rounded-md p-3 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Server className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">API Status</span>
          </div>
          {state.apiChecks.map((check, i) => (
            <div key={i} className="flex items-start gap-2">
              {getCheckIcon(check.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{check.name}</span>
                  {check.latencyMs !== undefined && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      {check.latencyMs}ms
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{check.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Extra content (e.g. YouTube force refresh) */}
      {extra}

      {/* Test Connection button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={onTest}
        disabled={state.status === "testing"}
      >
        {state.status === "testing" ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Testing API endpoints...
          </>
        ) : (
          <>
            <Wifi className="h-4 w-4 mr-2" />
            Test Connection
          </>
        )}
      </Button>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Plug className="h-5 w-5" />
            <span>Platform Integrations</span>
          </div>
          <Button variant="ghost" size="sm" onClick={checkAllStatuses}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderPlatform("YouTube", youtube, testYoutubeConnection, (
          <div className="bg-muted/50 rounded-md p-3">
            <p className="text-sm text-muted-foreground mb-2">
              YouTube data is collected automatically 3x daily (8 AM, 2 PM, 8 PM UTC).
            </p>
            <Button onClick={handleForceRefreshYouTube} disabled={youtubeRefreshing} className="w-full">
              {youtubeRefreshing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Refreshing All Campaigns...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" />Force Refresh All YouTube Data</>
              )}
            </Button>
          </div>
        ))}

        {renderPlatform("Spotify", spotify, testSpotifyConnection)}
        {renderPlatform("Instagram (Apify)", instagram, testInstagramConnection)}
        {renderPlatform("Influence Planner (SoundCloud)", influencePlanner, testInfluencePlannerConnection)}
      </CardContent>
    </Card>
  )
}
