import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  Target, 
  AlertTriangle, 
  CheckCircle,
  BarChart3,
  PieChart,
  Activity,
  Info
} from "lucide-react";
import { Creator, Campaign } from "../lib/types";
import { useCampaignManagementMetrics, CreatorTierScore } from "../hooks/useCampaignManagementMetrics";
import { CampaignManagementDashboard } from "../components/CampaignManagementDashboard";

interface PredictiveAnalyticsProps {
  creators: Creator[];
  campaigns: Campaign[];
  selectedCampaign?: Campaign;
}

export const PredictiveAnalytics = ({ creators, campaigns, selectedCampaign }: PredictiveAnalyticsProps) => {
  const { creatorTierScores } = useCampaignManagementMetrics(creators, campaigns);
  
  const topCreators = useMemo(() => {
    return [...creatorTierScores]
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, 10);
  }, [creatorTierScores]);

  return (
    <div className="space-y-6">
      {/* Deprecation Notice */}
      <Card className="border-warning/50 bg-warning/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-foreground mb-1">Analytics Updated</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Predictive Analytics has been redesigned to focus on practical campaign management metrics. 
                Speculative predictions have been replaced with actionable operational insights.
              </p>
              <p className="text-sm text-muted-foreground">
                Success probability, ROI predictions, and risk levels are no longer available as they were not based on historical data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New Management Dashboard */}
      <CampaignManagementDashboard creators={creators} campaigns={campaigns} />

      {/* Creator Tier Analysis */}
      <Tabs defaultValue="creators" className="space-y-4">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="creators">Creator Tier Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="creators" className="space-y-4">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Creator Performance Tiers
              </CardTitle>
              <CardDescription>
                Creators categorized by performance and reliability metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topCreators.map((creatorScore, index) => {
                  const creator = creators.find(c => c.id === creatorScore.id);
                  if (!creator) return null;

                  const getTierColor = (tier: string) => {
                    switch (tier) {
                      case 'high': return 'text-success';
                      case 'medium': return 'text-warning';
                      default: return 'text-muted-foreground';
                    }
                  };

                  const getTierBadgeVariant = (tier: string) => {
                    switch (tier) {
                      case 'high': return 'default';
                      case 'medium': return 'secondary';
                      default: return 'outline';
                    }
                  };

                  return (
                    <div key={creatorScore.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border/30">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">#{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-foreground">@{creator.instagram_handle}</h4>
                          <Badge variant={getTierBadgeVariant(creatorScore.tierLevel)} className="text-xs capitalize">
                            {creatorScore.tierLevel} Tier
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div>
                            <p className="text-muted-foreground">Performance</p>
                            <Progress value={creatorScore.performanceScore} className="mt-1 h-2" />
                            <span className="text-xs font-medium">{creatorScore.performanceScore}%</span>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Reliability</p>
                            <Progress value={creatorScore.reliabilityScore} className="mt-1 h-2" />
                            <span className="text-xs font-medium">{creatorScore.reliabilityScore}%</span>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Cost Efficiency</p>
                            <Progress value={creatorScore.costEfficiencyScore} className="mt-1 h-2" />
                            <span className="text-xs font-medium">{creatorScore.costEfficiencyScore}%</span>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Execution Risk</p>
                            <Progress value={100 - creatorScore.executionRiskScore} className="mt-1 h-2" />
                            <span className="text-xs font-medium">
                              {creatorScore.executionRiskScore > 30 ? 'High' : 
                               creatorScore.executionRiskScore > 15 ? 'Medium' : 'Low'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};