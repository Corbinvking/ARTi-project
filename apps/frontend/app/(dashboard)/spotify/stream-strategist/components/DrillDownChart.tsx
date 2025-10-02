import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";

interface DrillDownChartProps {
  title: string;
  data: Array<{
    name: string;
    [key: string]: any;
  }>;
}

const chartConfig = {
  value: {
    label: "Value",
    color: "hsl(var(--chart-1))",
  },
};

export const DrillDownChart = ({ title, data }: DrillDownChartProps) => {
  const chartData = data.map(item => ({
    name: item.name,
    value: Object.values(item).find(val => typeof val === 'number') || 0
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};







