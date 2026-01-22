"use client"

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { supabase } from "../integrations/supabase/client";
import { useToast } from "../hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

interface AddPerformanceEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlistId: string;
  playlistName: string;
}

export default function AddPerformanceEntryModal({ 
  open, 
  onOpenChange, 
  playlistId, 
  playlistName 
}: AddPerformanceEntryModalProps) {
  const [formData, setFormData] = useState({
    daily_streams: "",
    date_recorded: new Date(),
  });
  const [dateOpen, setDateOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addEntryMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // First, get the spotify_id from the playlists table
      const { data: playlistData, error: playlistError } = await supabase
        .from("playlists")
        .select("spotify_id, name")
        .eq("id", playlistId)
        .single();
      
      if (playlistError) {
        throw new Error(`Could not find playlist: ${playlistError.message}`);
      }
      
      // Find a campaign_playlists entry for this playlist
      let campaignPlaylistId: string | null = null;
      
      // Strategy 1: Match by spotify_id
      if (playlistData?.spotify_id) {
        const { data: cpBySpotifyId } = await supabase
          .from("campaign_playlists")
          .select("id")
          .eq("playlist_spotify_id", playlistData.spotify_id)
          .limit(1);
        
        if (cpBySpotifyId && cpBySpotifyId.length > 0) {
          campaignPlaylistId = cpBySpotifyId[0].id;
        }
      }
      
      // Strategy 2: Fall back to matching by name
      if (!campaignPlaylistId && playlistData?.name) {
        const { data: cpByName } = await supabase
          .from("campaign_playlists")
          .select("id")
          .ilike("playlist_name", playlistData.name)
          .limit(1);
        
        if (cpByName && cpByName.length > 0) {
          campaignPlaylistId = cpByName[0].id;
        }
      }
      
      if (!campaignPlaylistId) {
        throw new Error("This playlist is not part of any active campaign. Performance entries can only be added for playlists that are assigned to campaigns.");
      }
      
      console.log("Adding performance entry:", {
        playlist_id: campaignPlaylistId,
        daily_streams: parseInt(data.daily_streams),
        date_recorded: format(data.date_recorded, 'yyyy-MM-dd'),
      });
      
      const { data: result, error } = await supabase.from("performance_entries").insert({
        playlist_id: campaignPlaylistId,
        daily_streams: parseInt(data.daily_streams),
        date_recorded: format(data.date_recorded, 'yyyy-MM-dd'),
      }).select();
      
      console.log("Insert result:", result, "Error:", error);
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-entries", playlistId] });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      queryClient.invalidateQueries({ queryKey: ["all-playlists"] });
      toast({
        title: "Success",
        description: "Performance entry added successfully",
      });
      onOpenChange(false);
      setFormData({ daily_streams: "", date_recorded: new Date() });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add performance entry",
        variant: "destructive",
      });
      console.error("Error adding performance entry:", error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.daily_streams) {
      toast({
        title: "Error",
        description: "Please enter daily streams",
        variant: "destructive",
      });
      return;
    }
    addEntryMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Performance Entry - {playlistName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="daily_streams">Daily Streams</Label>
            <Input
              id="daily_streams"
              type="number"
              value={formData.daily_streams}
              onChange={(e) => setFormData({ ...formData, daily_streams: e.target.value })}
              placeholder="e.g. 1500"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Date Recorded</Label>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(formData.date_recorded, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.date_recorded}
                  onSelect={(date) => { if (date) { setFormData({ ...formData, date_recorded: date }); setDateOpen(false); } }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addEntryMutation.isPending}>
              {addEntryMutation.isPending ? "Adding..." : "Add Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}








