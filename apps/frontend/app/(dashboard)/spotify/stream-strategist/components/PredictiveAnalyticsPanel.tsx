import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, AreaChart, Area } from "recharts";
import { usePredictiveAnalytics } from "../hooks/usePredictiveAnalytics";
import { TrendingUp, Calendar, AlertCircle, Target, Brain } from "lucide-react";
import { Skeleton } from "./ui/skeleton";

export const PredictiveAnalyticsPanel = () => {
  const { data, isLoading, error } = usePredictiveAnalytics();

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
          <CardTitle>Campaign Performance Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.performanceForecast}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
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
                  name="Confidence Level"
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







