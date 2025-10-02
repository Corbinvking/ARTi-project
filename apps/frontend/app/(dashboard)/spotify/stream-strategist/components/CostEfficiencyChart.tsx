import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { useROIAnalytics } from "../hooks/useROIAnalytics";
import { Skeleton } from "./ui/skeleton";

const chartConfig = {
  cost: {
    label: "Cost per Stream",
    color: "hsl(var(--chart-1))",
  },
  efficiency: {
    label: "Efficiency",
    color: "hsl(var(--chart-2))",
  },
};

export const CostEfficiencyChart = () => {
  const { data, isLoading, error } = useROIAnalytics();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cost Efficiency Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cost Efficiency Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Failed to load cost efficiency data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Efficiency Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.costTrends.monthly}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line 
                type="monotone" 
                dataKey="avgCostPerStream" 
                stroke="var(--color-cost)"
                strokeWidth={2}
                name="Avg Cost per Stream"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};







