import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, AreaChart, Area, ReferenceLine } from "recharts";
import { usePredictiveAnalytics, CampaignForecast } from "../hooks/usePredictiveAnalytics";
import { TrendingUp, Calendar, AlertCircle, Target, Brain, Search, X } from "lucide-react";
import { Skeleton } from "./ui/skeleton";

export const PredictiveAnalyticsPanel = () => {
  const { data, isLoading, error } = usePredictiveAnalytics();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignForecast | null>(null);

  // Filter campaigns based on search
  const filteredCampaigns = useMemo(() => {
    if (!data?.campaigns) return [];
    if (!searchTerm) return data.campaigns.slice(0, 10); // Show top 10 by default
    
    return data.campaigns.filter(c => 
      c.campaign_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.artist_name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 20);
  }, [data?.campaigns, searchTerm]);

  // Get chart data - either selected campaign or aggregate
  const chartData = useMemo(() => {
    if (selectedCampaign) {
      return selectedCampaign.forecast;
    }
    return data?.performanceForecast || [];
  }, [selectedCampaign, data?.performanceForecast]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">Failed to load predictive analytics data</p>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = {
    prediction: {
      label: "Predicted Streams",
      color: "hsl(var(--chart-1))",
    },
    confidence: {
      label: "Confidence",
      color: "hsl(var(--chart-2))",
    },
  };

  return (
    <div className="space-y-4">
      {/* Prediction Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaigns at Risk</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.riskAssessment.high}</div>
            <p className="text-xs text-muted-foreground">High risk campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Time</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.completionPredictions.avgDays}</div>
            <p className="text-xs text-muted-foreground">Days (predicted avg)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Goal Achievement</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data.goalAchievementProbability.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">Success probability</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Confidence</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.modelConfidence.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">Prediction accuracy</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Forecast Chart */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>
              {selectedCampaign 
                ? `Forecast: ${selectedCampaign.campaign_name}` 
                : 'Campaign Performance Forecast'}
            </CardTitle>
            {selectedCampaign && (
              <Button variant="outline" size="sm" onClick={() => setSelectedCampaign(null)}>
                <X className="w-4 h-4 mr-2" />
                Clear Selection
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Campaign Search */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns by name or artist..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Campaign Results */}
            {(searchTerm || !selectedCampaign) && filteredCampaigns.length > 0 && (
              <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                {filteredCampaigns.map((campaign) => (
                  <button
                    key={campaign.campaign_id}
                    onClick={() => {
                      setSelectedCampaign(campaign);
                      setSearchTerm("");
                    }}
                    className={`w-full p-3 text-left hover:bg-muted transition-colors flex items-center justify-between ${
                      selectedCampaign?.campaign_id === campaign.campaign_id ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div>
                      <div className="font-medium text-sm">{campaign.campaign_name}</div>
                      <div className="text-xs text-muted-foreground">{campaign.artist_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{campaign.current_streams_28d.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">
                        {campaign.daily_rate.toLocaleString()}/day
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Selected Campaign Stats */}
            {selectedCampaign && (
              <div className="grid grid-cols-4 gap-4 p-3 bg-muted rounded-lg">
                <div>
                  <div className="text-xs text-muted-foreground">Current (28d)</div>
                  <div className="font-bold">{selectedCampaign.current_streams_28d.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Daily Rate</div>
                  <div className="font-bold">{selectedCampaign.daily_rate.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Goal</div>
                  <div className="font-bold">{selectedCampaign.stream_goal.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Days to Goal</div>
                  <div className="font-bold">{selectedCampaign.days_to_goal > 900 ? '∞' : selectedCampaign.days_to_goal}</div>
                </div>
              </div>
            )}
          </div>

          {/* Chart */}
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {selectedCampaign && (
                  <ReferenceLine 
                    y={selectedCampaign.stream_goal} 
                    stroke="hsl(var(--destructive))" 
                    strokeDasharray="5 5"
                    label={{ value: 'Goal', position: 'right', fill: 'hsl(var(--destructive))' }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="predictedStreams"
                  stroke="var(--color-prediction)"
                  fill="var(--color-prediction)"
                  fillOpacity={0.2}
                  name="Predicted Streams"
                />
                <Line
                  type="monotone"
                  dataKey="confidence"
                  stroke="var(--color-confidence)"
                  strokeDasharray="5 5"
                  name="Confidence %"
                  yAxisId="right"
                  hide
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Budget Optimization Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recommendations.budgetOptimization.map((rec, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{rec.campaignName}</h4>
                    <Badge variant={rec.action === 'increase' ? 'default' : 'destructive'}>
                      {rec.action === 'increase' ? '+' : '-'}{rec.amount}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{rec.reason}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendor Performance Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recommendations.vendorOptimization.map((vendor, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{vendor.name}</h4>
                    <Badge variant="secondary">
                      {vendor.predictedPerformance.toFixed(0)}% efficiency
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{vendor.recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};







