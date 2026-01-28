"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { format } from "date-fns";
import { CalendarIcon, TrendingUp, BarChart3, Trash2, AlertCircle } from "lucide-react";
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

interface CurrentStreamData {
  streams_24h: number;
  streams_7d: number;
  streams_12m: number;
  last_scraped: string | null;
  campaign_id?: string | number | null;
  campaign_name?: string;
}

interface CampaignStreamSummary {
  campaign_id: string | number | null;
  campaign_name: string;
  entries_count: number;
  avg_24h: number;
  avg_7d: number;
  avg_12m: number;
  last_scraped: string | null;
}

interface PlaylistOverview {
  avg_daily_streams: number;
  follower_count: number;
  name: string;
  url: string | null;
  spotify_id: string | null;
}

export default function PerformanceHistoryModal({ 
  open, 
  onOpenChange, 
  playlistId, 
  playlistName 
}: PerformanceHistoryModalProps) {
  const queryClient = useQueryClient();
  
  const { data: queryResult, isLoading } = useQuery({
    queryKey: ["performance-entries", playlistId],
    queryFn: async (): Promise<{ entries: PerformanceEntry[]; currentData: CurrentStreamData[]; playlistOverview: PlaylistOverview | null; campaignSummaries: CampaignStreamSummary[] }> => {
      // First, get the playlist's own data from the playlists table
      const { data: playlistData, error: playlistError } = await supabase
        .from("playlists")
        .select("spotify_id, name, avg_daily_streams, follower_count, url")
        .eq("id", playlistId)
        .single();
      
      if (playlistError) {
        console.warn("Could not find playlist:", playlistError);
        return { entries: [], currentData: [], playlistOverview: null, campaignSummaries: [] };
      }
      
      // Build playlist overview from the playlists table (this is the playlist's own data)
      const playlistOverview: PlaylistOverview = {
        avg_daily_streams: playlistData.avg_daily_streams || 0,
        follower_count: playlistData.follower_count || 0,
        name: playlistData.name,
        url: playlistData.url,
        spotify_id: playlistData.spotify_id
      };
      
      // Strategy 1: Find campaign_playlists entries by spotify_id
      let campaignPlaylists: any[] = [];
      
      if (playlistData?.spotify_id) {
        const { data: cpBySpotifyId } = await supabase
          .from("campaign_playlists")
          .select("id, streams_24h, streams_7d, streams_12m, last_scraped, campaign_id")
          .eq("playlist_spotify_id", playlistData.spotify_id);
        
        if (cpBySpotifyId && cpBySpotifyId.length > 0) {
          campaignPlaylists = cpBySpotifyId;
        }
      }
      
      // Strategy 2: Fall back to matching by playlist name (case-insensitive)
      if (campaignPlaylists.length === 0 && playlistData?.name) {
        const { data: cpByName } = await supabase
          .from("campaign_playlists")
          .select("id, streams_24h, streams_7d, streams_12m, last_scraped, campaign_id")
          .ilike("playlist_name", playlistData.name);
        
        if (cpByName && cpByName.length > 0) {
          campaignPlaylists = cpByName;
        }
      }
      
      if (campaignPlaylists.length === 0) {
        console.log("No campaign_playlists found for playlist:", playlistData?.name);
        // Still return the playlist overview even if no campaign data
        return { entries: [], currentData: [], playlistOverview, campaignSummaries: [] };
      }
      
      const campaignPlaylistIds = campaignPlaylists.map(cp => cp.id);
      
      // Extract current stream data from campaign_playlists (track-specific data)
      const currentData: CurrentStreamData[] = campaignPlaylists.map(cp => ({
        streams_24h: cp.streams_24h || 0,
        streams_7d: cp.streams_7d || 0,
        streams_12m: cp.streams_12m || 0,
        last_scraped: cp.last_scraped,
        campaign_id: cp.campaign_id,
      }));

      const campaignIds = Array.from(new Set(campaignPlaylists.map(cp => cp.campaign_id).filter(Boolean)));
      let campaignNameById: Record<string, string> = {};
      if (campaignIds.length > 0) {
        const { data: campaignsData } = await supabase
          .from("spotify_campaigns")
          .select("id, campaign")
          .in("id", campaignIds);
        if (campaignsData) {
          campaignNameById = campaignsData.reduce((acc: Record<string, string>, campaign) => {
            acc[String(campaign.id)] = campaign.campaign || `Campaign ${campaign.id}`;
            return acc;
          }, {});
        }
      }

      const groupedByCampaign = currentData.reduce((acc: Record<string, CurrentStreamData[]>, item) => {
        const key = item.campaign_id ? String(item.campaign_id) : "unknown";
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {});

      const campaignSummaries: CampaignStreamSummary[] = Object.entries(groupedByCampaign).map(([campaignId, items]) => {
        const entries_count = items.length;
        const avg_24h = Math.round(items.reduce((sum, d) => sum + (d.streams_24h || 0), 0) / entries_count);
        const avg_7d = Math.round(items.reduce((sum, d) => sum + (d.streams_7d || 0), 0) / entries_count);
        const avg_12m = Math.round(items.reduce((sum, d) => sum + (d.streams_12m || 0), 0) / entries_count);
        const last_scraped = items
          .map((d) => d.last_scraped)
          .filter(Boolean)
          .sort()
          .slice(-1)[0] || null;

        return {
          campaign_id: campaignId === "unknown" ? null : campaignId,
          campaign_name: campaignId === "unknown" ? "Unknown Campaign" : (campaignNameById[campaignId] || `Campaign ${campaignId}`),
          entries_count,
          avg_24h,
          avg_7d,
          avg_12m,
          last_scraped,
        };
      });
      
      // Now fetch performance_entries for all matching campaign_playlists
      const { data, error } = await supabase
        .from("performance_entries")
        .select("*")
        .in("playlist_id", campaignPlaylistIds)
        .order("date_recorded", { ascending: false });
      
      if (error) throw error;
      
      console.log(`Found ${data?.length || 0} performance entries for playlist ${playlistData?.name}`);
      return { entries: data as PerformanceEntry[], currentData, playlistOverview, campaignSummaries };
    },
    enabled: open
  });
  
  const entries = queryResult?.entries || [];
  const currentData = queryResult?.currentData || [];
  const playlistOverview = queryResult?.playlistOverview || null;
  const campaignSummaries = queryResult?.campaignSummaries || [];
  
  // Check if playlist appears inactive (all zeros across all time ranges - campaign specific)
  const totalCurrentStreams = campaignSummaries.reduce((sum, d) => 
    sum + d.avg_24h + d.avg_7d + d.avg_12m, 0
  );
  const isInactivePlaylist = campaignSummaries.length > 0 && totalCurrentStreams === 0;

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
        ) : (
          <div className="space-y-6">
            {/* Playlist Overview - This is the playlist's own data */}
            {playlistOverview && (
              <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                <p className="text-sm font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Playlist Overview
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {playlistOverview.avg_daily_streams.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Avg Daily Streams</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {playlistOverview.follower_count.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Followers</div>
                  </div>
                </div>
                {playlistOverview.url && (
                  <div className="mt-3 text-center">
                    <a 
                      href={playlistOverview.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      View on Spotify →
                    </a>
                  </div>
                )}
              </div>
            )}
            
            {/* Show message if no campaign-specific data */}
            {entries.length === 0 && currentData.length === 0 && (
              <div className="text-center py-4 space-y-2">
                <p className="text-sm text-muted-foreground">No campaign-specific stream data found.</p>
                <p className="text-xs text-muted-foreground/70">
                  Campaign tracking data will appear when this playlist is scraped for active campaigns.
                </p>
              </div>
            )}
            
            {/* Campaign Track Data Section */}
            {currentData.length > 0 && (
              <>
                {/* Inactive Playlist Warning - only for campaign data */}
                {isInactivePlaylist && (
                  <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">No Campaign Track Data</p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                          The track(s) being monitored in this playlist show 0 streams. This typically means:
                        </p>
                        <ul className="text-xs text-amber-700 dark:text-amber-300 mt-2 list-disc list-inside space-y-1">
                          <li>The track was removed from this playlist</li>
                          <li>The playlist is no longer active for this campaign</li>
                          <li>The scraper couldn't find the specific track</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Track-Specific Stream Data from campaign_playlists */}
                <div className={`p-4 rounded-lg border ${isInactivePlaylist ? 'bg-muted/30 border-muted' : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'}`}>
                  <p className="text-sm font-medium mb-3">Campaign Track Streams (average per campaign)</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${isInactivePlaylist ? 'text-muted-foreground' : ''}`}>
                        {campaignSummaries.length > 0
                          ? Math.round(campaignSummaries.reduce((sum, d) => sum + d.avg_24h, 0) / campaignSummaries.length).toLocaleString()
                          : "0"}
                      </div>
                      <div className="text-xs text-muted-foreground">Last 24h</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${isInactivePlaylist ? 'text-muted-foreground' : ''}`}>
                        {campaignSummaries.length > 0
                          ? Math.round(campaignSummaries.reduce((sum, d) => sum + d.avg_7d, 0) / campaignSummaries.length).toLocaleString()
                          : "0"}
                      </div>
                      <div className="text-xs text-muted-foreground">Last 7 days</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${isInactivePlaylist ? 'text-muted-foreground' : ''}`}>
                        {campaignSummaries.length > 0
                          ? Math.round(campaignSummaries.reduce((sum, d) => sum + d.avg_12m, 0) / campaignSummaries.length).toLocaleString()
                          : "0"}
                      </div>
                      <div className="text-xs text-muted-foreground">Last 12 months</div>
                    </div>
                  </div>
                  {campaignSummaries[0]?.last_scraped && (
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      Last scraped: {format(new Date(campaignSummaries[0].last_scraped as string), "MMM dd, yyyy 'at' h:mm a")}
                    </p>
                  )}
                </div>

                {campaignSummaries.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Campaign Breakdown (averages)</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {campaignSummaries.map((summary) => (
                        <div key={`${summary.campaign_id}-${summary.campaign_name}`} className="flex items-center justify-between p-2 rounded-lg border bg-card">
                          <div className="space-y-1">
                            <div className="text-sm font-medium">{summary.campaign_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {summary.entries_count} track{summary.entries_count !== 1 ? "s" : ""} ·
                              {summary.last_scraped ? ` Last scraped ${format(new Date(summary.last_scraped), "MMM dd, yyyy")}` : " No scrape date"}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <Badge variant="secondary">24h {summary.avg_24h.toLocaleString()}</Badge>
                            <Badge variant="secondary">7d {summary.avg_7d.toLocaleString()}</Badge>
                            <Badge variant="secondary">12m {summary.avg_12m.toLocaleString()}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            
            {/* Historical Performance Entries */}
            {entries.length > 0 && (
              <>
                {/* Statistics Cards */}
                {stats && (
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average Daily</CardTitle>
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
                        <CardTitle className="text-sm font-medium">Peak Day</CardTitle>
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
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <p className="text-sm font-medium">Daily History</p>
                  {entries.map((entry) => (
                    <div 
                      key={entry.id} 
                      className="flex items-center justify-between p-2 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">
                          {format(new Date(entry.date_recorded), "MMM dd, yyyy")}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-sm">
                          {entry.daily_streams.toLocaleString()}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
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








