"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { format } from "date-fns";
import { CalendarIcon, TrendingUp, BarChart3, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { toast } from "sonner";

interface PerformanceHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlistId: string;
  playlistName: string;
}

interface PerformanceEntry {
  id: string;
  daily_streams: number;
  date_recorded: string;
  created_at: string;
}

export default function PerformanceHistoryModal({ 
  open, 
  onOpenChange, 
  playlistId, 
  playlistName 
}: PerformanceHistoryModalProps) {
  const queryClient = useQueryClient();
  
  const { data: entries, isLoading } = useQuery({
    queryKey: ["performance-entries", playlistId],
    queryFn: async () => {
      // First, get the spotify_id from the playlists table
      const { data: playlistData, error: playlistError } = await supabase
        .from("playlists")
        .select("spotify_id, name")
        .eq("id", playlistId)
        .single();
      
      if (playlistError) {
        console.warn("Could not find playlist:", playlistError);
        return [];
      }
      
      // Strategy 1: Find campaign_playlists entries by spotify_id
      let campaignPlaylistIds: string[] = [];
      
      if (playlistData?.spotify_id) {
        const { data: cpBySpotifyId } = await supabase
          .from("campaign_playlists")
          .select("id")
          .eq("playlist_spotify_id", playlistData.spotify_id);
        
        if (cpBySpotifyId && cpBySpotifyId.length > 0) {
          campaignPlaylistIds = cpBySpotifyId.map(cp => cp.id);
        }
      }
      
      // Strategy 2: Fall back to matching by playlist name (case-insensitive)
      if (campaignPlaylistIds.length === 0 && playlistData?.name) {
        const { data: cpByName } = await supabase
          .from("campaign_playlists")
          .select("id")
          .ilike("playlist_name", playlistData.name);
        
        if (cpByName && cpByName.length > 0) {
          campaignPlaylistIds = cpByName.map(cp => cp.id);
        }
      }
      
      if (campaignPlaylistIds.length === 0) {
        console.log("No campaign_playlists found for playlist:", playlistData?.name);
        return [];
      }
      
      // Now fetch performance_entries for all matching campaign_playlists
      const { data, error } = await supabase
        .from("performance_entries")
        .select("*")
        .in("playlist_id", campaignPlaylistIds)
        .order("date_recorded", { ascending: false });
      
      if (error) throw error;
      
      console.log(`Found ${data?.length || 0} performance entries for playlist ${playlistData?.name}`);
      return data as PerformanceEntry[];
    },
    enabled: open
  });

  const handleDeleteEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from("performance_entries")
        .delete()
        .eq("id", entryId);

      if (error) throw error;

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["performance-entries", playlistId] });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      
      toast.success("Performance entry deleted successfully");
    } catch (error) {
      console.error("Error deleting performance entry:", error);
      toast.error("Failed to delete performance entry");
    }
  };

  // Calculate statistics - handle edge cases for empty arrays
  const stats = entries && entries.length > 0 ? {
    totalEntries: entries.length,
    averageStreams: Math.round(entries.reduce((sum, entry) => sum + entry.daily_streams, 0) / entries.length),
    highestStreams: Math.max(...entries.map(entry => entry.daily_streams)),
    lowestStreams: Math.min(...entries.map(entry => entry.daily_streams)),
    totalStreams: entries.reduce((sum, entry) => sum + entry.daily_streams, 0)
  } : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Performance History - {playlistName}</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : entries?.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <p className="text-muted-foreground">No performance entries found for this playlist.</p>
            <p className="text-xs text-muted-foreground/70">
              Performance history is recorded automatically when campaigns are scraped.
              This playlist may not be part of any active campaign, or the scraper hasn't run yet.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Statistics Cards */}
            {stats && (
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Streams</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.averageStreams.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      Based on {stats.totalEntries} entries
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Peak Performance</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.highestStreams.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      Highest single day
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Entries List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {entries?.map((entry) => (
                <div 
                  key={entry.id} 
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {format(new Date(entry.date_recorded), "MMM dd, yyyy")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Added {format(new Date(entry.created_at), "MMM dd")}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <Badge variant="secondary" className="text-lg font-semibold">
                        {entry.daily_streams.toLocaleString()}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        streams
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}








