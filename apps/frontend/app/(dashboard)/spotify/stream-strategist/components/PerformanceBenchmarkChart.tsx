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

  const benchmarkData = [
    {
      metric: "ROI (%)",
      ourPerformance: data.averageROI,
      industryBenchmark: data.performanceBenchmarks.industryAvgROI,
      difference: data.averageROI - data.performanceBenchmarks.industryAvgROI
    },
    {
      metric: "Cost per Stream ($)",
      ourPerformance: data.averageCostPerStream,
      industryBenchmark: data.performanceBenchmarks.industryAvgCostPerStream,
      difference: data.performanceBenchmarks.industryAvgCostPerStream - data.averageCostPerStream
    },
    {
      metric: "Time Completion (%)",
      ourPerformance: data.campaignEfficiency,
      industryBenchmark: 75, // Mock industry average
      difference: data.campaignEfficiency - 75
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
          <CardTitle>Performance vs Industry Benchmarks</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={benchmarkData}>
                <XAxis 
                  dataKey="metric" 
                  tick={{ fontSize: 12 }}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar 
                  dataKey="ourPerformance" 
                  fill="var(--color-ourPerformance)"
                  name="Our Performance"
                  radius={[2, 2, 0, 0]}
                />
                <Bar 
                  dataKey="industryBenchmark" 
                  fill="var(--color-industryBenchmark)"
                  name="Industry Benchmark"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
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
          <CardTitle>Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {benchmarkData.map((item) => (
              <div key={item.metric} className="text-center p-4 border rounded-lg">
                <h3 className="font-medium text-sm text-muted-foreground">{item.metric}</h3>
                <div className="mt-2 space-y-1">
                  <div className="text-lg font-bold">
                    {item.metric.includes('$') ? '$' : ''}{item.ourPerformance.toFixed(item.metric.includes('$') ? 3 : 1)}
                    {item.metric.includes('%') ? '%' : ''}
                  </div>
                  <div className={`text-sm ${item.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {item.difference >= 0 ? '+' : ''}{item.difference.toFixed(item.metric.includes('$') ? 3 : 1)}
                    {item.metric.includes('%') ? 'pp' : ''} vs industry
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







