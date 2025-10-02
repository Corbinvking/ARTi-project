"use client"

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, ComposedChart, PieChart, Pie, Cell } from "recharts";
import { useInteractiveAnalytics } from "../hooks/useInteractiveAnalytics";
import { FilterPanel } from "./FilterPanel";
import { DrillDownChart } from "./DrillDownChart";
import { useState } from "react";
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Filter, Download, Share, RefreshCw } from "lucide-react";
import { Skeleton } from "./ui/skeleton";

type ChartType = 'bar' | 'line' | 'pie' | 'composed';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const InteractiveDashboard = () => {
  const [selectedChart, setSelectedChart] = useState<ChartType>('bar');
  const [selectedMetric, setSelectedMetric] = useState('streams');
  const [showFilters, setShowFilters] = useState(false);
  
  const { data, isLoading, error, refetch } = useInteractiveAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-48" />
          <div className="flex space-x-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-9 w-20" />
            ))}
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">Failed to load interactive dashboard data</p>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = {
    streams: {
      label: "Streams",
      color: "hsl(var(--chart-1))",
    },
    revenue: {
      label: "Revenue",
      color: "hsl(var(--chart-2))",
    },
    roi: {
      label: "ROI",
      color: "hsl(var(--chart-3))",
    },
    performance: {
      label: "Performance",
      color: "hsl(var(--chart-4))",
    },
  };

  const renderChart = () => {
    const commonProps = {
      data: data.chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    };

    switch (selectedChart) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line 
              type="monotone" 
              dataKey={selectedMetric} 
              stroke={`var(--color-${selectedMetric})`}
              strokeWidth={2}
            />
          </LineChart>
        );
      
      case 'pie':
        return (
          <PieChart width={400} height={300}>
            <Pie
              data={data.pieData}
              cx={200}
              cy={150}
              labelLine={false}
              label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <ChartTooltip />
          </PieChart>
        );
      
      case 'composed':
        return (
          <ComposedChart {...commonProps}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar yAxisId="left" dataKey="streams" fill="var(--color-streams)" />
            <Line yAxisId="right" type="monotone" dataKey="performance" stroke="var(--color-performance)" strokeWidth={2} />
          </ComposedChart>
        );
      
      default: // bar
        return (
          <BarChart {...commonProps}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar 
              dataKey={selectedMetric} 
              fill={`var(--color-${selectedMetric})`}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Dashboard Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Interactive Analytics Dashboard</h2>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button variant="outline" size="sm">
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Chart Type Selector */}
      <div className="flex space-x-2">
        <Button
          variant={selectedChart === 'bar' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedChart('bar')}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Bar
        </Button>
        <Button
          variant={selectedChart === 'line' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedChart('line')}
        >
          <LineChartIcon className="h-4 w-4 mr-2" />
          Line
        </Button>
        <Button
          variant={selectedChart === 'pie' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedChart('pie')}
        >
          <PieChartIcon className="h-4 w-4 mr-2" />
          Pie
        </Button>
        <Button
          variant={selectedChart === 'composed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedChart('composed')}
        >
          Composed
        </Button>
      </div>

      {/* Metric Selector */}
      <div className="flex space-x-2">
        {Object.keys(chartConfig).map((metric) => (
          <Badge
            key={metric}
            variant={selectedMetric === metric ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedMetric(metric)}
          >
            {chartConfig[metric as keyof typeof chartConfig].label}
          </Badge>
        ))}
      </div>

      {/* Filter Panel */}
      {showFilters && <FilterPanel />}

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            {chartConfig[selectedMetric as keyof typeof chartConfig].label} Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Drill Down Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <DrillDownChart 
          title="Campaign Performance by Vendor"
          data={data.drillDownData.vendors}
        />
        
        <DrillDownChart 
          title="Performance Over Time"
          data={data.drillDownData.timeline.map(item => ({
            name: item.date,
            streams: item.streams,
            performance: item.performance
          }))}
        />
      </div>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {data.insights.map((insight, index) => (
              <div key={index} className="p-3 border rounded-lg">
                <h4 className="font-medium text-sm mb-1">{insight.title}</h4>
                <p className="text-xs text-muted-foreground mb-2">{insight.description}</p>
                <Badge variant={insight.trend === 'positive' ? 'default' : 'secondary'}>
                  {insight.value}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};








