"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X, CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { useSalespeople } from '../hooks/useSalespeople';
import { useClients } from '../hooks/useClients';
import { ClientSelector } from './ClientSelector';
import { UNIFIED_GENRES, APP_CAMPAIGN_SOURCE, APP_CAMPAIGN_TYPE } from '../lib/constants';

interface Campaign {
  id: string;
  name: string;
  client: string;
  client_name?: string;
  client_id?: string;
  track_url?: string;
  status: string;
  stream_goal: number;
  budget: number;
  sub_genre: string;
  start_date: string;
  duration_days: number;
  daily_streams?: number;
  weekly_streams?: number;
  remaining_streams?: number;
  salesperson?: string;
  playlists?: Array<{ 
    id?: string; 
    name: string; 
    url?: string; 
    vendor_name?: string; 
    vendor?: any; 
    genres?: string[];
    follower_count?: number;
    avg_daily_streams?: number;
    status?: string;
  }>;
}

interface EditCampaignModalProps {
  campaign: Campaign;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditCampaignModal({ campaign, open, onClose, onSuccess }: EditCampaignModalProps) {
  const [formData, setFormData] = useState({
    name: campaign.name,
    client_id: campaign.client_id || '',
    client_name: campaign.client_name || campaign.client,
    track_url: campaign.track_url || '',
    status: campaign.status,
    stream_goal: campaign.stream_goal,
    budget: campaign.budget,
    sub_genre: campaign.sub_genre,
    start_date: campaign.start_date,
    duration_days: campaign.duration_days,
    daily_streams: campaign.daily_streams || 0,
    weekly_streams: campaign.weekly_streams || 0,
    remaining_streams: campaign.remaining_streams || campaign.stream_goal,
    salesperson: campaign.salesperson || '',
    playlists: campaign.playlists || []
  });
  const [saving, setSaving] = useState(false);
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
  const [availablePlaylists, setAvailablePlaylists] = useState<any[]>([]);
  const [playlistSearch, setPlaylistSearch] = useState('');
  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(formData.start_date ? new Date(`${formData.start_date}T12:00:00`) : undefined);
  const { toast } = useToast();
  const { data: salespeople = [] } = useSalespeople();
  const { data: clients = [] } = useClients();

  useEffect(() => {
    if (open) {
      fetchAvailablePlaylists();
      hydrateExistingPlaylists();
    }
  }, [open, campaign.id]);

  const fetchAvailablePlaylists = async () => {
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select(`
          *,
          vendor:vendors(name)
        `)
        .order('name');
      
      if (error) throw error;
      setAvailablePlaylists(data || []);
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
    }
  };

