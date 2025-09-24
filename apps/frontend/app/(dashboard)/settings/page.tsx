"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/hooks/use-auth"
import { useState } from "react"
import { toast } from "sonner"
import { Settings, Bell, Shield, Palette, Globe } from "lucide-react"

export default function SettingsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    marketing: false
  })
  const [preferences, setPreferences] = useState({
    theme: 'dark',
    language: 'en',
    timezone: 'UTC'
  })

  const handleSaveNotifications = () => {
    // TODO: Implement notification settings save
    toast.success("Notification settings saved")
  }

  const handleSavePreferences = () => {
    // TODO: Implement preferences save
    toast.success("Preferences saved")
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center space-x-2">
          <Settings className="h-8 w-8" />
          <span>Settings</span>
        </h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-6">
        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Account Information</span>
            </CardTitle>
            <CardDescription>
              View and manage your account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  value={user.name || ''} 
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  value={user.email} 
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input 
                id="role" 
                value={user.role} 
                readOnly
                className="bg-muted capitalize"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Contact your administrator to update account information
            </p>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
            </CardTitle>
            <CardDescription>
              Configure how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={notifications.email}
                onCheckedChange={(checked) => 
                  setNotifications(prev => ({ ...prev, email: checked }))
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-notifications">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications in your browser
                </p>
              </div>
              <Switch
                id="push-notifications"
                checked={notifications.push}
                onCheckedChange={(checked) => 
                  setNotifications(prev => ({ ...prev, push: checked }))
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="marketing-notifications">Marketing Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Receive updates about new features and promotions
                </p>
              </div>
              <Switch
                id="marketing-notifications"
                checked={notifications.marketing}
                onCheckedChange={(checked) => 
                  setNotifications(prev => ({ ...prev, marketing: checked }))
                }
              />
            </div>
            <div className="pt-4">
              <Button onClick={handleSaveNotifications}>
                Save Notification Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Palette className="h-5 w-5" />
              <span>Preferences</span>
            </CardTitle>
            <CardDescription>
              Customize your application experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Input 
                  id="theme" 
                  value="Dark Mode" 
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Input 
                  id="language" 
                  value="English" 
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input 
                id="timezone" 
                value="UTC (Coordinated Universal Time)" 
                readOnly
                className="bg-muted"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Theme and localization settings coming soon
            </p>
          </CardContent>
        </Card>

        {/* Platform Access */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>Platform Access</span>
            </CardTitle>
            <CardDescription>
              View your current platform permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user.permissions && user.permissions.length > 0 ? (
                user.permissions.map((permission) => (
                  <div key={permission.platform} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        {permission.platform === 'dashboard' && '📊'}
                        {permission.platform === 'instagram' && '📸'}
                        {permission.platform === 'spotify' && '🎵'}
                        {permission.platform === 'soundcloud' && '🎧'}
                        {permission.platform === 'youtube' && '📺'}
                      </div>
                      <div>
                        <p className="font-medium capitalize">{permission.platform}</p>
                        <p className="text-sm text-muted-foreground">
                          {permission.can_read && 'View'} 
                          {permission.can_write && permission.can_read && ', Edit'}
                          {permission.can_delete && (permission.can_read || permission.can_write) && ', Delete'}
                          {!permission.can_read && !permission.can_write && !permission.can_delete && 'No Access'}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {permission.can_read && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Read
                        </span>
                      )}
                      {permission.can_write && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Write
                        </span>
                      )}
                      {permission.can_delete && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                          Delete
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">Loading permissions...</p>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Contact your administrator to modify platform access
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
