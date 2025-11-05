import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface EngagementChartProps {
  data: {
    date: string;
    views: number;
    likes: number;
    comments: number;
    engagementRate: number;
  }[];
  timeRange: string;
}

const EngagementChart = ({ data, timeRange }: EngagementChartProps) => {
  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (timeRange === '7d') {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
    if (timeRange === '30d') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{new Date(label).toLocaleDateString()}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {
                entry.name === 'Engagement Rate' 
                  ? `${entry.value.toFixed(1)}%`
                  : formatNumber(entry.value)
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Live Engagement Analytics</span>
          <div className="text-sm text-muted-foreground">
            {timeRange === '7d' && 'Last 7 Days'}
            {timeRange === '30d' && 'Last 30 Days'}
            {timeRange === '90d' && 'Last 90 Days'}
          </div>
        </CardTitle>
        <CardDescription>
          Track views, likes, comments, and engagement rates over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis 
                yAxisId="left"
                tickFormatter={formatNumber}
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis 
                yAxisId="right" 
                orientation="right"
                domain={[0, 10]}
                tickFormatter={(value) => `${value}%`}
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="views"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                name="Views"
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="likes"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                name="Likes"
                dot={{ fill: 'hsl(var(--success))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="comments"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                name="Comments"
                dot={{ fill: 'hsl(var(--accent))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="engagementRate"
                stroke="hsl(var(--warning))"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Engagement Rate"
                dot={{ fill: 'hsl(var(--warning))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {formatNumber(data.reduce((sum, day) => sum + day.views, 0))}
            </p>
            <p className="text-sm text-muted-foreground">Total Views</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-success">
              {formatNumber(data.reduce((sum, day) => sum + day.likes, 0))}
            </p>
            <p className="text-sm text-muted-foreground">Total Likes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-accent">
              {formatNumber(data.reduce((sum, day) => sum + day.comments, 0))}
            </p>
            <p className="text-sm text-muted-foreground">Total Comments</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-warning">
              {(data.reduce((sum, day) => sum + day.engagementRate, 0) / data.length).toFixed(1)}%
            </p>
            <p className="text-sm text-muted-foreground">Avg Engagement</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EngagementChart;