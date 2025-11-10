import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { RefreshCw, TrendingUp, Target, DollarSign, Play, Heart, Repeat, MessageCircle } from 'lucide-react'
import { useCampaignAttribution } from '../../hooks/useCampaignAttribution'
import { Skeleton } from '@/components/ui/skeleton'

export const CampaignAttributionAnalytics: React.FC = () => {
  const { campaigns, loading, captureBaseline, syncCampaignMetrics, refetch } = useCampaignAttribution()

  if (loading && campaigns.length === 0) {
    return <Skeleton />
  }

  const activeCampaigns = campaigns.filter(c => c.status === 'active')
  const completedCampaigns = campaigns.filter(c => c.status === 'completed' || c.status === 'ended')

  // Calculate summary metrics
  const totalRevenue = campaigns.reduce((sum, c) => sum + (c.price_usd || 0), 0)
  const totalPlaysGained = campaigns.reduce((sum, c) => sum + c.plays_gained, 0)
  const totalRepostsGained = campaigns.reduce((sum, c) => sum + c.reposts_gained, 0)
  const avgCostPerRepost = totalRevenue > 0 && totalRepostsGained > 0 ? totalRevenue / totalRepostsGained : 0

  // Prepare chart data for active campaigns
  const performanceData = activeCampaigns.map(campaign => ({
    name: `${campaign.artist_name} - ${campaign.track_name}`.substring(0, 20) + '...',
    plays_gained: campaign.plays_gained,
    reposts_gained: campaign.reposts_gained,
    goal_progress: campaign.repost_goal_progress_pct || 0
  }))

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'completed': return 'bg-blue-500'
      case 'paused': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatNumber = (num: number | null) => {
    if (!num) return '0'
    return num.toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Campaign Attribution Analytics</h2>
          <p className="text-muted-foreground">
            Track SoundCloud engagement metrics for paid campaigns
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => syncCampaignMetrics()} 
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync All Metrics
          </Button>
          <Button onClick={refetch} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCampaigns.length}</div>
            <p className="text-xs text-muted-foreground">
              +{campaigns.length - activeCampaigns.length} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Across all campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Plays Gained</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalPlaysGained)}</div>
            <p className="text-xs text-muted-foreground">
              From campaign attribution
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost/Repost</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgCostPerRepost)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(totalRepostsGained)} reposts gained
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="campaigns">All Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
                <CardDescription>Plays vs Reposts gained by active campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                {performanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="plays_gained" fill="hsl(var(--primary))" name="Plays Gained" />
                      <Bar dataKey="reposts_gained" fill="hsl(var(--secondary))" name="Reposts Gained" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    No active campaigns with metrics
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Goal Progress</CardTitle>
                <CardDescription>Repost goal achievement for active campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeCampaigns.slice(0, 5).map((campaign) => (
                    <div key={campaign.campaign_id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {campaign.artist_name} - {campaign.track_name}
                        </span>
                        <span className="text-muted-foreground">
                          {campaign.reposts_gained}/{campaign.goal_reposts || 0}
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(campaign.repost_goal_progress_pct || 0, 100)} 
                        className="h-2"
                      />
                    </div>
                  ))}
                  {activeCampaigns.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No active campaigns to track
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ROI Analysis</CardTitle>
              <CardDescription>Cost efficiency metrics for all campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {campaigns.filter(c => c.cost_per_repost).slice(0, 9).map((campaign) => (
                  <Card key={campaign.campaign_id}>
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="font-medium text-sm">
                          {campaign.artist_name} - {campaign.track_name}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-xs text-muted-foreground">Cost/Repost</div>
                            <div className="font-medium">{formatCurrency(campaign.cost_per_repost)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Cost/Play</div>
                            <div className="font-medium">{formatCurrency(campaign.cost_per_play)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className={getStatusColor(campaign.status)}>
                            {campaign.status}
                          </Badge>
                          <span>{campaign.days_tracked || 0} days tracked</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Campaigns</CardTitle>
              <CardDescription>Detailed view of all campaign attribution data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <Card key={campaign.campaign_id} className="border-l-4 border-l-primary/50">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold">{campaign.artist_name} - {campaign.track_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Started: {new Date(campaign.start_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={getStatusColor(campaign.status)}>
                            {campaign.status}
                          </Badge>
                          {campaign.status === 'active' && !campaign.baseline_plays && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => captureBaseline(campaign.campaign_id)}
                            >
                              Capture Baseline
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Play className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{formatNumber(campaign.plays_gained)}</div>
                            <div className="text-xs text-muted-foreground">Plays Gained</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Heart className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{formatNumber(campaign.likes_gained)}</div>
                            <div className="text-xs text-muted-foreground">Likes Gained</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Repeat className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{formatNumber(campaign.reposts_gained)}</div>
                            <div className="text-xs text-muted-foreground">Reposts Gained</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{formatNumber(campaign.comments_gained)}</div>
                            <div className="text-xs text-muted-foreground">Comments Gained</div>
                          </div>
                        </div>
                      </div>

                      {campaign.goal_reposts && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span>Goal Progress</span>
                            <span>{campaign.repost_goal_progress_pct || 0}%</span>
                          </div>
                          <Progress value={Math.min(campaign.repost_goal_progress_pct || 0, 100)} />
                        </div>
                      )}

                      {campaign.cost_per_repost && (
                        <div className="mt-4 flex gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Cost per Repost: </span>
                            <span className="font-medium">{formatCurrency(campaign.cost_per_repost)}</span>
                          </div>
                          {campaign.cost_per_play && (
                            <div>
                              <span className="text-muted-foreground">Cost per Play: </span>
                              <span className="font-medium">{formatCurrency(campaign.cost_per_play)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                
                {campaigns.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No campaigns found. Create your first campaign to start tracking attribution.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}