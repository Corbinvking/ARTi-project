"use client"

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Music, ExternalLink, X, TrendingUp, Users, CheckCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface VendorPlaylistData {
  id: string;
  name: string;
  url?: string;
  avg_daily_streams: number;
  follower_count?: number;
  allocated_streams: number;
  actual_streams: number;
  twelve_month_streams: number;
  streams_24h?: number;
  streams_7d?: number;
  daily_data: Array<{
    date: string;
    streams: number;
  }>;
  is_allocated: boolean;
  vendor_paid?: boolean;
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

  // Calculate totals
  const totals = allocatedPlaylists.reduce((acc, playlist) => ({
    streams_24h: acc.streams_24h + (playlist.streams_24h || 0),
    streams_7d: acc.streams_7d + (playlist.streams_7d || 0),
    streams_12m: acc.streams_12m + (playlist.twelve_month_streams || 0),
    actual_streams: acc.actual_streams + playlist.actual_streams,
    followers: acc.followers + (playlist.follower_count || 0)
  }), { streams_24h: 0, streams_7d: 0, streams_12m: 0, actual_streams: 0, followers: 0 });

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-muted/30 text-center">
          <div className="text-xs text-muted-foreground mb-1">Playlists</div>
          <div className="text-lg font-semibold">{allocatedPlaylists.length}</div>
        </div>
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-center">
          <div className="text-xs text-muted-foreground mb-1">24h Streams</div>
          <div className="text-lg font-semibold text-blue-600">{totals.streams_24h.toLocaleString()}</div>
        </div>
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-center">
          <div className="text-xs text-muted-foreground mb-1">7d Streams</div>
          <div className="text-lg font-semibold text-green-600">{totals.streams_7d.toLocaleString()}</div>
        </div>
        <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-center">
          <div className="text-xs text-muted-foreground mb-1">12m Streams</div>
          <div className="text-lg font-semibold text-purple-600">{totals.streams_12m.toLocaleString()}</div>
        </div>
      </div>

      {/* Playlists Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Playlist</TableHead>
              <TableHead className="text-center font-semibold">Followers</TableHead>
              <TableHead className="text-center font-semibold">24h</TableHead>
              <TableHead className="text-center font-semibold">7d</TableHead>
              <TableHead className="text-center font-semibold">12m</TableHead>
              <TableHead className="text-center font-semibold">Status</TableHead>
              {onRemovePlaylist && <TableHead className="w-10"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocatedPlaylists.map((playlist) => {
              const performancePercentage = playlist.allocated_streams > 0 
                ? (playlist.actual_streams / playlist.allocated_streams) * 100 
                : 0;

              return (
                <TableRow key={playlist.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-medium text-sm">{playlist.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {playlist.avg_daily_streams.toLocaleString()} avg/day
                        </div>
                      </div>
                      {playlist.url && playlist.url !== '#' && (
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
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 text-sm">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      {(playlist.follower_count || 0).toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-medium">
                      {(playlist.streams_24h || 0).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-medium">
                      {(playlist.streams_7d || 0).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-medium text-primary">
                      {(playlist.twelve_month_streams || 0).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {playlist.vendor_paid ? (
                      <Badge variant="default" className="bg-green-600 text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Paid
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Unpaid
                      </Badge>
                    )}
                  </TableCell>
                  {onRemovePlaylist && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemovePlaylist(playlist.id)}
                        disabled={isRemoving}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Total Row */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg text-sm">
        <span className="font-medium">Total ({allocatedPlaylists.length} playlists)</span>
        <div className="flex items-center gap-6">
          <span><span className="text-muted-foreground">24h:</span> <span className="font-semibold">{totals.streams_24h.toLocaleString()}</span></span>
          <span><span className="text-muted-foreground">7d:</span> <span className="font-semibold">{totals.streams_7d.toLocaleString()}</span></span>
          <span><span className="text-muted-foreground">12m:</span> <span className="font-semibold text-primary">{totals.streams_12m.toLocaleString()}</span></span>
        </div>
      </div>
    </div>
  );
}








