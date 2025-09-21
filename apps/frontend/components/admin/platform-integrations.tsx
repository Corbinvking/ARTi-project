"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Plug, Key, CheckCircle, XCircle, AlertCircle } from "lucide-react"

interface Integration {
  id: string
  name: string
  status: "connected" | "disconnected" | "error"
  enabled: boolean
  apiKey: string
  lastSync: string
  errorMessage?: string
}

export function PlatformIntegrations() {
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
      id: "youtube",
      name: "YouTube",
      status: "error",
      enabled: false,
      apiKey: "yt_****",
      lastSync: "2 days ago",
      errorMessage: "API quota exceeded",
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Plug className="h-5 w-5" />
          <span>Platform Integrations</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
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
