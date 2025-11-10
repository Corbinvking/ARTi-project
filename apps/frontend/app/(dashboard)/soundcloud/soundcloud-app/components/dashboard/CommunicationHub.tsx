"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '../../integrations/supabase/client'
import { useToast } from '../../hooks/use-toast'
import { 
  MessageSquare, Slack, Webhook, Settings, Plus, 
  Check, X, Activity, Send, AlertTriangle
} from 'lucide-react'

interface CommunicationIntegration {
  id: string
  platform: string
  name: string
  webhook_url: string
  channel?: string
  enabled: boolean
  notification_types: string[]
  created_at: string
}

interface WebhookConfig {
  id: string
  name: string
  url: string
  events: string[]
  enabled: boolean
  timeout_seconds: number
  retry_attempts: number
}

const NOTIFICATION_TYPES = [
  'submission_created',
  'submission_approved',
  'submission_rejected',
  'member_admitted',
  'queue_published',
  'scraping_completed',
  'scraping_failed',
  'system_alerts'
]

const WEBHOOK_EVENTS = [
  'member.created',
  'member.updated',
  'submission.created',
  'submission.status_changed',
  'queue.published',
  'integration.completed',
  'system.alert'
]

export const CommunicationHub = () => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [communications, setCommunications] = useState<CommunicationIntegration[]>([])
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([])
  const [isAddingIntegration, setIsAddingIntegration] = useState(false)
  const [isAddingWebhook, setIsAddingWebhook] = useState(false)

  const [newIntegration, setNewIntegration] = useState({
    platform: 'slack',
    name: '',
    webhook_url: '',
    channel: '',
    notification_types: [] as string[]
  })

  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [] as string[],
    timeout_seconds: 30,
    retry_attempts: 3
  })

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch communication integrations
      const { data: commData, error: commError } = await supabase
        .from('communication_integrations')
        .select('*')
        .order('created_at', { ascending: false })

      if (commError) throw commError

      // Fetch webhook configurations
      const { data: webhookData, error: webhookError } = await supabase
        .from('webhook_configs')
        .select('*')
        .order('created_at', { ascending: false })

      if (webhookError) throw webhookError

      setCommunications((commData || []).map(item => ({
        ...item,
        notification_types: Array.isArray(item.notification_types) 
          ? item.notification_types.filter((t): t is string => typeof t === 'string')
          : []
      })))
      setWebhooks((webhookData || []).map(item => ({
        ...item,
        events: Array.isArray(item.events) 
          ? item.events.filter((e): e is string => typeof e === 'string')
          : []
      })))

    } catch (error: any) {
      console.error('Error fetching communication data:', error)
      toast({
        title: "Error",
        description: "Failed to load communication settings",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddIntegration = async () => {
    if (!newIntegration.name || !newIntegration.webhook_url) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase
        .from('communication_integrations')
        .insert({
          platform: newIntegration.platform,
          name: newIntegration.name,
          webhook_url: newIntegration.webhook_url,
          channel: newIntegration.channel || null,
          notification_types: newIntegration.notification_types,
          enabled: true
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Integration added successfully",
      })

      setNewIntegration({
        platform: 'slack',
        name: '',
        webhook_url: '',
        channel: '',
        notification_types: []
      })
      setIsAddingIntegration(false)
      await fetchData()

    } catch (error: any) {
      console.error('Error adding integration:', error)
      toast({
        title: "Error",
        description: "Failed to add integration",
        variant: "destructive",
      })
    }
  }

  const handleAddWebhook = async () => {
    if (!newWebhook.name || !newWebhook.url) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase
        .from('webhook_configs')
        .insert({
          name: newWebhook.name,
          url: newWebhook.url,
          events: newWebhook.events,
          timeout_seconds: newWebhook.timeout_seconds,
          retry_attempts: newWebhook.retry_attempts,
          enabled: true
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Webhook configured successfully",
      })

      setNewWebhook({
        name: '',
        url: '',
        events: [],
        timeout_seconds: 30,
        retry_attempts: 3
      })
      setIsAddingWebhook(false)
      await fetchData()

    } catch (error: any) {
      console.error('Error adding webhook:', error)
      toast({
        title: "Error",
        description: "Failed to configure webhook",
        variant: "destructive",
      })
    }
  }

  const toggleIntegration = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('communication_integrations')
        .update({ enabled })
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: `Integration ${enabled ? 'enabled' : 'disabled'}`,
      })

      await fetchData()

    } catch (error: any) {
      console.error('Error toggling integration:', error)
      toast({
        title: "Error",
        description: "Failed to update integration",
        variant: "destructive",
      })
    }
  }

  const toggleWebhook = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('webhook_configs')
        .update({ enabled })
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: `Webhook ${enabled ? 'enabled' : 'disabled'}`,
      })

      await fetchData()

    } catch (error: any) {
      console.error('Error toggling webhook:', error)
      toast({
        title: "Error",
        description: "Failed to update webhook",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return <Skeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Communication Hub</h1>
          <p className="text-muted-foreground">
            Manage Slack, Discord, and webhook integrations for automated notifications
          </p>
        </div>
      </div>

      <Tabs defaultValue="integrations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="integrations">Chat Integrations</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Chat Integrations
                  </CardTitle>
                  <CardDescription>
                    Connect Slack and Discord for automated notifications
                  </CardDescription>
                </div>
                <Dialog open={isAddingIntegration} onOpenChange={setIsAddingIntegration}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Integration
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Communication Integration</DialogTitle>
                      <DialogDescription>
                        Configure a new Slack or Discord integration
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="platform">Platform</Label>
                        <Select value={newIntegration.platform} onValueChange={(value) => 
                          setNewIntegration(prev => ({ ...prev, platform: value }))
                        }>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="slack">Slack</SelectItem>
                            <SelectItem value="discord">Discord</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="name">Integration Name</Label>
                        <Input
                          id="name"
                          value={newIntegration.name}
                          onChange={(e) => setNewIntegration(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Main Slack Workspace"
                        />
                      </div>
                      <div>
                        <Label htmlFor="webhook_url">Webhook URL</Label>
                        <Input
                          id="webhook_url"
                          value={newIntegration.webhook_url}
                          onChange={(e) => setNewIntegration(prev => ({ ...prev, webhook_url: e.target.value }))}
                          placeholder="https://hooks.slack.com/services/..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="channel">Channel (optional)</Label>
                        <Input
                          id="channel"
                          value={newIntegration.channel}
                          onChange={(e) => setNewIntegration(prev => ({ ...prev, channel: e.target.value }))}
                          placeholder="#notifications"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsAddingIntegration(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddIntegration}>
                          Add Integration
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {communications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No chat integrations configured</p>
                    <p className="text-sm">Add your first integration to receive notifications</p>
                  </div>
                ) : (
                  communications.map((integration) => (
                    <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {integration.platform === 'slack' ? (
                          <Slack className="h-5 w-5" />
                        ) : (
                          <MessageSquare className="h-5 w-5" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{integration.name}</span>
                            <Badge variant="outline">{integration.platform}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {integration.channel || 'Default channel'} • {integration.notification_types.length} notification types
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={integration.enabled}
                          onCheckedChange={(enabled) => toggleIntegration(integration.id, enabled)}
                        />
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="h-5 w-5" />
                    Webhook Configurations
                  </CardTitle>
                  <CardDescription>
                    Configure custom webhooks for external integrations
                  </CardDescription>
                </div>
                <Dialog open={isAddingWebhook} onOpenChange={setIsAddingWebhook}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Webhook
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Webhook</DialogTitle>
                      <DialogDescription>
                        Configure a new webhook endpoint for external integrations
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="webhook_name">Webhook Name</Label>
                        <Input
                          id="webhook_name"
                          value={newWebhook.name}
                          onChange={(e) => setNewWebhook(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., External API Integration"
                        />
                      </div>
                      <div>
                        <Label htmlFor="webhook_url">Webhook URL</Label>
                        <Input
                          id="webhook_url"
                          value={newWebhook.url}
                          onChange={(e) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                          placeholder="https://your-api.com/webhook"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="timeout">Timeout (seconds)</Label>
                          <Input
                            id="timeout"
                            type="number"
                            value={newWebhook.timeout_seconds}
                            onChange={(e) => setNewWebhook(prev => ({ ...prev, timeout_seconds: parseInt(e.target.value) || 30 }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="retries">Retry Attempts</Label>
                          <Input
                            id="retries"
                            type="number"
                            value={newWebhook.retry_attempts}
                            onChange={(e) => setNewWebhook(prev => ({ ...prev, retry_attempts: parseInt(e.target.value) || 3 }))}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsAddingWebhook(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddWebhook}>
                          Add Webhook
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {webhooks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No webhooks configured</p>
                    <p className="text-sm">Add webhook endpoints for external integrations</p>
                  </div>
                ) : (
                  webhooks.map((webhook) => (
                    <div key={webhook.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Webhook className="h-5 w-5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{webhook.name}</span>
                            <Badge variant="outline">{webhook.events.length} events</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate max-w-md">
                            {webhook.url}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={webhook.enabled}
                          onCheckedChange={(enabled) => toggleWebhook(webhook.id, enabled)}
                        />
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}