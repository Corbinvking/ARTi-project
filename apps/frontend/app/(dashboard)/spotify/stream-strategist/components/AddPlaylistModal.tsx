"use client"

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { MultiSelect } from "./ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { supabase } from "../integrations/supabase/client";
import { useToast } from "../hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { UNIFIED_GENRES } from "../lib/constants";
import { AddPlaylistForm } from "./AddPlaylistForm";

interface AddPlaylistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId?: string | null;
  editingPlaylist?: any;
}

export default function AddPlaylistModal({ open, onOpenChange, vendorId, editingPlaylist }: AddPlaylistModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    genres: [] as string[],
    avg_daily_streams: "",
    follower_count: "",
    vendor_id: vendorId || "",
  });

  // Pre-populate form when editing
  useEffect(() => {
    if (editingPlaylist) {
      setFormData({
        name: editingPlaylist.name || "",
        url: editingPlaylist.url || "",
        genres: editingPlaylist.genres || [],
        avg_daily_streams: editingPlaylist.avg_daily_streams?.toString() || "",
        follower_count: editingPlaylist.follower_count?.toString() || "",
        vendor_id: editingPlaylist.vendor_id || vendorId || "",
      });
    } else {
      setFormData({ 
        name: "", 
        url: "", 
        genres: [], 
        avg_daily_streams: "", 
        follower_count: "",
        vendor_id: vendorId || "",
      });
    }
  }, [editingPlaylist, open, vendorId]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch active vendors for selection when vendorId is not provided
  const { data: vendors } = useQuery({
    queryKey: ['active-vendors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !vendorId, // Only fetch when we need vendor selection
  });

  const playlistMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const playlistData = {
        vendor_id: data.vendor_id || vendorId,
        name: data.name,
        url: data.url,
        genres: data.genres,
        avg_daily_streams: parseInt(data.avg_daily_streams) || 0,
        follower_count: parseInt(data.follower_count) || 0,
      };

      if (editingPlaylist) {
        // Update existing playlist
        const { error } = await supabase
          .from("playlists")
          .update(playlistData)
          .eq("id", editingPlaylist.id);
        if (error) throw error;
      } else {
        // Insert new playlist
        const { error } = await supabase.from("playlists").insert(playlistData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      // Invalidate all playlist-related queries
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-playlists"] });
      queryClient.invalidateQueries({ queryKey: ["all-playlists"] });
      queryClient.invalidateQueries({ queryKey: ["my-playlists"] });
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      
      toast({
        title: "Success",
        description: editingPlaylist ? "Playlist updated successfully" : "Playlist added successfully",
      });
      onOpenChange(false);
      // Reset form for new playlists only
      if (!editingPlaylist) {
        setFormData({ 
          name: "", 
          url: "", 
          genres: [], 
          avg_daily_streams: "", 
          follower_count: "",
          vendor_id: vendorId || "",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: editingPlaylist ? "Failed to update playlist" : "Failed to add playlist",
        variant: "destructive",
      });
      console.error(`Error ${editingPlaylist ? 'updating' : 'adding'} playlist:`, error);
    },
  });

  // Function to extract playlist ID from Spotify URL
  const extractPlaylistId = (url: string) => {
    const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  };

  // Auto-populate playlist data from Spotify API
  const handleUrlPaste = async (url: string) => {
    const playlistId = extractPlaylistId(url);
    if (!playlistId) return;

    setIsLoading(true);
    try {
      // Call Spotify API edge function
      const { data, error } = await supabase.functions.invoke('spotify-playlist-fetch', {
        body: { playlistId }
      });

      if (error) throw error;

      if (data) {
        setFormData(prev => ({
          ...prev,
          name: data.name || prev.name,
          follower_count: data.followers?.toString() || prev.follower_count,
          genres: data.genres || prev.genres,
        }));
        
        toast({
          title: "Playlist data loaded",
          description: "Auto-populated from Spotify",
        });
      }
    } catch (error) {
      console.error("Error fetching playlist data:", error);
      toast({
        title: "Note",
        description: "Could not auto-populate data. Please enter manually.",
        variant: "default",
      });
    }
    setIsLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔍 Submit clicked - validating form data:', formData);
    
    // Basic validation - only name, url, and vendor are truly required
    if (!formData.name || !formData.url || !formData.vendor_id) {
      console.log('❌ Validation failed: missing required fields');
      toast({
        title: "Validation Error",
        description: "Please fill in playlist name, URL, and select a vendor",
        variant: "destructive",
      });
      return;
    }
    
    // For new playlists, require at least one genre
    if (!editingPlaylist && formData.genres.length === 0) {
      console.log('❌ Validation failed: new playlist requires genres');
      toast({
        title: "Genres Required",
        description: "Please select at least one genre for new playlists",
        variant: "destructive",
      });
      return;
    }
    
    console.log('✅ Validation passed - submitting mutation');
    playlistMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingPlaylist ? "Edit Playlist" : "Add New Playlist"}
          </DialogTitle>
          <DialogDescription>
            {editingPlaylist ? "Update playlist information" : "Enter Spotify URL to auto-fetch playlist data"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!vendorId && (
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor *</Label>
              <Select 
                value={formData.vendor_id} 
                onValueChange={(value) => setFormData({ ...formData, vendor_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors?.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="url">Spotify Playlist URL *</Label>
            <Input
              id="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              onBlur={(e) => handleUrlPaste(e.target.value)}
              placeholder="https://open.spotify.com/playlist/..."
              disabled={isLoading}
            />
            {isLoading && <p className="text-sm text-muted-foreground">Loading playlist data...</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="name">Playlist Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter playlist name"
            />
          </div>

          <div className="space-y-2">
            <Label>Genres * (max 4)</Label>
            <MultiSelect
              options={UNIFIED_GENRES}
              selected={formData.genres}
              onChange={(genres) => setFormData({ ...formData, genres })}
              placeholder="Select up to 4 genres"
              max={4}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="streams">Avg Daily Streams</Label>
              <Input
                id="streams"
                type="number"
                value={formData.avg_daily_streams}
                placeholder="Auto-calculated from Spotify"
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Daily streams are automatically calculated from Spotify data</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="followers">Followers</Label>
              <Input
                id="followers"
                type="number"
                value={formData.follower_count}
                onChange={(e) => setFormData({ ...formData, follower_count: e.target.value })}
                placeholder="e.g. 50000"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={playlistMutation.isPending || isLoading}>
              {playlistMutation.isPending 
                ? (editingPlaylist ? "Updating..." : "Adding...") 
                : (editingPlaylist ? "Update Playlist" : "Add Playlist")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}








