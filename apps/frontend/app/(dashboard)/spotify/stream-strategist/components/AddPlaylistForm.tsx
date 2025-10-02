"use client"

import { useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { useToast } from "../hooks/use-toast";

interface AddPlaylistFormProps {
  vendorId: string;
  onSuccess: () => void;
}

interface PlaylistData {
  name: string;
  genres: string[];
  followers: number;
}

export function AddPlaylistForm({ vendorId, onSuccess }: AddPlaylistFormProps) {
  const [url, setUrl] = useState('');
  const [autoData, setAutoData] = useState<PlaylistData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleUrlChange = async (newUrl: string) => {
    setUrl(newUrl);
    setAutoData(null);
    
    if (newUrl.includes('spotify.com/playlist/')) {
      setLoading(true);
      try {
        const { data } = await supabase.functions.invoke('spotify-fetch', {
          body: { playlistUrl: newUrl }
        });
        
        if (data) {
          setAutoData({
            name: data.name,
            genres: data.genres || [],
            followers: data.followers || 0
          });
        }
      } catch (error) {
        console.error('Failed to fetch playlist data:', error);
        toast({
          title: "Error",
          description: "Failed to fetch playlist data from Spotify",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async () => {
    if (!autoData || !url) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('playlists')
        .insert({
          vendor_id: vendorId,
          name: autoData.name,
          url: url,
          genres: autoData.genres,
          avg_daily_streams: 0,
          follower_count: autoData.followers
        });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Playlist added successfully"
      });
      
      onSuccess();
    } catch (error) {
      console.error('Failed to save playlist:', error);
      toast({
        title: "Error", 
        description: "Failed to save playlist",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Spotify Playlist URL</Label>
        <Input
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://open.spotify.com/playlist/..."
          className="mt-1"
        />
      </div>
      
      {loading && (
        <div className="p-4 bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground">Fetching playlist data...</p>
        </div>
      )}
      
      {autoData && (
        <>
          <div className="p-4 bg-card/50 rounded-lg space-y-3 border">
            <h4 className="font-semibold text-sm">Auto-fetched Data</h4>
            <div>
              <span className="text-sm font-medium">Name: </span>
              <span className="text-sm">{autoData.name}</span>
            </div>
            <div>
              <span className="text-sm font-medium">Followers: </span>
              <span className="text-sm">{autoData.followers.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-sm font-medium">Genres: </span>
              <div className="flex gap-1 mt-1">
                {autoData.genres.length > 0 ? autoData.genres.map(g => (
                  <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>
                )) : (
                  <span className="text-xs text-muted-foreground">No genres detected</span>
                )}
              </div>
            </div>
          </div>
          
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full bg-gradient-primary hover:opacity-80"
          >
            {saving ? "Adding..." : "Add Playlist"}
          </Button>
        </>
      )}
      
      {url && !loading && !autoData && url.includes('spotify.com/playlist/') && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">Unable to fetch playlist data. Please check the URL.</p>
        </div>
      )}
    </div>
  );
}








