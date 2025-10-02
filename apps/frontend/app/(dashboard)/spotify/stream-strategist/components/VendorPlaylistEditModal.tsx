"use client"

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { useUpdatePlaylist, useDeletePlaylist } from '../hooks/useVendorPlaylists';
import { toast } from 'sonner';

interface VendorPlaylistEditModalProps {
  playlist: any;
  isOpen: boolean;
  onClose: () => void;
}

export function VendorPlaylistEditModal({ playlist, isOpen, onClose }: VendorPlaylistEditModalProps) {
  const updateMutation = useUpdatePlaylist();
  const deleteMutation = useDeletePlaylist();
  
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    genres: [] as string[],
    avg_daily_streams: 0,
    follower_count: 0
  });
  const [genreInput, setGenreInput] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (playlist) {
      setFormData({
        name: playlist.name || '',
        url: playlist.url || '',
        genres: playlist.genres || [],
        avg_daily_streams: playlist.avg_daily_streams || 0,
        follower_count: playlist.follower_count || 0
      });
    }
  }, [playlist]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlist?.id) return;

    if (!formData.name || !formData.url) {
      toast.error('Name and URL are required');
      return;
    }

    updateMutation.mutate({
      id: playlist.id,
      ...formData
    }, {
      onSuccess: () => {
        onClose();
        toast.success('Playlist updated successfully');
      }
    });
  };

  const handleDelete = async () => {
    if (!playlist?.id) return;
    
    deleteMutation.mutate(playlist.id, {
      onSuccess: () => {
        setShowDeleteDialog(false);
        onClose();
        toast.success('Playlist deleted successfully');
      }
    });
  };

  const addGenre = () => {
    if (genreInput.trim() && !formData.genres.includes(genreInput.trim())) {
      setFormData(prev => ({
        ...prev,
        genres: [...prev.genres, genreInput.trim()]
      }));
      setGenreInput('');
    }
  };

  const removeGenre = (genre: string) => {
    setFormData(prev => ({
      ...prev,
      genres: prev.genres.filter(g => g !== genre)
    }));
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Playlist</DialogTitle>
            <DialogDescription>
              Update your playlist information and manage genres.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-url" className="text-right">Spotify URL</Label>
                <Input
                  id="edit-url"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  className="col-span-3"
                  placeholder="https://open.spotify.com/playlist/..."
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-streams" className="text-right">Daily Streams</Label>
                <div className="col-span-3 space-y-1">
                  <Input
                    id="edit-streams"
                    type="number"
                    value={formData.avg_daily_streams}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Auto-calculated from Spotify data</p>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-followers" className="text-right">Followers</Label>
                <Input
                  id="edit-followers"
                  type="number"
                  value={formData.follower_count}
                  onChange={(e) => setFormData(prev => ({ ...prev, follower_count: parseInt(e.target.value) || 0 }))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right">Genres</Label>
                <div className="col-span-3 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={genreInput}
                      onChange={(e) => setGenreInput(e.target.value)}
                      placeholder="Add genre"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addGenre())}
                    />
                    <Button type="button" onClick={addGenre} size="sm">Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {formData.genres.map((genre) => (
                      <Badge key={genre} variant="secondary" className="cursor-pointer" onClick={() => removeGenre(genre)}>
                        {genre} ×
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="flex justify-between">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Playlist
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Updating...' : 'Update Playlist'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Playlist</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{playlist?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}








