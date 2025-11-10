"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, Download, RefreshCw, TrendingUp, TrendingDown, 
  ExternalLink, Clock, DollarSign, Target, Users 
} from 'lucide-react';
import { useWeeklyCampaignReports } from '../../hooks/useWeeklyCampaignReports';
import { AnalyticsHeader } from '@/components/ui/analytics-header';
import { Progress } from '@/components/ui/progress';
import { useToast } from '../../hooks/use-toast';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';

export const WeeklyCampaignReports: React.FC = () => {
  const { toast } = useToast();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());
  
  const {
    campaigns,
    weeklyOverview,
    campaignWeeklyReport,
    loading,
    fetchCampaignWeeklyReport,
    exportWeeklyReport,
    refetch
  } = useWeeklyCampaignReports();

  const handleCampaignSelect = async (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    if (campaignId) {
      await fetchCampaignWeeklyReport(campaignId, selectedWeek);
    }
  };

  const handleWeekChange = (direction: 'prev' | 'next') => {
    const newWeek = direction === 'prev' 
      ? subWeeks(selectedWeek, 1) 
      : addWeeks(selectedWeek, 1);
    setSelectedWeek(newWeek);
    
    if (selectedCampaignId) {
      fetchCampaignWeeklyReport(selectedCampaignId, newWeek);
    }
  };

  const handleExport = async () => {
    if (!selectedCampaignId) {
      toast({
        title: "No Campaign Selected",
        description: "Please select a campaign to export its weekly report",
        variant: "destructive"
      });
      return;
    }

    try {
      await exportWeeklyReport(selectedCampaignId, selectedWeek);
      toast({
        title: "Report Exported",
        description: "Weekly campaign report has been exported successfully"
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export weekly report",
        variant: "destructive"
      });
    }
  };

  const formatWeekRange = (date: Date) => {
    const start = startOfWeek(date);
    const end = endOfWeek(date);
    return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`;
  };

  const getChangeIndicator = (value: number) => {
    if (value > 0) {
      return <TrendingUp className="h-4 w-4 text-success" />;
    } else if (value < 0) {
      return <TrendingDown className="h-4 w-4 text-destructive" />;
    }
    return null;
  };

  const getChangeColor = (value: number) => {
    if (value > 0) return 'text-success';
    if (value < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      <AnalyticsHeader
        title="Weekly Campaign Reports"
        description="SoundCloud campaign performance with receipt links and week-over-week streaming changes"
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={handleExport} disabled={!selectedCampaignId}>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button variant="outline" onClick={refetch}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Campaign & Week Selection */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Card className="flex-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-muted-foreground">Select Campaign</label>
                <Select value={selectedCampaignId} onValueChange={handleCampaignSelect}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose a campaign..." />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        <div className="flex items-center gap-2">
                          <span>{campaign.artist_name} - {campaign.track_name}</span>
                          <Badge variant={campaign.status === 'live' ? 'default' : 'secondary'}>
                            {campaign.status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Week Range</label>
                <div className="flex items-center gap-2 mt-1">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleWeekChange('prev')}
                  >
                    ←
                  </Button>
                  <span className="text-sm font-medium">
                    {formatWeekRange(selectedWeek)}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleWeekChange('next')}
                    disabled={selectedWeek >= new Date()}
                  >
                    →
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Campaigns
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {(weeklyOverview?.activeCampaigns || 0).toLocaleString()}
                  {weeklyOverview?.activeCampaignsChange && (
                    <div className={`flex items-center gap-1 text-sm ${getChangeColor(weeklyOverview.activeCampaignsChange)}`}>
                      {getChangeIndicator(weeklyOverview.activeCampaignsChange)}
                      <span>{Math.abs(weeklyOverview.activeCampaignsChange)}</span>
                    </div>
                  )}
                </div>
              </div>
              <Target className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Weekly Revenue
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-2xl font-bold">
                    ${(weeklyOverview?.weeklyRevenue || 0).toLocaleString()}
                  </span>
                  {weeklyOverview?.revenueChange && (
                    <div className={`flex items-center gap-1 text-sm ${getChangeColor(weeklyOverview.revenueChange)}`}>
                      {getChangeIndicator(weeklyOverview.revenueChange)}
                      <span>{Math.abs(weeklyOverview.revenueChangePercent || 0).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </div>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Avg Weekly ROI
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-2xl font-bold">
                    {(weeklyOverview?.averageROI || 0).toFixed(1)}%
                  </span>
                  {weeklyOverview?.roiChange && (
                    <div className={`flex items-center gap-1 text-sm ${getChangeColor(weeklyOverview.roiChange)}`}>
                      {getChangeIndicator(weeklyOverview.roiChange)}
                      <span>{Math.abs(weeklyOverview.roiChange).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </div>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Campaigns Needing Attention
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {(weeklyOverview?.campaignsNeedingAttention || 0).toLocaleString()}
                </div>
              </div>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Individual Campaign Report */}
      {selectedCampaignId && campaignWeeklyReport && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">
              {campaignWeeklyReport.campaign.artist_name} - {campaignWeeklyReport.campaign.track_name}
            </h2>
            <Badge variant={campaignWeeklyReport.campaign.status === 'live' ? 'default' : 'secondary'}>
              {campaignWeeklyReport.campaign.status}
            </Badge>
          </div>

          {/* Campaign Details */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
              <CardDescription>Week of {formatWeekRange(selectedWeek)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Goal Reposts</p>
                  <p className="text-lg font-semibold">{campaignWeeklyReport.campaign.goal_reposts}</p>
                  {campaignWeeklyReport.campaign.goal_reposts && campaignWeeklyReport.streamingMetrics?.currentWeek.reposts && (
                    <Progress 
                      value={(campaignWeeklyReport.streamingMetrics.currentWeek.reposts / campaignWeeklyReport.campaign.goal_reposts) * 100} 
                      className="mt-2"
                    />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Budget</p>
                  <p className="text-lg font-semibold">${campaignWeeklyReport.campaign.price_usd}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Track URL</p>
                  <a 
                    href={campaignWeeklyReport.campaign.track_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    View Track <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Influence Planner Receipt Links */}
          {campaignWeeklyReport.influenceReceipts && campaignWeeklyReport.influenceReceipts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Influence Planner Receipt Links</CardTitle>
                <CardDescription>Supporter activity and proof links for this week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {campaignWeeklyReport.influenceReceipts.map((receipt, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{receipt.supporterName}</p>
                          <p className="text-sm text-muted-foreground">@{receipt.supporterHandle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(receipt.scheduledDate), 'MMM dd, yyyy')}
                          </p>
                          <p className="text-sm font-medium">{receipt.creditsAllocated} credits</p>
                        </div>
                        <Badge variant={
                          receipt.status === 'completed' ? 'default' : 
                          receipt.status === 'pending' ? 'secondary' : 'destructive'
                        }>
                          {receipt.status}
                        </Badge>
                        {receipt.proofUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={receipt.proofUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Receipt
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Week-over-Week Streaming Changes */}
          {campaignWeeklyReport.streamingMetrics && (
            <Card>
              <CardHeader>
                <CardTitle>Week-over-Week Streaming Changes</CardTitle>
                <CardDescription>Performance metrics comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { 
                      label: 'Plays', 
                      current: campaignWeeklyReport.streamingMetrics.currentWeek.plays,
                      previous: campaignWeeklyReport.streamingMetrics.previousWeek.plays,
                      change: campaignWeeklyReport.streamingMetrics.changes.plays
                    },
                    { 
                      label: 'Likes', 
                      current: campaignWeeklyReport.streamingMetrics.currentWeek.likes,
                      previous: campaignWeeklyReport.streamingMetrics.previousWeek.likes,
                      change: campaignWeeklyReport.streamingMetrics.changes.likes
                    },
                    { 
                      label: 'Reposts', 
                      current: campaignWeeklyReport.streamingMetrics.currentWeek.reposts,
                      previous: campaignWeeklyReport.streamingMetrics.previousWeek.reposts,
                      change: campaignWeeklyReport.streamingMetrics.changes.reposts
                    },
                    { 
                      label: 'Comments', 
                      current: campaignWeeklyReport.streamingMetrics.currentWeek.comments,
                      previous: campaignWeeklyReport.streamingMetrics.previousWeek.comments,
                      change: campaignWeeklyReport.streamingMetrics.changes.comments
                    }
                  ].map((metric) => (
                    <div key={metric.label} className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                      <div className="mt-2">
                        {(metric.current || 0).toLocaleString()}
                        <div className="flex items-center justify-center gap-1 mt-1">
                          {getChangeIndicator(metric.change?.absolute || 0)}
                          <span className={`text-sm ${getChangeColor(metric.change?.absolute || 0)}`}>
                            {metric.change?.absolute ? (
                              <>
                                {metric.change.absolute > 0 ? '+' : ''}{metric.change.absolute}
                                {metric.change.percentage && (
                                  <span className="ml-1">({metric.change.percentage.toFixed(1)}%)</span>
                                )}
                              </>
                            ) : (
                              'No change'
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty State */}
      {campaigns.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Campaigns Found</h3>
            <p className="text-muted-foreground mb-4">
              Create your first SoundCloud campaign to start generating weekly reports with receipt links and streaming analytics.
            </p>
            <Button variant="outline">
              Create Campaign
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedCampaignId && !campaignWeeklyReport && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Data for Selected Week</h3>
            <p className="text-muted-foreground">
              No activity or attribution data found for the selected campaign during this week.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};