import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, ComposedChart } from "recharts";
import { useExecutiveDashboardData } from "../hooks/useExecutiveDashboardData";
import { Skeleton } from "./ui/skeleton";

const chartConfig = {
  ourPerformance: {
    label: "Our Performance",
    color: "hsl(var(--chart-1))",
  },
  industryBenchmark: {
    label: "Industry Benchmark",
    color: "hsl(var(--chart-2))",
  },
  roi: {
    label: "ROI",
    color: "hsl(var(--chart-3))",
  },
  costPerStream: {
    label: "Cost per Stream",
    color: "hsl(var(--chart-4))",
  },
};

export const PerformanceBenchmarkChart = () => {
  const { data, isLoading, error } = useExecutiveDashboardData();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Benchmarks</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Benchmarks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Failed to load benchmark data</p>
        </CardContent>
      </Card>
    );
  }

  // Real, meaningful performance metrics based on actual data
  const benchmarkData = [
    {
      metric: "Profit Margin",
      value: data.averageROI,
      format: 'percent',
      description: "(Revenue - Vendor Costs) / Revenue",
      isGood: data.averageROI >= 50
    },
    {
      metric: "Goal Achievement",
      value: data.campaignEfficiency,
      format: 'percent',
      description: "Actual streams vs campaign goals",
      isGood: data.campaignEfficiency >= 80
    },
    {
      metric: "Active Campaigns",
      value: data.activeCampaigns,
      format: 'number',
      description: `${data.activeCampaigns} of ${data.totalCampaigns} total`,
      isGood: data.activeCampaigns > 0
    }
  ];

  const performanceOverTime = data.topPerformingVendors.map((vendor, index) => ({
    name: vendor.name,
    efficiency: vendor.efficiency,
    performance: vendor.avgPerformance,
    campaigns: vendor.totalCampaigns
  }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Campaign Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Total Revenue</p>
                <p className="text-sm text-muted-foreground">Sum of all campaign budgets</p>
              </div>
              <div className="text-2xl font-bold text-green-600">
                ${data.totalRevenue.toLocaleString()}
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Streams Delivered (28d)</p>
                <p className="text-sm text-muted-foreground">From vendor playlists only</p>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {data.totalStreamsPast30Days.toLocaleString()}
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Avg Cost per 1K Streams</p>
                <p className="text-sm text-muted-foreground">Based on vendor rates</p>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                ${data.averageCostPer1kStreams.toFixed(2)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Performance Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={performanceOverTime}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar 
                  yAxisId="left"
                  dataKey="efficiency" 
                  fill="var(--color-ourPerformance)"
                  name="Efficiency %"
                  radius={[2, 2, 0, 0]}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="performance" 
                  stroke="var(--color-industryBenchmark)"
                  strokeWidth={2}
                  name="Performance %"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Key Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {benchmarkData.map((item) => (
              <div key={item.metric} className={`text-center p-4 border rounded-lg ${
                item.isGood ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20' : 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20'
              }`}>
                <h3 className="font-medium text-sm text-muted-foreground">{item.metric}</h3>
                <div className="mt-2 space-y-1">
                  <div className={`text-2xl font-bold ${item.isGood ? 'text-green-600' : 'text-orange-600'}`}>
                    {item.format === 'percent' ? `${item.value.toFixed(1)}%` : item.value.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};







