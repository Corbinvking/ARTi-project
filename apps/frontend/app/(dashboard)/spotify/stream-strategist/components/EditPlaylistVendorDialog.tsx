"use client"

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '../hooks/use-toast';
import { supabase } from '../integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface EditPlaylistVendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlist: any; // campaign_playlists record
  campaignId: string; // campaign_group.id
}

export function EditPlaylistVendorDialog({ 
  open, 
  onOpenChange, 
  playlist,
  campaignId 
}: EditPlaylistVendorDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [vendorId, setVendorId] = useState<string>('');
  const [playlistCurator, setPlaylistCurator] = useState('');
  const [isAlgorithmic, setIsAlgorithmic] = useState(false);

  // Fetch all vendors
  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Initialize form values when playlist changes
  useEffect(() => {
    if (playlist) {
      setVendorId(playlist.vendor_id || '');
      setPlaylistCurator(playlist.playlist_curator || '');
      setIsAlgorithmic(playlist.is_algorithmic || false);
    }
  }, [playlist]);

  // When vendor changes, update curator name
  const handleVendorChange = (newVendorId: string) => {
    setVendorId(newVendorId);
    const vendor = vendors.find(v => v.id === newVendorId);
    if (vendor) {
      setPlaylistCurator(vendor.name);
      setIsAlgorithmic(false);
    }
  };

  // When algorithmic changes, clear vendor
  const handleAlgorithmicChange = (checked: boolean) => {
    setIsAlgorithmic(checked);
    if (checked) {
      setVendorId('');
      setPlaylistCurator('Spotify');
    } else {
      // If unchecking algorithmic, try to set a vendor
      if (vendors.length > 0) {
        setVendorId(vendors[0].id);
        setPlaylistCurator(vendors[0].name);
      }
    }
  };

  const handleSave = async () => {
    if (!playlist) {
      toast({
        title: "Error",
        description: "No playlist selected",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    
    try {
      // Update the campaign_playlists record
      const { error } = await supabase
        .from('campaign_playlists')
        .update({
          vendor_id: vendorId || null,
          playlist_curator: playlistCurator || null,
          is_algorithmic: isAlgorithmic,
          updated_at: new Date().toISOString()
        })
        .eq('id', playlist.id);

      if (error) throw error;

      // Invalidate all queries that depend on this playlist
      queryClient.invalidateQueries({ queryKey: ['campaign-playlists', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-groups'] });
      
      toast({
        title: "Success",
        description: "Playlist vendor association updated successfully",
      });
      
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to update playlist vendor:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update playlist vendor association",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Early return if no playlist
  if (!playlist) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Playlist Vendor</DialogTitle>
          <DialogDescription>
            Update the vendor association for this playlist. Changes will be reflected across all campaigns.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Playlist Name (read-only) */}
          <div className="space-y-2">
            <Label>Playlist Name</Label>
            <Input 
              value={playlist?.playlist_name || ''} 
              disabled 
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              This is the playlist name as it appears in Spotify for Artists
            </p>
          </div>

          {/* Is Algorithmic Switch */}
          <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="algorithmic">Spotify Algorithmic Playlist</Label>
              <p className="text-xs text-muted-foreground">
                Check this if this is a Spotify-curated playlist (Radio, Discover Weekly, etc.)
              </p>
            </div>
            <Switch
              id="algorithmic"
              checked={isAlgorithmic}
              onCheckedChange={handleAlgorithmicChange}
            />
          </div>

          {/* Vendor Selection (disabled if algorithmic) */}
          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor</Label>
            <Select 
              value={vendorId} 
              onValueChange={handleVendorChange}
              disabled={isAlgorithmic || vendorsLoading}
            >
              <SelectTrigger id="vendor">
                <SelectValue placeholder={vendorsLoading ? "Loading..." : "Select vendor"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {isAlgorithmic 
                ? "Algorithmic playlists are automatically assigned to Spotify"
                : "Select the vendor who manages this playlist"
              }
            </p>
          </div>

          {/* Curator Display Name (disabled if algorithmic) */}
          <div className="space-y-2">
            <Label htmlFor="curator">Curator Display Name</Label>
            <Input 
              id="curator"
              value={playlistCurator} 
              onChange={(e) => setPlaylistCurator(e.target.value)}
              disabled={isAlgorithmic}
              placeholder="e.g., Club Restricted, Spotify"
            />
            <p className="text-xs text-muted-foreground">
              {isAlgorithmic 
                ? "Algorithmic playlists use 'Spotify' as the curator"
                : "How the curator/vendor name should appear in reports"
              }
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || (!vendorId && !isAlgorithmic)}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

