"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Alert, AlertDescription } from "./ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  BarChart3,
  Users,
  ListMusic,
  Lightbulb,
  Target,
  Zap,
  Clock,
  Activity
} from "lucide-react";
import { useCampaignIntelligence } from "../hooks/useAdvancedLearning";
import { useProjectionAnalysis } from "../hooks/useMLPerformancePredictor";
import { useEarlyWarnings, useOptimizationSuggestions } from "../hooks/useMLDashboardData";
import { useState } from "react";
import type { AlgorithmicLiftData, TopPlaylist, VendorReliabilitySummary } from "../hooks/useAdvancedLearning";
import type { ProjectionRecord } from "../hooks/useMLPerformancePredictor";
import type { EarlyWarningCampaign, OptimizationSuggestion } from "../hooks/useMLDashboardData";

export function MLDashboard({ className }: { className?: string }) {
  const { data: intelligence, isLoading: intelLoading } = useCampaignIntelligence();
  const { data: projections, isLoading: projLoading } = useProjectionAnalysis();
  const { data: warnings } = useEarlyWarnings();
  const { data: suggestions } = useOptimizationSuggestions();

  const [activeTab, setActiveTab] = useState("overview");


  if (intelLoading || projLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 animate-pulse" />
            Loading Campaign Intelligence...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Campaign Intelligence
        </h2>
        <p className="text-muted-foreground">
          Cross-campaign patterns, playlist effectiveness, vendor reliability, and early intervention signals
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance Intelligence</TabsTrigger>
          <TabsTrigger value="suggestions" className="relative">
            Optimization Suggestions
            {suggestions && suggestions.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                {suggestions.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ==================== TAB 1: OVERVIEW ==================== */}
        <TabsContent value="overview" className="space-y-6">
          <OverviewTab
            algorithmicLift={intelligence?.algorithmicLift}
            topPlaylists={intelligence?.topPlaylists || []}
            vendorReliability={intelligence?.vendorReliability || []}
          />
        </TabsContent>

        {/* ==================== TAB 2: PERFORMANCE INTELLIGENCE ==================== */}
        <TabsContent value="performance" className="space-y-6">
          <PerformanceIntelligenceTab
            projections={projections}
            warnings={warnings || []}
          />
        </TabsContent>

        {/* ==================== TAB 3: OPTIMIZATION SUGGESTIONS ==================== */}
        <TabsContent value="suggestions" className="space-y-6">
          <OptimizationSuggestionsTab suggestions={suggestions || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TAB 1: Overview                                                    */
/* ------------------------------------------------------------------ */

function OverviewTab({
  algorithmicLift,
  topPlaylists,
  vendorReliability,
}: {
  algorithmicLift?: AlgorithmicLiftData;
  topPlaylists: TopPlaylist[];
  vendorReliability: VendorReliabilitySummary[];
}) {
  return (
    <>
      {/* A. Algorithmic Lift Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Algorithmic Lift Rate
            <Badge variant="outline" className="ml-2 text-xs font-normal">
              28-Day Window
            </Badge>
          </CardTitle>
          <CardDescription>
            Change in algorithmic streaming after playlist exposure, normalized against vendor playlist streams delivered
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Lift Rate</p>
              <p className="text-3xl font-bold">
                {algorithmicLift ? `${(algorithmicLift.liftRate * 100).toFixed(1)}%` : '—'}
              </p>
              <div className="flex items-center gap-1 text-sm">
                {algorithmicLift?.trend === 'up' && <ArrowUpRight className="h-4 w-4 text-emerald-500" />}
                {algorithmicLift?.trend === 'down' && <ArrowDownRight className="h-4 w-4 text-red-500" />}
                {algorithmicLift?.trend === 'flat' && <Minus className="h-4 w-4 text-muted-foreground" />}
                <span className={
                  algorithmicLift?.trend === 'up' ? 'text-emerald-500' :
                  algorithmicLift?.trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
                }>
                  {algorithmicLift?.trend === 'up' ? 'Trending up' :
                   algorithmicLift?.trend === 'down' ? 'Trending down' : 'Stable'}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Estimated Algorithmic Streams</p>
              <p className="text-2xl font-bold">{algorithmicLift?.liftStreams.toLocaleString() || '0'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Vendor Playlist Streams</p>
              <p className="text-2xl font-bold">{algorithmicLift?.baselineStreams.toLocaleString() || '0'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Campaigns Analyzed</p>
              <p className="text-2xl font-bold">{algorithmicLift?.campaignsAnalyzed || 0}</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              Algorithmic sources tracked: Radio, Discover Weekly, Release Radar, Your DJ, Mixes.
              Vendor playlist streams are excluded from lift calculation.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* B. Top Performing Playlists */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListMusic className="h-5 w-5 text-primary" />
            Top Performing Playlists
          </CardTitle>
          <CardDescription>
            Cross-campaign playlist ranking by streams delivered, algorithmic lift correlation, and campaign success rate
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topPlaylists.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No playlist performance data available yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">#</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Playlist</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Vendor</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground text-right">Avg Streams</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground text-right">Algo Lift</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground text-right">Success Rate</th>
                    <th className="pb-2 font-medium text-muted-foreground text-right">Campaigns</th>
                  </tr>
                </thead>
                <tbody>
                  {topPlaylists.slice(0, 10).map((playlist, index) => (
                    <tr key={playlist.playlistId} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-4 text-muted-foreground">{index + 1}</td>
                      <td className="py-2 pr-4 font-medium">{playlist.playlistName}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{playlist.vendorName}</td>
                      <td className="py-2 pr-4 text-right">{playlist.avgStreamsDelivered.toLocaleString()}</td>
                      <td className="py-2 pr-4 text-right">
                        <Badge variant={playlist.algorithmicLiftCorrelation > 0.3 ? 'default' : 'secondary'} className="text-xs">
                          {(playlist.algorithmicLiftCorrelation * 100).toFixed(0)}%
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <span className={playlist.campaignSuccessRate >= 0.8 ? 'text-emerald-500' : playlist.campaignSuccessRate >= 0.5 ? 'text-yellow-500' : 'text-red-500'}>
                          {(playlist.campaignSuccessRate * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-2 text-right text-muted-foreground">{playlist.campaignCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* C. Vendor Reliability Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Vendor Reliability
          </CardTitle>
          <CardDescription>
            Vendor-level summary for future allocation decisions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {vendorReliability.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No vendor reliability data available yet.</p>
          ) : (
            <div className="space-y-3">
              {vendorReliability.slice(0, 10).map((vendor) => (
                <div key={vendor.vendorId} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{vendor.name}</p>
                      <Badge
                        variant={vendor.trend === 'improving' ? 'default' : vendor.trend === 'declining' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {vendor.trend === 'improving' && <ArrowUpRight className="h-3 w-3 mr-1" />}
                        {vendor.trend === 'declining' && <ArrowDownRight className="h-3 w-3 mr-1" />}
                        {vendor.trend}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Progress value={vendor.reliabilityScore * 100} className="h-1.5 flex-1 max-w-[120px]" />
                      <span className="text-xs text-muted-foreground">{(vendor.reliabilityScore * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-right text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">On Pace</p>
                      <p className={`font-medium ${vendor.campaignsOnPacePercent >= 80 ? 'text-emerald-500' : vendor.campaignsOnPacePercent >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {vendor.campaignsOnPacePercent.toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Avg Variance</p>
                      <p className="font-medium">
                        {vendor.avgDeliveryVariance >= 0 ? '+' : ''}{(vendor.avgDeliveryVariance * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ramp</p>
                      <p className="font-medium">{vendor.avgRampDays}d</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  TAB 2: Performance Intelligence                                    */
/* ------------------------------------------------------------------ */

function PerformanceIntelligenceTab({
  projections,
  warnings,
}: {
  projections?: {
    campaigns: ProjectionRecord[];
    overallAccuracy: number;
    totalProjected: number;
    totalActual: number;
    overallVariance: number;
    excludedCount: number;
  } | null;
  warnings: EarlyWarningCampaign[];
}) {
  return (
    <>
      {/* A. Projection vs Actual Streams */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Projection vs Actual Streams
          </CardTitle>
          <CardDescription>
            Validate pacing accuracy across campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Pacing Accuracy</p>
              <p className="text-3xl font-bold">
                {projections ? `${projections.overallAccuracy.toFixed(0)}%` : '—'}
              </p>
              <p className="text-xs text-muted-foreground">Campaigns within 20% of projection</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Projected</p>
              <p className="text-2xl font-bold">{projections?.totalProjected.toLocaleString() || '0'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Actual</p>
              <p className="text-2xl font-bold">{projections?.totalActual.toLocaleString() || '0'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Overall Variance</p>
              <p className={`text-2xl font-bold ${
                projections && projections.overallVariance >= 0 ? 'text-emerald-500' : 'text-red-500'
              }`}>
                {projections ? `${projections.overallVariance >= 0 ? '+' : ''}${projections.overallVariance}%` : '—'}
              </p>
            </div>
          </div>

          {projections && projections.campaigns.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">Campaign</th>
                      <th className="pb-2 pr-4 font-medium text-muted-foreground text-right">Projected</th>
                      <th className="pb-2 pr-4 font-medium text-muted-foreground text-right">Actual</th>
                      <th className="pb-2 pr-4 font-medium text-muted-foreground text-right">Variance</th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projections.campaigns.slice(0, 15).map((campaign) => (
                      <tr key={campaign.campaignId} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-4 font-medium">{campaign.campaignName}</td>
                        <td className="py-2 pr-4 text-right">{campaign.projectedStreams.toLocaleString()}</td>
                        <td className="py-2 pr-4 text-right">{campaign.actualStreams.toLocaleString()}</td>
                        <td className={`py-2 pr-4 text-right font-medium ${
                          campaign.variancePercent >= 0 ? 'text-emerald-500' : 'text-red-500'
                        }`}>
                          {campaign.variancePercent >= 0 ? '+' : ''}{campaign.variancePercent}%
                        </td>
                        <td className="py-2 text-right">
                          <Badge variant={
                            campaign.status === 'on_track' ? 'default' :
                            campaign.status === 'over' ? 'secondary' : 'destructive'
                          } className="text-xs">
                            {campaign.status === 'on_track' ? 'On Track' :
                             campaign.status === 'over' ? 'Over' : 'Under'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {projections.excludedCount > 0 && (
                <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                  {projections.excludedCount} campaign{projections.excludedCount !== 1 ? 's' : ''} excluded — no delivery data available yet.
                  Only campaigns with tracked playlist streams are shown.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-4">No projection data available yet.</p>
          )}
        </CardContent>
      </Card>

      {/* B. Early Warning System */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Early Warning System
          </CardTitle>
          <CardDescription>
            Campaigns that need attention before they fall behind
          </CardDescription>
        </CardHeader>
        <CardContent>
          {warnings.length === 0 ? (
            <div className="flex items-center gap-2 py-4">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <p className="text-sm text-muted-foreground">All campaigns are currently on track.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {warnings.map((warning, index) => (
                <Alert
                  key={`${warning.campaignId}-${index}`}
                  className={`border-l-4 ${
                    warning.severity === 'critical' ? 'border-l-red-500' :
                    warning.severity === 'warning' ? 'border-l-yellow-500' : 'border-l-blue-500'
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{warning.campaignName}</p>
                        <p className="text-sm text-muted-foreground mt-1">{warning.message}</p>
                        {warning.daysRemaining > 0 && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {warning.daysRemaining} days remaining
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={
                          warning.severity === 'critical' ? 'destructive' :
                          warning.severity === 'warning' ? 'secondary' : 'outline'
                        }>
                          {warning.severity}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {warning.issue === 'below_pace' ? 'Below Pace' :
                           warning.issue === 'plateau' ? 'Plateau' : 'Vendor Drop'}
                        </Badge>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  TAB 3: Optimization Suggestions                                    */
/* ------------------------------------------------------------------ */

const SUGGESTION_CONFIG: Record<OptimizationSuggestion['type'], {
  label: string;
  icon: typeof Zap;
  color: string;
}> = {
  pacing_risk: { label: 'Pacing Risk', icon: AlertTriangle, color: 'text-red-500' },
  vendor_underperformance: { label: 'Vendor Underperformance', icon: TrendingDown, color: 'text-yellow-500' },
  algorithmic_opportunity: { label: 'Algorithmic Opportunity', icon: Activity, color: 'text-blue-500' },
  momentum_opportunity: { label: 'Momentum Opportunity', icon: Zap, color: 'text-emerald-500' },
};

function OptimizationSuggestionsTab({ suggestions }: { suggestions: OptimizationSuggestion[] }) {
  return (
    <>
      <div className="mb-2">
        <p className="text-sm text-muted-foreground">
          Generated daily using rule-based analysis. Each suggestion includes the issue detected, a recommended action, and a confidence level.
        </p>
      </div>

      {suggestions.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-2 text-center">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
              <p className="font-medium">No optimization suggestions at this time</p>
              <p className="text-sm text-muted-foreground">All campaigns are performing within expected parameters.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion) => {
            const config = SUGGESTION_CONFIG[suggestion.type];
            const Icon = config.icon;

            return (
              <Card key={suggestion.id} className="border-l-4" style={{
                borderLeftColor: config.color === 'text-red-500' ? 'rgb(239 68 68)' :
                  config.color === 'text-yellow-500' ? 'rgb(234 179 8)' :
                  config.color === 'text-blue-500' ? 'rgb(59 130 246)' : 'rgb(16 185 129)'
              }}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{suggestion.campaignName}</p>
                        <Badge variant="outline" className="text-xs">{config.label}</Badge>
                        <Badge
                          variant={suggestion.confidence === 'high' ? 'default' : suggestion.confidence === 'medium' ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {suggestion.confidence} confidence
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{suggestion.issueDetected}</p>
                      <div className="mt-2 p-2 bg-muted/50 rounded flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{suggestion.recommendedAction}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
