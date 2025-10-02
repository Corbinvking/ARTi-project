import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface VendorPerformanceData {
  vendor_id: string;
  vendor_name: string;
  allocated_streams: number;
  actual_streams: number;
  predicted_streams: number;
  performance_score: number;
  cost_per_stream: number;
  playlists: Array<{
    id: string;
    name: string;
    allocated_streams: number;
    actual_streams: number;
    daily_data: Array<{
      date: string;
      streams: number;
    }>;
  }>;
}

interface VendorPerformanceChartProps {
  data: VendorPerformanceData[];
  campaignGoal: number;
}

const chartConfig = {
  actual: {
    label: "Actual Streams",
    color: "hsl(var(--primary))",
  },
  predicted: {
    label: "Predicted Streams",
    color: "hsl(var(--muted-foreground))",
  },
  allocated: {
    label: "Allocated Streams",
    color: "hsl(var(--accent))",
  },
};

export function VendorPerformanceChart({ data, campaignGoal }: VendorPerformanceChartProps) {
  const getTrendIcon = (score: number) => {
    if (score >= 0.9) return <TrendingUp className="h-3 w-3 text-green-600" />;
    if (score >= 0.7) return <Minus className="h-3 w-3 text-yellow-600" />;
    return <TrendingDown className="h-3 w-3 text-red-600" />;
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 0.9) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 0.7) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const chartData = data.map(vendor => ({
    vendor: vendor.vendor_name || `Vendor ${vendor.vendor_id.substring(0, 8)}`,
    actual: vendor.actual_streams,
    predicted: vendor.predicted_streams,
    allocated: vendor.allocated_streams,
  }));

  return (
    <div className="space-y-6">
      {/* Overview Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Performance by Vendor
            <Badge variant="outline" className="text-xs">
              {data.length} vendors
            </Badge>
          </CardTitle>
          <CardDescription>
            Comparing predicted vs actual stream delivery across vendors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <BarChart data={chartData}>
              <XAxis dataKey="vendor" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="predicted" fill="var(--color-predicted)" opacity={0.6} />
              <Bar dataKey="actual" fill="var(--color-actual)" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Individual Vendor Breakdown */}
      <div className="space-y-4">
        <div className="text-lg font-semibold">Vendor Performance Breakdown</div>
        {data.map((vendor) => (
          <Card key={vendor.vendor_id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">
                    {vendor.vendor_name || `Vendor ${vendor.vendor_id.substring(0, 8)}`}
                  </CardTitle>
                  {getTrendIcon(vendor.performance_score)}
                  <Badge className={getPerformanceColor(vendor.performance_score)}>
                    {(vendor.performance_score * 100).toFixed(1)}% score
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  ${vendor.cost_per_stream?.toFixed(3)}/stream
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Allocated:</span>
                  <div className="font-semibold">{vendor.allocated_streams.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Predicted:</span>
                  <div className="font-semibold">{vendor.predicted_streams.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Actual:</span>
                  <div className="font-semibold text-primary">{vendor.actual_streams.toLocaleString()}</div>
                </div>
              </div>
            </CardHeader>
            
            {vendor.playlists && vendor.playlists.length > 0 && (
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">Playlist Performance:</div>
                  {vendor.playlists.map((playlist) => (
                    <div key={playlist.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{playlist.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {playlist.actual_streams.toLocaleString()} / {playlist.allocated_streams.toLocaleString()} streams
                        </div>
                      </div>
                      
                      {playlist.daily_data && playlist.daily_data.length > 0 && (
                        <div className="h-[100px]">
                          <ChartContainer config={{
                            streams: { label: "Daily Streams", color: "hsl(var(--primary))" }
                          }} className="h-full">
                            <LineChart data={playlist.daily_data}>
                              <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                              <YAxis />
                              <ChartTooltip 
                                content={<ChartTooltipContent />}
                                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="streams" 
                                stroke="var(--color-streams)" 
                                strokeWidth={2}
                                dot={false}
                              />
                            </LineChart>
                          </ChartContainer>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}







