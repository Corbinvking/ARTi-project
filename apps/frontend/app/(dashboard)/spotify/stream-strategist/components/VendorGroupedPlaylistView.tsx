"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Music, TrendingUp, Calendar, ExternalLink, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PlaylistData {
  id: string;
  name: string;
  url: string;
  allocated_streams: number;
  actual_streams: number;
  twelve_month_streams: number;
  daily_data: Array<{
    date: string;
    streams: number;
  }>;
  is_allocated: boolean;
}

interface VendorData {
  vendor_id: string;
  vendor_name: string;
  total_daily_streams: number;
  total_twelve_month_streams: number;
  playlists: PlaylistData[];
}

interface VendorGroupedPlaylistViewProps {
  vendorData: VendorData[];
  onRemovePlaylist?: (playlistId: string) => void;
  isRemoving?: boolean;
  showHistoricalData?: boolean;
}

export function VendorGroupedPlaylistView({ 
  vendorData, 
  onRemovePlaylist, 
  isRemoving = false,
  showHistoricalData = true
}: VendorGroupedPlaylistViewProps) {
  return (
    <div className="space-y-6">
      {vendorData.map((vendor) => (
        <Card key={vendor.vendor_id} className="border-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                {vendor.vendor_name}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  {vendor.total_daily_streams.toLocaleString()} daily streams
                </div>
                {showHistoricalData && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {vendor.total_twelve_month_streams.toLocaleString()} (12 months)
                  </div>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {vendor.playlists.map((playlist) => {
              const performanceScore = playlist.allocated_streams > 0 
                ? (playlist.actual_streams / playlist.allocated_streams) * 100 
                : 0;
              
              const getPerformanceColor = (score: number) => {
                if (score >= 100) return 'text-green-600';
                if (score >= 80) return 'text-blue-600';
                if (score >= 60) return 'text-yellow-600';
                return 'text-red-600';
              };

              return (
                <div key={playlist.id} className="border rounded-lg p-4 bg-card">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{playlist.name}</h4>
                        <a 
                          href={playlist.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                       <div className="flex items-center gap-4 text-sm text-muted-foreground">
                         <span>
                           Total Streams Driven: {playlist.actual_streams.toLocaleString()} / {playlist.allocated_streams.toLocaleString()}
                         </span>
                        {showHistoricalData && (
                          <span>
                            {playlist.twelve_month_streams.toLocaleString()} (12mo total)
                          </span>
                        )}
                        <Badge 
                          variant="outline" 
                          className={getPerformanceColor(performanceScore)}
                        >
                          {performanceScore.toFixed(1)}% performance
                        </Badge>
                      </div>
                    </div>
                    
                    {onRemovePlaylist && playlist.is_allocated && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemovePlaylist(playlist.id)}
                        disabled={isRemoving}
                        className="h-8 w-8 p-0 hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  {playlist.allocated_streams > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Campaign Progress</span>
                        <span>{Math.min(performanceScore, 100).toFixed(1)}%</span>
                      </div>
                      <Progress 
                        value={Math.min(performanceScore, 100)} 
                        className="h-2"
                      />
                    </div>
                  )}

                  {playlist.daily_data && playlist.daily_data.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-muted-foreground mb-2">
                        Daily Streams (Last 30 Days)
                      </div>
                      <div className="h-20">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={playlist.daily_data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis 
                              dataKey="date" 
                              tick={false}
                              axisLine={false}
                            />
                            <YAxis hide />
                            <Tooltip 
                              labelFormatter={(label) => `Date: ${label}`}
                              formatter={(value) => [`${value} streams`, 'Streams']}
                              contentStyle={{
                                backgroundColor: 'var(--popover)',
                                border: '1px solid var(--border)',
                                borderRadius: '6px'
                              }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="streams" 
                              stroke="hsl(var(--primary))" 
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {vendor.playlists.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No playlists from this vendor</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      
      {vendorData.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Vendor Performance Data</h3>
            <p className="text-muted-foreground">
              Performance data will appear here once campaigns start collecting stream data.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}








