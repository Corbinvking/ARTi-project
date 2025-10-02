import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, ComposedChart, ScatterChart, Scatter } from "recharts";
import { useROIAnalytics } from "../hooks/useROIAnalytics";
import { CostEfficiencyChart } from "./CostEfficiencyChart";
import { BudgetOptimizationPanel } from "./BudgetOptimizationPanel";
import { TrendingUp, TrendingDown, DollarSign, Target, AlertTriangle } from "lucide-react";
import { Skeleton } from "./ui/skeleton";

const chartConfig = {
  roi: {
    label: "ROI %",
    color: "hsl(var(--chart-1))",
  },
  cost: {
    label: "Cost per Stream",
    color: "hsl(var(--chart-2))",
  },
  efficiency: {
    label: "Efficiency",
    color: "hsl(var(--chart-3))",
  },
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-4))",
  },
};

export const ROIAnalyticsDashboard = () => {
  const { data, isLoading, error } = useROIAnalytics();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">Failed to load ROI analytics data</p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="space-y-6">
      {/* ROI Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall ROI</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.overallROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(data.overallROI)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.profitabilityMetrics.grossProfit)}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(data.profitabilityMetrics.profitMargin)} margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Break Even</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.profitabilityMetrics.breakEvenPoint)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk Campaigns</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {data.budgetOptimization.underperformingCampaigns.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Efficiency Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.costTrends.monthly}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="avgCostPerStream" 
                  stroke="var(--color-cost)"
                  strokeWidth={2}
                  name="Avg Cost per Stream"
                />
                <Bar 
                  yAxisId="right"
                  dataKey="efficiency" 
                  fill="var(--color-efficiency)"
                  name="Efficiency %"
                  radius={[2, 2, 0, 0]}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Campaign ROI Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign ROI Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {data.campaignROIBreakdown.map((campaign) => (
              <div key={campaign.campaignId} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{campaign.campaignName}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(campaign.revenue)} revenue • {campaign.actualStreams.toLocaleString()} streams
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <Badge 
                    variant={campaign.roi >= 20 ? "default" : campaign.roi >= 0 ? "secondary" : "destructive"}
                  >
                    {formatPercentage(campaign.roi)} ROI
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    ${campaign.costPerStream.toFixed(4)}/stream
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Vendor Efficiency Scatter Plot */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Cost vs Efficiency Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart data={data.vendorCostEfficiency}>
                <XAxis 
                  type="number" 
                  dataKey="avgCostPerStream" 
                  name="Cost per Stream"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="efficiency" 
                  name="Efficiency %"
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  cursor={{ strokeDasharray: '3 3' }}
                />
                <Scatter 
                  dataKey="efficiency" 
                  fill="var(--color-efficiency)"
                  name="Vendor Performance"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Additional Components */}
      <div className="grid gap-4 md:grid-cols-2">
        <CostEfficiencyChart />
        <BudgetOptimizationPanel />
      </div>
    </div>
  );
};







