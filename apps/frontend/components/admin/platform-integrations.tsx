"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Plug, Key, CheckCircle, XCircle, AlertCircle, RefreshCw, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@supabase/supabase-js"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface Integration {
  id: string
  name: string
  status: "connected" | "disconnected" | "error"
  enabled: boolean
  apiKey: string
  lastSync: string
  errorMessage?: string
}

// Helper function to format relative time
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

export function PlatformIntegrations() {
  const { toast } = useToast()
  const [youtubeRefreshing, setYoutubeRefreshing] = useState(false)
  const [youtubeLastSync, setYoutubeLastSync] = useState<Date | null>(null)
  const [youtubeStatus, setYoutubeStatus] = useState<"connected" | "disconnected" | "error">("disconnected")
  const [youtubeError, setYoutubeError] = useState<string | undefined>()

  // Fetch YouTube last sync time from database
  useEffect(() => {
    async function fetchYoutubeStatus() {
      try {
        // Get the most recent YouTube API fetch
        const { data, error } = await supabase
          .from('youtube_campaigns')
          .select('last_youtube_api_fetch')
          .not('last_youtube_api_fetch', 'is', null)
          .order('last_youtube_api_fetch', { ascending: false })
          .limit(1)
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching YouTube status:', error)
          setYoutubeStatus("error")
          setYoutubeError(error.message)
          return
        }

        if (data?.last_youtube_api_fetch) {
          setYoutubeLastSync(new Date(data.last_youtube_api_fetch))
          setYoutubeStatus("connected")
          setYoutubeError(undefined)
        } else {
          setYoutubeStatus("disconnected")
        }
      } catch (err) {
        console.error('Error fetching YouTube status:', err)
        setYoutubeStatus("error")
        setYoutubeError("Failed to check status")
      }
    }

    fetchYoutubeStatus()
  }, [])

  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: "spotify",
      name: "Spotify",
      status: "connected",
      enabled: true,
      apiKey: "sk_live_****",
      lastSync: "2 minutes ago",
    },
    {
      id: "instagram",
      name: "Instagram",
      status: "connected",
      enabled: true,
      apiKey: "ig_****",
      lastSync: "5 minutes ago",
    },
    {
      id: "soundcloud",
      name: "SoundCloud",
      status: "disconnected",
      enabled: false,
      apiKey: "",
      lastSync: "Never",
    },
  ])

  const getStatusIcon = (status: Integration["status"]) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "disconnected":
        return <XCircle className="h-4 w-4 text-gray-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusBadge = (status: Integration["status"]) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-green-500">Connected</Badge>
      case "disconnected":
        return <Badge variant="secondary">Disconnected</Badge>
      case "error":
        return <Badge className="bg-red-500">Error</Badge>
    }
  }

  const toggleIntegration = (id: string) => {
    setIntegrations(
      integrations.map((integration) =>
        integration.id === id ? { ...integration, enabled: !integration.enabled } : integration,
      ),
    )
  }

  const updateApiKey = (id: string, apiKey: string) => {
    setIntegrations(
      integrations.map((integration) => (integration.id === id ? { ...integration, apiKey } : integration)),
    )
  }

  // Force refresh all YouTube campaign data
  const handleForceRefreshYouTube = async () => {
    setYoutubeRefreshing(true)
    setYoutubeError(undefined)
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.artistinfluence.com'
      
      const response = await fetch(`${apiUrl}/api/youtube-data-api/collect-all-daily-stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeOfDay: 'manual' })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      
      setYoutubeLastSync(new Date())
      setYoutubeStatus("connected")
      
      toast({
        title: "YouTube Data Refreshed",
        description: `Updated ${result.collected || 0} campaigns with fresh YouTube data.`,
      })
    } catch (err: any) {
      console.error('Failed to refresh YouTube data:', err)
      setYoutubeStatus("error")
      setYoutubeError(err.message || "Failed to refresh")
      
      toast({
        title: "Refresh Failed",
        description: err.message || "Failed to refresh YouTube data",
        variant: "destructive"
      })
    } finally {
      setYoutubeRefreshing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Plug className="h-5 w-5" />
          <span>Platform Integrations</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* YouTube Integration - Special handling with Force Refresh */}
        <div className="border border-border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getStatusIcon(youtubeStatus)}
              <div>
                <h3 className="font-medium">YouTube</h3>
                <p className="text-sm text-muted-foreground">
                  Last sync: {formatRelativeTime(youtubeLastSync)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {getStatusBadge(youtubeStatus)}
            </div>
          </div>

          {youtubeError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3">
              <p className="text-sm text-red-400">{youtubeError}</p>
            </div>
          )}

          <div className="bg-muted/50 rounded-md p-3">
            <p className="text-sm text-muted-foreground mb-2">
              YouTube data is collected automatically 3x daily (8 AM, 2 PM, 8 PM UTC).
              Use the button below to force a manual refresh of all campaign data.
            </p>
            <Button 
              onClick={handleForceRefreshYouTube}
              disabled={youtubeRefreshing}
              className="w-full"
            >
              {youtubeRefreshing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing All Campaigns...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Force Refresh All YouTube Data
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Other Integrations */}
        {integrations.map((integration) => (
          <div key={integration.id} className="border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(integration.status)}
                <div>
                  <h3 className="font-medium">{integration.name}</h3>
                  <p className="text-sm text-muted-foreground">Last sync: {integration.lastSync}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {getStatusBadge(integration.status)}
                <Switch checked={integration.enabled} onCheckedChange={() => toggleIntegration(integration.id)} />
              </div>
            </div>

            {integration.errorMessage && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3">
                <p className="text-sm text-red-400">{integration.errorMessage}</p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`${integration.id}-key`} className="flex items-center space-x-2">
                  <Key className="h-4 w-4" />
                  <span>API Key</span>
                </Label>
                <Input
                  id={`${integration.id}-key`}
                  type="password"
                  value={integration.apiKey}
                  onChange={(e) => updateApiKey(integration.id, e.target.value)}
                  placeholder="Enter API key"
                />
              </div>
              <div className="flex items-end">
                <Button className="w-full">Test Connection</Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
