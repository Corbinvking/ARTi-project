import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PerformancePoint {
  date: string;
  accuracy: number;
  precision: number;
  recall: number;
  campaigns_evaluated: number;
}

interface MLPerformanceChartProps {
  performanceHistory: PerformancePoint[];
  loading: boolean;
}

export const MLPerformanceChart = ({ performanceHistory, loading }: MLPerformanceChartProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const chartData = performanceHistory.map(point => ({
    ...point,
    date: formatDate(point.date),
    accuracy: Math.round(point.accuracy * 100),
    precision: Math.round(point.precision * 100),
    recall: Math.round(point.recall * 100)
  }));

  const getLatestTrend = () => {
    if (chartData.length < 2) return { direction: 'stable', value: 0 };
    
    const latest = chartData[chartData.length - 1];
    const previous = chartData[chartData.length - 2];
    const change = latest.accuracy - previous.accuracy;
    
    if (change > 1) return { direction: 'up', value: change };
    if (change < -1) return { direction: 'down', value: Math.abs(change) };
    return { direction: 'stable', value: Math.abs(change) };
  };

  const trend = getLatestTrend();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}%
            </p>
          ))}
          {payload[0]?.payload?.campaigns_evaluated && (
            <p className="text-xs text-muted-foreground mt-1">
              Campaigns evaluated: {payload[0].payload.campaigns_evaluated}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Performance Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Algorithm Performance Over Time
          </CardTitle>
          <CardDescription>
            Model accuracy, precision, and recall trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    domain={[0, 100]}
                    label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="accuracy" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    name="Accuracy"
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="precision" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    name="Precision"
                    dot={{ fill: "hsl(var(--chart-2))", strokeWidth: 2, r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="recall" 
                    stroke="hsl(var(--chart-3))" 
                    strokeWidth={2}
                    name="Recall"
                    dot={{ fill: "hsl(var(--chart-3))", strokeWidth: 2, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No performance history available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Train your first model to see performance trends
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Latest Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {chartData.length > 0 ? `${chartData[chartData.length - 1].accuracy}%` : 'N/A'}
            </div>
            <p className={`text-xs mt-1 flex items-center gap-1 ${
              trend.direction === 'up' ? 'text-green-600' : 
              trend.direction === 'down' ? 'text-red-600' : 
              'text-muted-foreground'
            }`}>
              {trend.direction === 'up' && '↗ '}
              {trend.direction === 'down' && '↘ '}
              {trend.direction === 'stable' && '→ '}
              {trend.value.toFixed(1)}% vs. previous
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Training Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{chartData.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Model versions trained
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Campaigns Evaluated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {chartData.reduce((sum, point) => sum + point.campaigns_evaluated, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total campaigns analyzed
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};