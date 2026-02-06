"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Settings, Save, RefreshCw, Loader2, CheckCircle, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface SystemSettingsData {
  id?: string
  enable_notifications: boolean
  enable_analytics: boolean
  maintenance_mode: boolean
  maintenance_message: string
  session_timeout_hours: number
  ops_notification_emails: string[]
}

const DEFAULT_SETTINGS: SystemSettingsData = {
  enable_notifications: true,
  enable_analytics: true,
  maintenance_mode: false,
  maintenance_message: "System is under maintenance. Please try again later.",
  session_timeout_hours: 24,
  ops_notification_emails: [],
}

export function SystemSettings() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<SystemSettingsData>(DEFAULT_SETTINGS)
  const [originalSettings, setOriginalSettings] = useState<SystemSettingsData>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [emailInput, setEmailInput] = useState("")

  // Load settings from database
  useEffect(() => {
    loadSettings()
  }, [])

  // Track changes
  useEffect(() => {
    setHasChanges(JSON.stringify(settings) !== JSON.stringify(originalSettings))
  }, [settings, originalSettings])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        const loaded: SystemSettingsData = {
          id: data.id,
          enable_notifications: data.enable_notifications ?? true,
          enable_analytics: data.enable_analytics ?? true,
          maintenance_mode: data.maintenance_mode ?? false,
          maintenance_message: data.maintenance_message || DEFAULT_SETTINGS.maintenance_message,
          session_timeout_hours: data.session_timeout_hours ?? 24,
          ops_notification_emails: data.ops_notification_emails || [],
        }
        setSettings(loaded)
        setOriginalSettings(loaded)
      }
    } catch (err: any) {
      console.error('Failed to load system settings:', err)
      toast({ title: "Error", description: "Failed to load settings", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const payload = {
        enable_notifications: settings.enable_notifications,
        enable_analytics: settings.enable_analytics,
        maintenance_mode: settings.maintenance_mode,
        maintenance_message: settings.maintenance_message,
        session_timeout_hours: settings.session_timeout_hours,
        ops_notification_emails: settings.ops_notification_emails,
        updated_at: new Date().toISOString(),
      }

      if (settings.id) {
        const { error } = await supabase
          .from('system_settings')
          .update(payload)
          .eq('id', settings.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('system_settings')
          .insert({
            ...payload,
            org_id: '00000000-0000-0000-0000-000000000001',
          })

        if (error) throw error
      }

      setOriginalSettings({ ...settings })
      toast({ title: "Settings Saved", description: "System settings have been updated." })
    } catch (err: any) {
      console.error('Failed to save settings:', err)
      toast({ title: "Error", description: err.message || "Failed to save settings", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setSettings({ ...originalSettings })
  }

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase()
    if (!email) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address", variant: "destructive" })
      return
    }
    if (settings.ops_notification_emails.includes(email)) {
      toast({ title: "Duplicate", description: "This email is already in the list", variant: "destructive" })
      return
    }
    setSettings(prev => ({
      ...prev,
      ops_notification_emails: [...prev.ops_notification_emails, email],
    }))
    setEmailInput("")
  }

  const removeEmail = (email: string) => {
    setSettings(prev => ({
      ...prev,
      ops_notification_emails: prev.ops_notification_emails.filter(e => e !== email),
    }))
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>System Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading settings...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>System Settings</span>
          {hasChanges && (
            <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700 border-amber-300">
              Unsaved changes
            </Badge>
          )}
        </CardTitle>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left column */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                min={1}
                max={720}
                value={settings.session_timeout_hours}
                onChange={(e) => setSettings({ ...settings, session_timeout_hours: parseInt(e.target.value) || 24 })}
              />
              <p className="text-xs text-muted-foreground">
                How long user sessions last before requiring re-login
              </p>
            </div>

            {/* Ops notification emails */}
            <div className="space-y-2">
              <Label>Ops Notification Emails</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="ops@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
                />
                <Button variant="outline" onClick={addEmail} type="button">
                  Add
                </Button>
              </div>
              {settings.ops_notification_emails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {settings.ops_notification_emails.map(email => (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive/20"
                      onClick={() => removeEmail(email)}
                    >
                      {email} &times;
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                These addresses receive campaign status change notifications
              </p>
            </div>
          </div>

          {/* Right column - toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="notifications" className="font-medium">Enable Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Send email notifications for campaign events
                </p>
              </div>
              <Switch
                id="notifications"
                checked={settings.enable_notifications}
                onCheckedChange={(checked) => setSettings({ ...settings, enable_notifications: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="analytics" className="font-medium">Enable Analytics</Label>
                <p className="text-xs text-muted-foreground">
                  Collect usage analytics and performance metrics
                </p>
              </div>
              <Switch
                id="analytics"
                checked={settings.enable_analytics}
                onCheckedChange={(checked) => setSettings({ ...settings, enable_analytics: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="maintenance" className="font-medium">Maintenance Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Show maintenance message to all non-admin users
                </p>
              </div>
              <Switch
                id="maintenance"
                checked={settings.maintenance_mode}
                onCheckedChange={(checked) => setSettings({ ...settings, maintenance_mode: checked })}
              />
            </div>
          </div>
        </div>

        {/* Maintenance message (conditional) */}
        {settings.maintenance_mode && (
          <div className="space-y-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <Label htmlFor="maintenanceMessage" className="font-medium text-amber-800">
                Maintenance Message
              </Label>
            </div>
            <Textarea
              id="maintenanceMessage"
              value={settings.maintenance_message}
              onChange={(e) => setSettings({ ...settings, maintenance_message: e.target.value })}
              placeholder="Enter maintenance message for users"
              rows={3}
            />
            <p className="text-xs text-amber-700">
              This message will be displayed to all non-admin users while maintenance mode is active.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
