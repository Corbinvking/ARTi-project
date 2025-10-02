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
      const { data, error } = await supabase
        .from("performance_entries")
        .select("*")
        .eq("playlist_id", playlistId)
        .order("date_recorded", { ascending: false });
      
      if (error) throw error;
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

  // Calculate statistics
  const stats = entries ? {
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
          <div className="text-center py-8 text-muted-foreground">
            No performance entries found for this playlist.
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