  const hydrateExistingPlaylists = async () => {
    if (!campaign.id) return;
    
    try {
      // Fetch the full campaign record to get selected_playlists
      const { data: campaignData, error } = await supabase
        .from('campaigns')
        .select('selected_playlists, algorithm_recommendations')
        .eq('id', campaign.id)
        .single();

      if (error) throw error;

      let hydratedPlaylists = [];

      // First try selected_playlists
      if (campaignData?.selected_playlists && Array.isArray(campaignData.selected_playlists) && campaignData.selected_playlists.length > 0) {
        const isStringArray = typeof campaignData.selected_playlists[0] === 'string';
        
        if (isStringArray) {
          // Fetch full playlist details for string IDs
          const playlistIds = campaignData.selected_playlists.filter((id): id is string => typeof id === 'string');
          const { data: playlistDetails } = await supabase
            .from('playlists')
            .select(`*, vendor:vendors(name)`)
            .in('id', playlistIds);
            
          if (playlistDetails) {
            hydratedPlaylists = playlistIds.map((id: string) => {
              const playlist = playlistDetails.find(p => p.id === id);
              return {
                id,
                name: playlist?.name || 'Unknown Playlist',
                url: playlist?.url || '',
                vendor_name: playlist?.vendor?.name || 'Unknown Vendor',
                follower_count: playlist?.follower_count || 0,
                avg_daily_streams: playlist?.avg_daily_streams || 0,
                genres: playlist?.genres || [],
                status: 'Selected'
              };
            }).filter(Boolean);
          }
        } else {
          // Already objects, normalize and add missing fields
          const playlistIds = campaignData.selected_playlists.map((p: any) => p.id).filter(Boolean);
          if (playlistIds.length > 0) {
            const { data: playlistDetails } = await supabase
              .from('playlists')
              .select(`*, vendor:vendors(name)`)
              .in('id', playlistIds);
              
            hydratedPlaylists = campaignData.selected_playlists.map((playlist: any) => {
              const fullPlaylist = playlistDetails?.find(p => p.id === playlist.id);
              return {
                ...playlist,
                vendor_name: playlist.vendor_name || fullPlaylist?.vendor?.name || 'Unknown Vendor',
                follower_count: fullPlaylist?.follower_count || 0,
                avg_daily_streams: fullPlaylist?.avg_daily_streams || 0,
                genres: fullPlaylist?.genres || playlist.genres || []
              };
            });
          }
        }
      } else if (campaignData?.algorithm_recommendations) {
        // Fallback to algorithm recommendations
        const allocations = (campaignData.algorithm_recommendations as any)?.allocations;
        if (allocations && Array.isArray(allocations)) {
          const playlistIds = allocations.map((a: any) => a.playlistId).filter(Boolean);
          if (playlistIds.length > 0) {
            const { data: playlistDetails } = await supabase
              .from('playlists')
              .select(`*, vendor:vendors(name)`)
              .in('id', playlistIds);
              
            if (playlistDetails) {
              hydratedPlaylists = allocations.map((allocation: any) => {
                const playlist = playlistDetails.find(p => p.id === allocation.playlistId);
                return {
                  id: allocation.playlistId,
                  name: playlist?.name || 'Unknown Playlist',
                  url: playlist?.url || '',
                  vendor_name: playlist?.vendor?.name || 'Unknown Vendor',
                  follower_count: playlist?.follower_count || 0,
                  avg_daily_streams: playlist?.avg_daily_streams || 0,
                  genres: playlist?.genres || [],
                  status: 'Algorithm Generated'
                };
              }).filter(Boolean);
            }
          }
        }
      }

      setFormData(prev => ({
        ...prev,
        playlists: hydratedPlaylists
      }));
    } catch (error) {
      console.error('Failed to hydrate existing playlists:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          name: formData.name,
          client_id: formData.client_id || null,
          client_name: formData.client_name,
          track_url: formData.track_url,
          status: formData.status,
          stream_goal: formData.stream_goal,
          budget: formData.budget,
          sub_genre: formData.sub_genre,
          start_date: formData.start_date,
          duration_days: formData.duration_days,
          daily_streams: formData.daily_streams,
          weekly_streams: formData.weekly_streams,
          remaining_streams: formData.remaining_streams,
          salesperson: formData.salesperson,
          selected_playlists: formData.playlists.map(playlist => ({
            id: playlist.id,
            name: playlist.name,
            url: playlist.url,
            vendor_name: playlist.vendor_name || playlist.vendor?.name,
            follower_count: playlist.follower_count || 0,
            avg_daily_streams: playlist.avg_daily_streams || 0,
            genres: playlist.genres,
            status: playlist.status || 'Pending'
          }))
        })
        .eq('id', campaign.id)
        .eq('source', APP_CAMPAIGN_SOURCE)
        .eq('campaign_type', APP_CAMPAIGN_TYPE);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Campaign updated successfully",
      });
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update campaign",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Campaign</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Campaign Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <Label>Client</Label>
              <ClientSelector
                value={formData.client_id}
                onChange={(clientId) => {
                  const client = clients?.find(c => c.id === clientId);
                  setFormData({
                    ...formData, 
                    client_id: clientId,
                    client_name: client?.name || formData.client_name
                  });
                }}
                placeholder="Select client..."
                allowCreate={true}
              />
            </div>
            <div>
              <Label>Salesperson</Label>
              <Select 
                value={formData.salesperson}
                onValueChange={(value) => setFormData({...formData, salesperson: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select salesperson" />
                </SelectTrigger>
                <SelectContent>
                  {salespeople
                    .filter(sp => sp.is_active)
                    .map(salesperson => (
                      <SelectItem key={salesperson.id} value={salesperson.email || salesperson.name}>
                        {salesperson.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Track URL field */}
            <div className="col-span-2">
              <Label>Spotify Track URL</Label>
              <Input 
                value={formData.track_url} 
                onChange={(e) => setFormData({...formData, track_url: e.target.value})}
                placeholder="https://open.spotify.com/track/..."
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select 
                value={formData.status}
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stream Goal</Label>
              <Input
                type="number"
                value={formData.stream_goal}
                onChange={(e) => setFormData({...formData, stream_goal: parseInt(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Budget ($)</Label>
              <Input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({...formData, budget: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Duration (Days)</Label>
              <Input
                type="number"
                value={formData.duration_days}
                onChange={(e) => setFormData({...formData, duration_days: parseInt(e.target.value) || 90})}
              />
            </div>
          </div>
          
          {/* Streaming Data Fields */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Streaming Data</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Daily Streams</Label>
                <Input 
                  type="number" 
                  value={formData.daily_streams} 
                  onChange={(e) => setFormData({...formData, daily_streams: parseInt(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label>Weekly Streams</Label>
                <Input 
                  type="number" 
                  value={formData.weekly_streams} 
                  onChange={(e) => setFormData({...formData, weekly_streams: parseInt(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label>Remaining Streams</Label>
                <Input 
                  type="number" 
                  value={formData.remaining_streams} 
                  onChange={(e) => setFormData({...formData, remaining_streams: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
          </div>
          
          {/* Playlist Management */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex justify-between items-center">
              <Label className="text-base font-semibold">Campaign Playlists</Label>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowPlaylistSelector(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Playlist
              </Button>
            </div>
            
            {formData.playlists && formData.playlists.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {formData.playlists.map((playlist, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-zinc-900 rounded">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {typeof playlist === 'string' ? playlist : playlist.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {typeof playlist !== 'string' && playlist.vendor_name && (
                          <>
                            {playlist.vendor_name}
                            {playlist.follower_count > 0 && ` • ${playlist.follower_count.toLocaleString()} followers`}
                            {playlist.avg_daily_streams > 0 && ` • ${playlist.avg_daily_streams.toLocaleString()} daily streams`}
                          </>
                        )}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        const newPlaylists = formData.playlists.filter((_, i) => i !== idx);
                        setFormData({...formData, playlists: newPlaylists});
                      }}
                    >
                      <X className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No playlists assigned</p>
            )}
          </div>
          
          <div>
            <Label>Sub-Genre</Label>
            <Select 
              value={formData.sub_genre}
              onValueChange={(value) => setFormData({...formData, sub_genre: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNIFIED_GENRES.map(genre => (
                  <SelectItem key={genre} value={genre}>
                    {genre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Start Date</Label>
            <Popover open={isStartDateOpen} onOpenChange={setIsStartDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    setStartDate(date || undefined);
                    if (date) {
                      setFormData({ ...formData, start_date: format(date, 'yyyy-MM-dd') });
                      setIsStartDateOpen(false);
                    }
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Playlist Selector Modal */}
      <Dialog open={showPlaylistSelector} onOpenChange={setShowPlaylistSelector}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select Playlists</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search playlists..."
              value={playlistSearch}
              onChange={(e) => setPlaylistSearch(e.target.value)}
            />
            <div className="max-h-96 overflow-y-auto space-y-2">
              {availablePlaylists
                .filter(p => !formData.playlists.some(selected => selected.id === p.id || selected.name === p.name))
                .filter(p => p.name?.toLowerCase().includes(playlistSearch.toLowerCase()))
                .map(playlist => (
                  <div 
                    key={playlist.id}
                    className="flex items-center justify-between p-3 border rounded hover:bg-zinc-900 cursor-pointer"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        playlists: [...formData.playlists, playlist]
                      });
                      setShowPlaylistSelector(false);
                      setPlaylistSearch('');
                    }}
                  >
                    <div>
                      <p className="font-medium">{playlist.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {playlist.vendor?.name}
                        {playlist.follower_count > 0 && ` • ${playlist.follower_count.toLocaleString()} followers`}
                        {playlist.avg_daily_streams > 0 && ` • ${playlist.avg_daily_streams.toLocaleString()} daily streams`}
                        {playlist.genres?.length > 0 && ` • ${playlist.genres.join(', ')}`}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}








