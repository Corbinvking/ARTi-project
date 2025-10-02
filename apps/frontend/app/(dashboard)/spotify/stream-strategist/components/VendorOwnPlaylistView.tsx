"use client"

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Music, ExternalLink, X, TrendingUp, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface VendorPlaylistData {
  id: string;
  name: string;
  url?: string;
  avg_daily_streams: number;
  follower_count?: number;
  allocated_streams: number;
  actual_streams: number;
  twelve_month_streams: number;
  daily_data: Array<{
    date: string;
    streams: number;
  }>;
  is_allocated: boolean;
}

interface VendorOwnPlaylistViewProps {
  playlists: VendorPlaylistData[];
  onRemovePlaylist?: (playlistId: string) => void;
  isRemoving?: boolean;
  showHistoricalData?: boolean;
}

export function VendorOwnPlaylistView({
  playlists,
  onRemovePlaylist,
  isRemoving = false,
  showHistoricalData = false
}: VendorOwnPlaylistViewProps) {
  const allocatedPlaylists = playlists.filter(p => p.is_allocated);

  if (allocatedPlaylists.length === 0) {
    return (
      <div className="text-center py-8 border-2 border-dashed rounded-lg">
        <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <div className="text-lg font-semibold mb-2">No Playlists Allocated</div>
        <div className="text-sm text-muted-foreground">
          You don't have any playlists allocated to this campaign yet.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {allocatedPlaylists.map((playlist) => {
        const performancePercentage = playlist.allocated_streams > 0 
          ? (playlist.actual_streams / playlist.allocated_streams) * 100 
          : 0;
        
        const getPerformanceVariant = (percentage: number) => {
          if (percentage >= 90) return { variant: 'default' as const, color: 'text-green-600' };
          if (percentage >= 70) return { variant: 'secondary' as const, color: 'text-blue-600' };
          if (percentage >= 50) return { variant: 'outline' as const, color: 'text-yellow-600' };
          return { variant: 'destructive' as const, color: 'text-red-600' };
        };

        const performance = getPerformanceVariant(performancePercentage);

        return (
          <Card key={playlist.id} className="p-4 space-y-4">
            {/* Playlist Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-lg">{playlist.name}</h4>
                  {playlist.url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(playlist.url, '_blank')}
                      className="h-6 w-6 p-0"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {playlist.avg_daily_streams.toLocaleString()} daily streams
                  </span>
                  {playlist.follower_count && (
                    <span>{playlist.follower_count.toLocaleString()} followers</span>
                  )}
                </div>
              </div>
              {onRemovePlaylist && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemovePlaylist(playlist.id)}
                  disabled={isRemoving}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-2 border rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Allocated</div>
                <div className="font-semibold">{playlist.allocated_streams.toLocaleString()}</div>
              </div>
              <div className="text-center p-2 border rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Total Streams Driven</div>
                <div className="font-semibold">{playlist.actual_streams.toLocaleString()}</div>
              </div>
              <div className="text-center p-2 border rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Performance</div>
                <Badge variant={performance.variant} className="text-xs">
                  {performancePercentage.toFixed(0)}%
                </Badge>
              </div>
              {showHistoricalData && (
                <div className="text-center p-2 border rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">12 Months</div>
                  <div className="font-semibold text-xs">{playlist.twelve_month_streams.toLocaleString()}</div>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Campaign Progress</span>
                <span>{performancePercentage.toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(performancePercentage, 100)} className="h-2" />
            </div>

            {/* Daily Performance Chart */}
            {playlist.daily_data && playlist.daily_data.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Daily Streams (Last 30 Days)</div>
                <div className="h-24 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={playlist.daily_data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                      <XAxis 
                        dataKey="date" 
                        tick={false}
                        axisLine={false}
                      />
                      <YAxis hide />
                      <Tooltip 
                        labelFormatter={(date) => `Date: ${date}`}
                        formatter={(value) => [`${Number(value).toLocaleString()} streams`, 'Streams']}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="streams" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}








