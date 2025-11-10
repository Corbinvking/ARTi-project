"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Activity, 
  MoreVertical,
  Maximize2,
  Filter,
  Calendar,
  Download
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface MobileMetric {
  id: string;
  title: string;
  value: number | string;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  unit?: string;
}

interface MobileChartProps {
  title: string;
  data: any[];
  type: 'line' | 'bar' | 'pie';
  dataKey?: string;
  xAxisKey?: string;
  height?: number;
  color?: string;
  showActions?: boolean;
}

const MobileChart: React.FC<MobileChartProps> = ({ 
  title, 
  data, 
  type, 
  dataKey = 'value', 
  xAxisKey = 'name',
  height = 200,
  color = '#8884d8',
  showActions = true
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const renderChart = (chartHeight: number) => {
    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={data}>
              <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey={dataKey} 
                stroke={color} 
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={data}>
              <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={chartHeight * 0.35}
                fill={color}
                dataKey={dataKey}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 50%)`} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      
      default:
        return null;
    }
  };

  const ChartContent = ({ height: h }: { height: number }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{title}</h3>
        {showActions && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(true)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      {renderChart(h)}
    </div>
  );

  return (
    <>
      <Card className="touch-manipulation">
        <CardContent className="p-4">
          <ChartContent height={height} />
        </CardContent>
      </Card>

      {/* Fullscreen Modal */}
      <Sheet open={isFullscreen} onOpenChange={setIsFullscreen}>
        <SheetContent side="bottom" className="h-[90vh]">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>
              Detailed view with enhanced interactivity
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <ChartContent height={400} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

interface MobileMetricCardProps {
  metric: MobileMetric;
  size?: 'small' | 'large';
}

const MobileMetricCard: React.FC<MobileMetricCardProps> = ({ metric, size = 'large' }) => {
  const getTrendIcon = () => {
    switch (metric.trend) {
      case 'up': return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down': return <TrendingDown className="h-3 w-3 text-red-500" />;
      default: return null;
    }
  };

  const getTrendColor = () => {
    switch (metric.trend) {
      case 'up': return 'text-green-500';
      case 'down': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  if (size === 'small') {
    return (
      <Card className="touch-manipulation">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <metric.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{metric.title}</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold">
                {(typeof metric.value === 'number' ? metric.value : 0).toLocaleString()}
                {metric.unit && <span className="ml-1 text-xs text-muted-foreground">{metric.unit}</span>}
              </div>
              {metric.change !== undefined && (
                <div className={`text-xs flex items-center gap-1 ${getTrendColor()}`}>
                  {getTrendIcon()}
                  {metric.change > 0 ? '+' : ''}{metric.change}%
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="touch-manipulation">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <metric.icon className={`h-5 w-5 ${metric.color || 'text-primary'}`} />
            {metric.change !== undefined && (
              <Badge variant={metric.trend === 'up' ? 'default' : 'secondary'} className="text-xs">
                {getTrendIcon()}
                <span className="ml-1">{metric.change > 0 ? '+' : ''}{metric.change}%</span>
              </Badge>
            )}
          </div>
          
          <div>
            <div className="text-2xl font-bold">
              {(typeof metric.value === 'number' ? metric.value : 0).toLocaleString()}
              {metric.unit && <span className="text-sm text-muted-foreground ml-1">{metric.unit}</span>}
            </div>
            <p className="text-sm text-muted-foreground">{metric.title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface MobileDashboardProps {
  metrics: MobileMetric[];
  charts: {
    title: string;
    data: any[];
    type: 'line' | 'bar' | 'pie';
    dataKey?: string;
    xAxisKey?: string;
  }[];
  showFilters?: boolean;
}

export const MobileDashboard: React.FC<MobileDashboardProps> = ({ 
  metrics, 
  charts, 
  showFilters = true 
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');

  return (
    <div className="space-y-4 pb-20"> {/* Bottom padding for mobile navigation */}
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b p-4 -m-4 mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Analytics</h1>
          {showFilters && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-1" />
                {selectedTimeRange}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics - Horizontal Scroll */}
      <ScrollArea>
        <div className="flex gap-3 pb-2">
          {metrics.slice(0, 4).map((metric, index) => (
            <div key={metric.id} className="flex-shrink-0 w-48">
              <MobileMetricCard metric={metric} />
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Compact Metrics Grid */}
      {metrics.length > 4 && (
        <div className="grid grid-cols-1 gap-2">
          {metrics.slice(4).map((metric) => (
            <MobileMetricCard key={metric.id} metric={metric} size="small" />
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="space-y-4">
        {charts.map((chart, index) => (
          <MobileChart
            key={index}
            title={chart.title}
            data={chart.data}
            type={chart.type}
            dataKey={chart.dataKey}
            xAxisKey={chart.xAxisKey}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <Download className="h-5 w-5" />
              <span className="text-sm">Export Data</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <Activity className="h-5 w-5" />
              <span className="text-sm">View Alerts</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Touch-optimized data table for mobile
interface MobileDataTableProps {
  data: any[];
  columns: {
    key: string;
    label: string;
    render?: (value: any, row: any) => React.ReactNode;
  }[];
}

export const MobileDataTable: React.FC<MobileDataTableProps> = ({ data, columns }) => {
  return (
    <div className="space-y-2">
      {data.map((row, index) => (
        <Card key={index} className="touch-manipulation">
          <CardContent className="p-3">
            <div className="space-y-2">
              {columns.map((column) => (
                <div key={column.key} className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{column.label}</span>
                  <span className="text-sm font-medium">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export { MobileChart, MobileMetricCard };