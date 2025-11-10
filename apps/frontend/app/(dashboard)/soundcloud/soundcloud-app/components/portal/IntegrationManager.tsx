"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useIntegrations } from '../../hooks/useIntegrations'
import { Music, Users, RefreshCw, Unlink, ExternalLink, AlertTriangle, BarChart3, Activity } from 'lucide-react'
import { format } from 'date-fns'

interface IntegrationManagerProps {
  memberId: string
}

export const IntegrationManager = ({ memberId }: IntegrationManagerProps) => {
  const { accounts, statuses, loading, connectSoundCloud, disconnectAccount, syncAccount } = useIntegrations(memberId)
  const [soundcloudUrl, setSoundcloudUrl] = useState('')
  const [connecting, setConnecting] = useState(false)

  const handleConnectSoundCloud = async () => {
    if (!soundcloudUrl.trim()) return
    
    setConnecting(true)
    const success = await connectSoundCloud(soundcloudUrl.trim())
    if (success) {
      setSoundcloudUrl('')
    }
    setConnecting(false)
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'linked': return 'default'
      case 'disconnected': return 'secondary'
      case 'error': return 'destructive'
      default: return 'secondary'
    }
  }

  const getStatusIcon = (platform: string) => {
    switch (platform) {
      case 'soundcloud': return <Music className="h-4 w-4" />
      default: return <Music className="h-4 w-4" />
    }
  }

  if (loading) {
    return <Skeleton />
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Platform Integrations</CardTitle>
          <CardDescription>
            Connect your social media accounts to enable influence planning and automated support
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* SoundCloud Connection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-orange-500" />
              <h3 className="font-medium">SoundCloud</h3>
            </div>
            
            <div className="flex gap-2">
              <Input
                placeholder="https://soundcloud.com/your-username"
                value={soundcloudUrl}
                onChange={(e) => setSoundcloudUrl(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleConnectSoundCloud}
                disabled={!soundcloudUrl.trim() || connecting}
              >
                {connecting ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Connect'}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Connected Accounts */}
          <div className="space-y-4">
            <h3 className="font-medium">Connected Accounts</h3>
            
            {accounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No accounts connected yet. Connect your SoundCloud account to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {accounts.map((account) => {
                  const status = statuses.find(s => s.account_handle === account.handle)
                  
                  return (
                    <Card key={account.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(account.platform)}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">@{account.handle}</span>
                              <Badge variant={getStatusBadgeVariant(account.status)}>
                                {account.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {account.follower_count.toLocaleString()} followers
                              </span>
                              {account.last_synced_at && (
                                <span>
                                  Last synced: {format(new Date(account.last_synced_at), 'MMM d, yyyy')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => syncAccount(account.id)}
                            title="Refresh account data"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/dashboard/track-analyzer`, '_self')}
                            title="Analyze tracks"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`https://soundcloud.com/${account.handle}`, '_blank')}
                            title="View on SoundCloud"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => disconnectAccount(account.id)}
                            title="Disconnect account"
                          >
                            <Unlink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Connection Data */}
                      {account.connection_data && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            {account.connection_data.tier && (
                              <div>
                                <span className="text-muted-foreground">Tier:</span>
                                <div className="font-medium">{account.connection_data.tier}</div>
                              </div>
                            )}
                            {account.connection_data.engagement_rate && (
                              <div>
                                <span className="text-muted-foreground">Engagement:</span>
                                <div className="font-medium">
                                  {(account.connection_data.engagement_rate * 100).toFixed(1)}%
                                </div>
                              </div>
                            )}
                            {account.connection_data.reach_factor && (
                              <div>
                                <span className="text-muted-foreground">Reach Factor:</span>
                                <div className="font-medium">
                                  {(account.connection_data.reach_factor * 100).toFixed(1)}%
                                </div>
                              </div>
                            )}
                            {account.connection_data.genres && (
                              <div>
                                <span className="text-muted-foreground">Genres:</span>
                                <div className="font-medium">
                                  {account.connection_data.genres.join(', ')}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Status Issues */}
                      {status?.error_count > 0 && (
                        <div className="mt-3 p-2 bg-destructive/10 rounded-md flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <span className="text-sm text-destructive">
                            {status.last_error_message || `${status.error_count} connection errors`}
                          </span>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}