"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Settings, Save, RefreshCw } from "lucide-react"

interface SystemSettings {
  apiBaseUrl: string
  enableNotifications: boolean
  enableAnalytics: boolean
  maxUsersPerTenant: number
  sessionTimeout: number
  maintenanceMode: boolean
  maintenanceMessage: string
}

export function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    apiBaseUrl: "https://api.yourdomain.com",
    enableNotifications: true,
    enableAnalytics: true,
    maxUsersPerTenant: 50,
    sessionTimeout: 24,
    maintenanceMode: false,
    maintenanceMessage: "System is under maintenance. Please try again later.",
  })

  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSaving(false)
  }

  const handleReset = () => {
    setSettings({
      apiBaseUrl: "https://api.yourdomain.com",
      enableNotifications: true,
      enableAnalytics: true,
      maxUsersPerTenant: 50,
      sessionTimeout: 24,
      maintenanceMode: false,
      maintenanceMessage: "System is under maintenance. Please try again later.",
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>System Settings</span>
        </CardTitle>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiBaseUrl">API Base URL</Label>
              <Input
                id="apiBaseUrl"
                value={settings.apiBaseUrl}
                onChange={(e) => setSettings({ ...settings, apiBaseUrl: e.target.value })}
                placeholder="https://api.yourdomain.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxUsers">Max Users Per Tenant</Label>
              <Input
                id="maxUsers"
                type="number"
                value={settings.maxUsersPerTenant}
                onChange={(e) => setSettings({ ...settings, maxUsersPerTenant: Number.parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings({ ...settings, sessionTimeout: Number.parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications">Enable Notifications</Label>
              <Switch
                id="notifications"
                checked={settings.enableNotifications}
                onCheckedChange={(checked) => setSettings({ ...settings, enableNotifications: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="analytics">Enable Analytics</Label>
              <Switch
                id="analytics"
                checked={settings.enableAnalytics}
                onCheckedChange={(checked) => setSettings({ ...settings, enableAnalytics: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="maintenance">Maintenance Mode</Label>
              <Switch
                id="maintenance"
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
              />
            </div>
          </div>
        </div>

        {settings.maintenanceMode && (
          <div className="space-y-2">
            <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
            <Textarea
              id="maintenanceMessage"
              value={settings.maintenanceMessage}
              onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
              placeholder="Enter maintenance message for users"
              rows={3}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
