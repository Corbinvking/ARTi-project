import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Target, 
  TrendingUp, 
  Calendar,
  CheckCircle2,
  AlertCircle,
  Info,
  Users,
  Timer,
  BarChart3,
  Activity
} from "lucide-react";
import { Creator, Campaign } from "../lib/types";
import { useCampaignManagementMetrics } from "../hooks/useCampaignManagementMetrics";

interface CampaignManagementDashboardProps {
  creators: Creator[];
  campaigns: Campaign[];
}

export const CampaignManagementDashboard = ({ creators, campaigns }: CampaignManagementDashboardProps) => {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const { 
    creatorTierScores, 
    assessCampaignReadiness, 
    assessExecutionHealth, 
    assessPortfolioBalance, 
    assessTimelineStatus 
  } = useCampaignManagementMetrics(creators, campaigns);
  
  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);
  const readiness = selectedCampaign ? assessCampaignReadiness(selectedCampaign) : null;
  const executionHealth = assessExecutionHealth(campaigns);
  const portfolioBalance = selectedCampaign ? assessPortfolioBalance(selectedCampaign.selected_creators || []) : null;
  const timelineStatus = selectedCampaign ? assessTimelineStatus(selectedCampaign) : null;

  const getReadinessColor = (level: string) => {
    switch (level) {
      case 'ready': return 'text-success';
      case 'needs-work': return 'text-warning';
      default: return 'text-destructive';
    }
  };

  const getReadinessBadgeVariant = (level: string) => {
    switch (level) {
      case 'ready': return 'default';
      case 'needs-work': return 'secondary';
      default: return 'destructive';
    }
  };

  const getHealthColor = (level: string) => {
    switch (level) {
      case 'healthy': return 'text-success';
      case 'attention-needed': return 'text-warning';
      default: return 'text-destructive';
    }
  };

  // Temporarily removed tooltips to fix infinite loop - TODO: Add back with different library
  const InfoTooltip = ({ content }: { content: string }) => (
    <Info className="h-4 w-4 text-muted-foreground" title={content} />
  );

  return (
    <div className="space-y-6">
      {/* Campaign Selection */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Campaign Management Dashboard
          </CardTitle>
          <CardDescription>
            Practical campaign planning and execution metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a campaign to analyze" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map(campaign => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  <div className="flex items-center gap-2">
                    <span>{campaign.campaign_name}</span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {campaign.status}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Campaign Readiness */}
        {readiness && (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-muted-foreground">Campaign Readiness</p>
                      <InfoTooltip content="Based on creator selection completeness (40%), budget allocation adequacy (30%), and approval status (30%). Measures how ready your campaign is to launch successfully." />
                    </div>
                    <p className={`text-2xl font-bold ${getReadinessColor(readiness.readinessLevel)}`}>
                      {readiness.overallScore}%
                    </p>
                    <Badge variant={getReadinessBadgeVariant(readiness.readinessLevel)} className="text-xs capitalize">
                      {readiness.readinessLevel.replace('-', ' ')}
                    </Badge>
                  </div>
                </div>
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <Progress value={readiness.overallScore} className="mt-2" />
            </CardContent>
          </Card>
        )}

        {/* Execution Health */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-muted-foreground">Execution Health</p>
                  <InfoTooltip content="Tracks operational issues: approval bottlenecks, overdue payments, and missing posts. Helps identify execution problems before they impact campaigns." />
                </div>
                <p className={`text-2xl font-bold ${getHealthColor(executionHealth.healthLevel)}`}>
                  {executionHealth.overallScore}%
                </p>
                <Badge variant={executionHealth.healthLevel === 'healthy' ? 'default' : 
                              executionHealth.healthLevel === 'attention-needed' ? 'secondary' : 'destructive'} 
                       className="text-xs capitalize">
                  {executionHealth.healthLevel.replace('-', ' ')}
                </Badge>
              </div>
              <Activity className="h-8 w-8 text-success" />
            </div>
            <Progress value={executionHealth.overallScore} className="mt-2" />
          </CardContent>
        </Card>

        {/* Creator Portfolio Balance */}
        {portfolioBalance && (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-muted-foreground">Portfolio Balance</p>
                    <InfoTooltip content="Measures creator tier distribution and engagement rate spread. High-tier creators (40 points), medium-tier presence (30 points), and high-engagement creators (30 points)." />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{portfolioBalance.balanceScore}%</p>
                  <div className="flex gap-1 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {portfolioBalance.tierDistribution.high}H
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {portfolioBalance.tierDistribution.medium}M
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {portfolioBalance.tierDistribution.developing}D
                    </Badge>
                  </div>
                </div>
                <Users className="h-8 w-8 text-accent" />
              </div>
              <Progress value={portfolioBalance.balanceScore} className="mt-2" />
            </CardContent>
          </Card>
        )}

        {/* Timeline Status */}
        {timelineStatus && (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-muted-foreground">Timeline Status</p>
                    <InfoTooltip content="Tracks campaign phase and schedule adherence. Risk level increases with campaign age: Low (0-14 days), Medium (15-30 days), High (30+ days)." />
                  </div>
                  <p className="text-2xl font-bold text-foreground capitalize">
                    {timelineStatus.campaignPhase}
                  </p>
                  <Badge variant={timelineStatus.timelineRisk === 'low' ? 'default' : 
                                timelineStatus.timelineRisk === 'medium' ? 'secondary' : 'destructive'} 
                         className="text-xs capitalize">
                    {timelineStatus.timelineRisk} risk
                  </Badge>
                </div>
                <Timer className="h-8 w-8 text-warning" />
              </div>
              <Progress value={timelineStatus.scheduleAdherence} className="mt-2" />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed Analysis */}
      {selectedCampaign && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Campaign Readiness Details */}
          {readiness && (
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Readiness Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Creator Selection</span>
                    <span className="font-medium">{readiness.creatorSelectionScore}%</span>
                  </div>
                  <Progress value={readiness.creatorSelectionScore} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Budget Allocation</span>
                    <span className="font-medium">{readiness.budgetAllocationScore}%</span>
                  </div>
                  <Progress value={readiness.budgetAllocationScore} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Approval Status</span>
                    <span className="font-medium">{readiness.approvalStatusScore}%</span>
                  </div>
                  <Progress value={readiness.approvalStatusScore} className="h-2" />
                </div>

                {readiness.blockers.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-medium text-foreground">Blockers</h4>
                    {readiness.blockers.map((blocker, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 rounded bg-destructive/10 border border-destructive/20">
                        <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-foreground">{blocker}</span>
                      </div>
                    ))}
                  </div>
                )}

                {readiness.recommendations.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-medium text-foreground">Recommendations</h4>
                    {readiness.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 rounded bg-primary/10 border border-primary/20">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-foreground">{rec}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Execution Health Details */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-success" />
                Execution Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {executionHealth.alerts.length > 0 ? (
                  executionHealth.alerts.map((alert, index) => (
                    <div key={index} className={`flex items-start gap-3 p-3 rounded-lg border ${
                      alert.type === 'critical' ? 'bg-destructive/5 border-destructive/20' :
                      alert.type === 'warning' ? 'bg-warning/5 border-warning/20' :
                      'bg-info/5 border-info/20'
                    }`}>
                      <AlertCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                        alert.type === 'critical' ? 'text-destructive' :
                        alert.type === 'warning' ? 'text-warning' :
                        'text-info'
                      }`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground">{alert.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {alert.count}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/20">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-sm text-foreground">All systems running smoothly</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* No Campaign Selected State */}
      {!selectedCampaign && (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-8 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Select a Campaign</h3>
            <p className="text-muted-foreground">Choose a campaign above to view detailed management metrics and recommendations</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};