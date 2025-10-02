"use client"

import { useState } from 'react';
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { ClientSelector } from '../components/ClientSelector';
import { useClients } from '../hooks/useClients';
import { useIsVendorManager } from '../hooks/useIsVendorManager';
import { useCreateCampaignSubmission } from '../hooks/useCampaignSubmissions';
import { useSalespeople } from '../hooks/useSalespeople';
import { useToast } from '../hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { UNIFIED_GENRES } from '../lib/constants';
import { supabase } from '../integrations/supabase/client';
import { CheckCircle, RefreshCcw, Eye, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function CampaignIntakePage() {
  const { toast } = useToast();
  const router = useRouter();
  const { data: clients } = useClients();
  const { data: salespeople = [] } = useSalespeople();
  const { data: isVendorManager } = useIsVendorManager();

  const [formData, setFormData] = useState({
    salesperson: '',
    client_id: '',
    client_name: '',
    client_emails: '',
    campaign_name: '',
    price_paid: '',
    stream_goal: '',
    start_date: '',
    duration_days: '90',
    track_url: '',
    notes: '',
    music_genres: [] as string[],
    territory_preferences: [] as string[]
  });
  const [isNewClient, setIsNewClient] = useState(false);
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [isLoadingSpotify, setIsLoadingSpotify] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const createSubmissionMutation = useCreateCampaignSubmission();
  const queryClient = useQueryClient();

  // Success handler for showing dialog instead of toast
  const handleSubmissionSuccess = () => {
    setShowSuccessDialog(true);
  };

  const getSelectedClient = () => {
    return clients?.find(c => c.id === formData.client_id);
  };

  const handleClientSelection = (clientId: string) => {
    const client = clients?.find(c => c.id === clientId);
    if (client) {
      const emailsString = client.emails?.join(', ') || '';
      setFormData(prev => ({
        ...prev,
        client_id: clientId,
        client_name: client.name,
        client_emails: emailsString
      }));
    }
  };

  const handleTrackUrlChange = async (url: string) => {
    // Immediately save the URL to form data
    setFormData(prev => ({ ...prev, track_url: url }));
    
    if (url.includes('spotify.com/track/')) {
      try {
        setIsLoadingSpotify(true);
        
        // Clear previous genres when switching tracks
        setFormData(prev => ({ ...prev, music_genres: [] }));
        setAvailableGenres([]);
        
        // Call Supabase Edge Function to fetch track data
        const { data, error } = await supabase.functions.invoke('spotify-fetch', {
          body: { trackUrl: url }
        });

        if (error) {
          console.error('Error fetching Spotify data:', error);
          toast({
            title: "Spotify Error",
            description: "Could not fetch track information. Please enter manually.",
            variant: "destructive"
          });
          return;
        }

        if (data?.name) {
          // Auto-populate campaign name from track info
          const trackName = data.name;
          const artistName = data.artists?.[0]?.name;
          const campaignName = artistName && trackName ? `${artistName} - ${trackName}` : trackName;
          
          setFormData(prev => ({ 
            ...prev, 
            campaign_name: campaignName || prev.campaign_name
          }));
          
          toast({
            title: "Track Info Retrieved",
            description: `Campaign name set to "${campaignName}"`,
          });
        }

        if (data?.genres && data.genres.length > 0) {
          // Auto-populate genres
          setAvailableGenres(data.genres);
          setFormData(prev => ({ 
            ...prev, 
            music_genres: data.genres 
          }));
          
          toast({
            title: "Genres Auto-Selected",
            description: `Selected: ${data.genres.join(', ')}`,
          });
        } else {
          // Enhanced fallback - suggest similar genres
          const suggestedGenres = ['pop', 'dance', 'hip-hop']; // Default suggestions
          setAvailableGenres(suggestedGenres);
          // Keep music_genres empty for fallback - user must manually select
          toast({
            title: "Genres Auto-Suggested",
            description: "No specific genres found. Please review and select appropriate genres below.",
            variant: "default"
          });
        }
        
      } catch (error) {
        console.error('Spotify API error:', error);
        toast({
          title: "Spotify Error", 
          description: "Could not fetch track information. Please enter manually.",
          variant: "destructive"
        });
      } finally {
        setIsLoadingSpotify(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.salesperson || !formData.campaign_name || !formData.price_paid || 
        !formData.stream_goal || !formData.start_date || !formData.track_url) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all required fields before submitting.",
        variant: "destructive"
      });
      return;
    }

    // Client validation
    const selectedClient = getSelectedClient();
    const selectedClientName = selectedClient?.name;

    if (!isNewClient && !selectedClientName) {
      toast({
        title: "Client Required",
        description: "Please select an existing client or create a new one.",
        variant: "destructive"
      });
      return;
    }

    if (isNewClient && !formData.client_name.trim()) {
      toast({
        title: "Client Name Required",
        description: "Please enter a client name for the new client.",
        variant: "destructive"
      });
      return;
    }

    // Email validation
    const emailsArray = formData.client_emails.split(',').map(e => e.trim()).filter(e => e);
    if (emailsArray.length === 0) {
      toast({
        title: "Client Email Required",
        description: "At least one client email is required.",
        variant: "destructive"
      });
      return;
    }

    if (emailsArray.length > 5) {
      toast({
        title: "Too Many Emails",
        description: "Maximum 5 client emails allowed.",
        variant: "destructive"
      });
      return;
    }

    // Budget and goal validation
    if (parseFloat(formData.price_paid) <= 0) {
      toast({
        title: "Invalid Budget",
        description: "Campaign budget must be greater than $0.",
        variant: "destructive"
      });
      return;
    }

    if (parseInt(formData.stream_goal) <= 0) {
      toast({
        title: "Invalid Stream Goal",
        description: "Stream goal must be greater than 0.",
        variant: "destructive"
      });
      return;
    }

    // Date validation - allow today's date
    const startDate = new Date(formData.start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    
    if (startDate < today) {
      toast({
        title: "Invalid Start Date",
        description: "Campaign start date cannot be in the past.",
        variant: "destructive"
      });
      return;
    }

    try {
      await createSubmissionMutation.mutateAsync({
        client_name: isNewClient ? formData.client_name : selectedClientName || '',
        client_emails: emailsArray,
        campaign_name: formData.campaign_name,
        price_paid: parseFloat(formData.price_paid),
        stream_goal: parseInt(formData.stream_goal),
        start_date: formData.start_date,
        duration_days: parseInt(formData.duration_days),
        track_url: formData.track_url,
        notes: formData.notes,
        salesperson: formData.salesperson,
        music_genres: formData.music_genres,
        territory_preferences: formData.territory_preferences
      });

      // Show success dialog instead of resetting form immediately
      handleSubmissionSuccess();
    } catch (error) {
      console.error('Submission error:', error);
    }
  };

  const handleGenreToggle = (genre: string) => {
    setFormData(prev => ({
      ...prev,
      music_genres: prev.music_genres.includes(genre)
        ? prev.music_genres.filter(g => g !== genre)
        : [...prev.music_genres, genre]
    }));
  };

  const handleTerritoryToggle = (territory: string) => {
    setFormData(prev => ({
      ...prev,
      territory_preferences: prev.territory_preferences.includes(territory)
        ? prev.territory_preferences.filter(t => t !== territory)
        : [...prev.territory_preferences, territory]
    }));
  };

  // Available territories
  const territories = [
    'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 
    'Spain', 'Italy', 'Netherlands', 'Sweden', 'Norway', 'Global'
  ];

  const renderTrackUrlField = () => (
    <div>
      <Label>Track URL (Spotify) *</Label>
      <Input
        placeholder="https://open.spotify.com/track/..."
        value={formData.track_url}
        onChange={(e) => handleTrackUrlChange(e.target.value)}
        required
        disabled={isLoadingSpotify}
      />
      <p className="text-xs text-muted-foreground mt-1">
        {isLoadingSpotify ? (
          "🎵 Fetching track information from Spotify..."
        ) : (
          "Paste Spotify track URL to auto-populate campaign name and genres"
        )}
      </p>
    </div>
  );

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Campaign Submission</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Submit new campaign details for approval. All fields marked with * are required.
          </p>
        </div>

        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-xl">Campaign Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Salesperson Selection */}
              <div>
                <Label>Salesperson *</Label>
                <Select 
                  value={formData.salesperson} 
                  onValueChange={(value) => setFormData({...formData, salesperson: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select salesperson" />
                  </SelectTrigger>
                  <SelectContent>
                    {salespeople.filter(sp => sp.is_active).map(person => (
                      <SelectItem key={person.id} value={person.email || person.name}>
                        {person.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Don't see your name? Contact admin to be added as a salesperson.
                </p>
              </div>

              {/* Client Selection */}
              <div>
                <Label>Client *</Label>
                <div className="flex gap-2 mb-3">
                  <Button
                    type="button"
                    variant={!isNewClient ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsNewClient(false)}
                  >
                    Existing Client
                  </Button>
                  <Button
                    type="button"
                    variant={isNewClient ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsNewClient(true)}
                  >
                    New Client
                  </Button>
                </div>

                {!isNewClient ? (
                  <ClientSelector
                    value={formData.client_id}
                    onChange={handleClientSelection}
                    placeholder="Search and select existing client..."
                    allowCreate={isVendorManager || false}
                  />
                ) : (
                  <Input
                    placeholder="Enter new client name"
                    value={formData.client_name}
                    onChange={(e) => setFormData({...formData, client_name: e.target.value, client_id: ''})}
                    required
                  />
                )}
              </div>

              {/* Track URL - Show at top for existing clients, under emails for new clients */}
              {!isNewClient && renderTrackUrlField()}

              {/* Client Emails */}
              <div>
                <Label>Client Emails (up to 5, comma-separated) *</Label>
                <Textarea
                  placeholder={isNewClient ? "email1@example.com, email2@example.com" : 
                    (formData.client_emails ? "Emails auto-populated from client record" : "No emails found for this client - contact admin")}
                  value={formData.client_emails}
                  onChange={(e) => setFormData({...formData, client_emails: e.target.value})}
                  rows={2}
                  required
                  readOnly={!isNewClient}
                  className={!isNewClient ? "bg-muted" : ""}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {isNewClient ? (
                    <>
                      {`${formData.client_emails.split(',').filter(e => e.trim()).length}/5 emails. `}
                      {isVendorManager ? 
                        'Client will be created in database automatically.' : 
                        'Client will be created during approval process.'
                      }
                    </>
                  ) : !isNewClient && !formData.client_emails ? (
                    "⚠️ This client has no emails on file - contact admin to add client emails before submitting"
                  ) : (
                    "Emails from client database record (read-only). To modify, contact admin or create new client."
                  )}
                </p>
              </div>

              {/* Track URL for new clients */}
              {isNewClient && renderTrackUrlField()}

              {/* Campaign Name */}
              <div>
                <Label>Campaign Name *</Label>
                <Input
                  placeholder="Artist Name - Track Title"
                  value={formData.campaign_name}
                  onChange={(e) => setFormData({...formData, campaign_name: e.target.value})}
                  required
                  disabled={isLoadingSpotify}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {isLoadingSpotify ? 
                    "Auto-populating from Spotify..." : 
                    "Use format: Artist Name - Track Title (auto-filled from Spotify URL)"
                  }
                </p>
              </div>

              {/* Budget and Stream Goal Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Campaign Budget (USD) *</Label>
                  <Input
                    type="number"
                    placeholder="5000"
                    value={formData.price_paid}
                    onChange={(e) => setFormData({...formData, price_paid: e.target.value})}
                    required
                    min="1"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label>Stream Goal *</Label>
                  <Input
                    type="number"
                    placeholder="100000"
                    value={formData.stream_goal}
                    onChange={(e) => setFormData({...formData, stream_goal: e.target.value})}
                    required
                    min="1"
                  />
                </div>
              </div>

              {/* Date and Duration Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${!formData.start_date ? "text-muted-foreground" : ""}`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.start_date ? format(new Date(formData.start_date + 'T12:00:00'), "PPP") : "Select start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.start_date ? new Date(formData.start_date + 'T12:00:00') : undefined}
                        onSelect={(date) => {
                          if (date) {
                            // Create date at noon to avoid timezone issues
                            const adjustedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
                            setFormData({...formData, start_date: format(adjustedDate, 'yyyy-MM-dd')});
                            // Close popover after selection by clicking outside
                            setTimeout(() => document.body.click(), 100);
                          }
                        }}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date < today;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Duration (Days)</Label>
                  <Select 
                    value={formData.duration_days} 
                    onValueChange={(value) => setFormData({...formData, duration_days: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days (recommended)</SelectItem>
                      <SelectItem value="120">120 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Music Genres */}
              <div>
                <Label>Music Genres {formData.music_genres.length > 0 && `(${formData.music_genres.length} selected)`}</Label>
                <div className="flex flex-wrap gap-2 mt-2 p-4 border rounded-md bg-muted/20">
                  {(availableGenres.length > 0 ? availableGenres : UNIFIED_GENRES).map(genre => (
                    <Badge
                      key={genre}
                      variant={formData.music_genres.includes(genre) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/80"
                      onClick={() => handleGenreToggle(genre)}
                    >
                      {genre}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {availableGenres.length > 0 ? 
                    "Genres auto-detected from Spotify. Click to modify selection." :
                    "Select genres that best describe the track. Multiple selections allowed."
                  }
                </p>
              </div>

              {/* Territory Preferences */}
              <div>
                <Label>Territory Preferences (Optional) {formData.territory_preferences.length > 0 && `(${formData.territory_preferences.length} selected)`}</Label>
                <div className="flex flex-wrap gap-2 mt-2 p-4 border rounded-md bg-muted/20">
                  {territories.map(territory => (
                    <Badge
                      key={territory}
                      variant={formData.territory_preferences.includes(territory) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/80"
                      onClick={() => handleTerritoryToggle(territory)}
                    >
                      {territory}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Select preferred territories for playlist placement. Leave empty for global placement.
                </p>
              </div>

              {/* Notes */}
              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder="Additional information, special requests, or campaign details..."
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-center pt-4">
                <Button 
                  type="submit" 
                  size="lg" 
                  disabled={createSubmissionMutation.isPending || isLoadingSpotify}
                  className="w-full md:w-auto px-8"
                >
                  {createSubmissionMutation.isPending ? 
                    'Submitting Campaign...' : 
                    'Submit Campaign for Approval'
                  }
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Campaign Submitted Successfully!
            </DialogTitle>
            <DialogDescription>
              Your campaign has been submitted for approval. You'll be contacted soon with an update.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-center">
            <Button
              onClick={() => {
                window.location.reload();
              }}
              className="w-full"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Submit Another Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}








