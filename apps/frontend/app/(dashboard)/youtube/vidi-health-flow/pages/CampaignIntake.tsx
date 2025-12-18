import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, CheckCircle, Music, ChevronDown, Users, Search, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "../integrations/supabase/client";
import { GENRE_OPTIONS } from "../lib/constants";
import { useCampaigns } from "../hooks/useCampaigns";
import { MultiServiceTypeSelector } from "../components/campaigns/MultiServiceTypeSelector";
import type { Database } from "../integrations/supabase/types";

type ServiceType = Database['public']['Enums']['service_type'];

interface ServiceTypeGoal {
  id: string;
  service_type: ServiceType;
  custom_service_type?: string;
  goal_views: number;
}

export default function CampaignIntake() {
  const { toast } = useToast();
  const { 
    clients, 
    salespersons, 
    createClient,
    createCampaign
  } = useCampaigns();
  
  const [formData, setFormData] = useState({
    campaign_name: '',
    youtube_url: '',
    client_id: '',
    salesperson_id: '',
    genre: '',
    sale_price: '',
    start_date: undefined as Date | undefined,
    notes: ''
  });

  const [serviceTypes, setServiceTypes] = useState<ServiceTypeGoal[]>([
    {
      id: '1',
      service_type: '' as ServiceType,
      goal_views: 0
    }
  ]);

  // Search and dropdown states
  const [genreSearch, setGenreSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: '',
    email: '',
    company: ''
  });
  const [highlightedGenreIndex, setHighlightedGenreIndex] = useState(0);
  const [highlightedClientIndex, setHighlightedClientIndex] = useState(0);

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Refs for dropdowns
  const genreRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (genreRef.current && !genreRef.current.contains(event.target as Node)) {
        setShowGenreDropdown(false);
      }
      if (clientRef.current && !clientRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredGenres = GENRE_OPTIONS.filter(genre => 
    genre.toLowerCase().includes(genreSearch.toLowerCase())
  );

  const filteredClients = clients?.filter(client => 
    client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (client.company && client.company.toLowerCase().includes(clientSearch.toLowerCase()))
  ) || [];

  const selectedClient = clients?.find(client => client.id === formData.client_id);

  // Reset highlighted indexes when filtered lists change
  useEffect(() => {
    setHighlightedGenreIndex(0);
  }, [filteredGenres.length, genreSearch]);

  useEffect(() => {
    setHighlightedClientIndex(0);
  }, [filteredClients.length, clientSearch]);

  const handleGenreKeyDown = (e: React.KeyboardEvent) => {
    if (!showGenreDropdown) return;
    
    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedGenreIndex(prev => 
          prev < filteredGenres.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedGenreIndex(prev => 
          prev > 0 ? prev - 1 : filteredGenres.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredGenres[highlightedGenreIndex]) {
          handleInputChange('genre', filteredGenres[highlightedGenreIndex]);
          setGenreSearch(filteredGenres[highlightedGenreIndex]);
          setShowGenreDropdown(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowGenreDropdown(false);
        break;
    }
  };

  const handleClientKeyDown = (e: React.KeyboardEvent) => {
    if (!showClientDropdown) return;
    
    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedClientIndex(prev => 
          prev < filteredClients.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedClientIndex(prev => 
          prev > 0 ? prev - 1 : filteredClients.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredClients[highlightedClientIndex]) {
          handleInputChange('client_id', filteredClients[highlightedClientIndex].id);
          setClientSearch('');
          setShowClientDropdown(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowClientDropdown(false);
        break;
    }
  };

  const handleInputChange = (field: string, value: string | Date) => {
    setFormData({ ...formData, [field]: value });
  };

  const extractVideoInfo = async (url: string) => {
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (videoIdMatch && !formData.campaign_name) {
      const videoId = videoIdMatch[1];
      
      try {
        // Call the get_video_info edge function to fetch actual video details
        const { data, error } = await supabase.functions.invoke('get_video_info', {
          body: { videoId }
        });

        if (error) {
          console.error('Error fetching video info:', error);
          // Fallback to generic name if API call fails
          setFormData(prev => ({ 
            ...prev, 
            campaign_name: `Campaign for ${videoId}`
          }));
          return;
        }

        // Use the actual video title as campaign name
        if (data?.title) {
          setFormData(prev => ({ 
            ...prev, 
            campaign_name: data.title
          }));
        } else {
          // Fallback if no title in response
          setFormData(prev => ({ 
            ...prev, 
            campaign_name: `Campaign for ${videoId}`
          }));
        }
      } catch (error) {
        console.error('Error calling video info API:', error);
        // Fallback to generic name if API call fails
        setFormData(prev => ({ 
          ...prev, 
          campaign_name: `Campaign for ${videoId}`
        }));
      }
    }
  };

  const handleCreateClient = async () => {
    if (!newClientData.name) {
      toast({
        title: "Error",
        description: "Client name is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      const clientData = {
        name: newClientData.name,
        email: newClientData.email || '',
        email2: '',
        email3: '',
        company: newClientData.company || ''
      };
      
      const result = await createClient(clientData);
      if (result.error) {
        throw result.error;
      }
      
      if (result.data) {
        setFormData(prev => ({ ...prev, client_id: result.data.id }));
        setShowNewClientForm(false);
        setShowClientDropdown(false);
        setNewClientData({ name: '', email: '', company: '' });
        toast({
          title: "Success",
          description: "Client created successfully!",
        });
      }
    } catch (error) {
      console.error('Error creating client:', error);
      toast({
        title: "Error",
        description: "Failed to create client. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate service types
      if (serviceTypes.length === 0 || serviceTypes.every(st => !st.service_type)) {
        toast({
          title: "Error",
          description: "Please add at least one service type.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (serviceTypes.some(st => st.goal_views <= 0)) {
        toast({
          title: "Error",
          description: "All service types must have goal views greater than 0.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const totalGoalViews = serviceTypes.reduce((sum, st) => sum + (st.goal_views || 0), 0);
      const firstServiceType = serviceTypes.find(st => st.service_type)?.service_type;

      const campaignData = {
        campaign_name: formData.campaign_name,
        youtube_url: formData.youtube_url,
        service_type: (firstServiceType as ServiceType) || 'ww_display', // Legacy field for compatibility
        goal_views: totalGoalViews, // Legacy field for compatibility
        service_types: serviceTypes as any, // New multi-service field
        sale_price: parseFloat(formData.sale_price) || null,
        start_date: formData.start_date ? format(formData.start_date, 'yyyy-MM-dd') : null,
        genre: formData.genre || null,
        client_id: formData.client_id || null,
        salesperson_id: formData.salesperson_id || null,
        status: 'pending' as const,
        technical_setup_complete: false,
        custom_service_type: formData.notes || null
      };

      const { data, error } = await createCampaign(campaignData);
      
      if (error) {
        throw error;
      }

      setSubmitted(true);
      toast({
        title: "Campaign Submitted!",
        description: "Your campaign has been submitted for review. Our team will contact you soon.",
      });
    } catch (error) {
      console.error('Error submitting campaign:', error);
      toast({
        title: "Error",
        description: "Failed to submit campaign. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Campaign Submitted!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Thank you for submitting your campaign. Our team will review your submission and contact you within 24 hours.
            </p>
            <Button 
              onClick={() => setSubmitted(false)} 
              className="w-full"
            >
              Submit Another Campaign
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Music className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Artist Influence</h1>
          <p className="text-muted-foreground mt-2">
            YouTube Intake Form
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>New Campaign Submission</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Campaign Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Campaign Details</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="youtube_url">YouTube Video URL *</Label>
                  <Input
                    id="youtube_url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={formData.youtube_url}
                    onChange={(e) => {
                      handleInputChange('youtube_url', e.target.value);
                      extractVideoInfo(e.target.value);
                    }}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaign_name">Campaign Name *</Label>
                  <Input
                    id="campaign_name"
                    value={formData.campaign_name}
                    onChange={(e) => handleInputChange('campaign_name', e.target.value)}
                    required
                  />
                </div>

                <MultiServiceTypeSelector
                  serviceTypes={serviceTypes}
                  onServiceTypesChange={setServiceTypes}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="genre">Genre</Label>
                    <div className="relative" ref={genreRef}>
                      <Input
                        placeholder="Search genres..."
                        value={genreSearch}
                        onChange={(e) => {
                          setGenreSearch(e.target.value);
                          setShowGenreDropdown(true);
                        }}
                        onFocus={() => setShowGenreDropdown(true)}
                        onKeyDown={handleGenreKeyDown}
                        className="pr-8"
                      />
                      <ChevronDown 
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer"
                        onClick={() => setShowGenreDropdown(!showGenreDropdown)}
                      />
                      {showGenreDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-y-auto">
                          {filteredGenres.map((genre, index) => (
                            <div
                              key={genre}
                              className={`px-3 py-2 text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm ${
                                index === highlightedGenreIndex ? 'bg-accent/50 border-l-2 border-primary' : ''
                              }`}
                              onClick={() => {
                                handleInputChange('genre', genre);
                                setGenreSearch(genre);
                                setShowGenreDropdown(false);
                              }}
                            >
                              {genre}
                            </div>
                          ))}
                          {filteredGenres.length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              No genres found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sale_price">Budget ($)</Label>
                    <Input
                      id="sale_price"
                      type="number"
                      step="0.01"
                      placeholder="e.g. 5000"
                      value={formData.sale_price}
                      onChange={(e) => handleInputChange('sale_price', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Preferred Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        type="button"
                        variant="outline" 
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.start_date ? format(formData.start_date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={formData.start_date}
                        onSelect={(date) => {
                          if (date) {
                            handleInputChange('start_date', date);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                {/* Salesperson - added to main form */}
                <div className="space-y-2">
                  <Label htmlFor="salesperson_id">Salesperson</Label>
                  <Select value={formData.salesperson_id} onValueChange={(value) => handleInputChange('salesperson_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select salesperson (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {salespersons && salespersons.length > 0 ? (
                        salespersons.map((person) => (
                          <SelectItem key={person.id} value={person.id}>
                            {person.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>No salespersons available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Client Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Client Information</h3>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="client_search">Client</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowNewClientForm(true);
                        setShowClientDropdown(false);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      New Client
                    </Button>
                  </div>
                  <div className="relative" ref={clientRef}>
                    <Input
                      id="client_search"
                      placeholder={selectedClient ? `${selectedClient.name}${selectedClient.company ? ` - ${selectedClient.company}` : ''}` : "Search for a client..."}
                      value={clientSearch}
                      onChange={(e) => {
                        setClientSearch(e.target.value);
                        setShowClientDropdown(true);
                      }}
                      onFocus={() => setShowClientDropdown(true)}
                      onKeyDown={handleClientKeyDown}
                      className="pr-10"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {selectedClient ? (
                        <Users className="w-4 h-4 text-primary" />
                      ) : (
                        <Search className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                     {showClientDropdown && (clientSearch || !selectedClient) && (
                       <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                         {filteredClients.length > 0 ? (
                           <div className="p-2 space-y-1">
                             {filteredClients.map((client, index) => (
                               <Button
                                 key={client.id}
                                 variant={formData.client_id === client.id ? "secondary" : "ghost"}
                                 className={`w-full justify-start text-left text-popover-foreground hover:bg-accent hover:text-accent-foreground ${
                                   index === highlightedClientIndex ? 'bg-accent/50 border-l-2 border-primary' : ''
                                 }`}
                                 onClick={() => {
                                   handleInputChange('client_id', client.id);
                                   setClientSearch('');
                                   setShowClientDropdown(false);
                                 }}
                               >
                                 <div className="flex flex-col items-start">
                                   <div className="font-medium">{client.name}</div>
                                   {client.company && (
                                     <div className="text-sm text-muted-foreground">
                                       {client.company}
                                     </div>
                                   )}
                                 </div>
                               </Button>
                             ))}
                             {clientSearch && (
                               <div className="border-t pt-2 mt-2">
                                 <Button
                                   variant="outline"
                                   size="sm"
                                   className="w-full"
                                   onClick={() => {
                                     setShowNewClientForm(true);
                                     setShowClientDropdown(false);
                                     setNewClientData(prev => ({ ...prev, name: clientSearch }));
                                   }}
                                 >
                                   <Plus className="w-4 h-4 mr-2" />
                                   Add "{clientSearch}" as new client
                                 </Button>
                               </div>
                             )}
                           </div>
                         ) : (
                           <div className="p-2">
                             <div className="text-center text-sm text-muted-foreground mb-2">
                               {clientSearch ? 'No clients found matching your search.' : 'Start typing to search for clients'}
                             </div>
                             {clientSearch && (
                               <Button
                                 variant="outline"
                                 size="sm"
                                 className="w-full"
                                 onClick={() => {
                                   setShowNewClientForm(true);
                                   setShowClientDropdown(false);
                                   setNewClientData(prev => ({ ...prev, name: clientSearch }));
                                 }}
                               >
                                 <Plus className="w-4 h-4 mr-2" />
                                 Add "{clientSearch}" as new client
                               </Button>
                             )}
                           </div>
                         )}
                       </div>
                     )}
                  </div>
                  {selectedClient && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="text-sm text-muted-foreground">
                        Selected: <span className="font-medium text-foreground">{selectedClient.name}</span>
                        {selectedClient.company && (
                          <span> - {selectedClient.company}</span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          handleInputChange('client_id', '');
                          setClientSearch('');
                        }}
                        className="h-auto p-1 text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>

                {/* New Client Form */}
                {showNewClientForm && (
                  <Card className="p-4 border-dashed">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Add New Client</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowNewClientForm(false);
                            setNewClientData({ name: '', email: '', company: '' });
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="new_client_name">Name *</Label>
                          <Input
                            id="new_client_name"
                            value={newClientData.name}
                            onChange={(e) => setNewClientData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Client name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new_client_email">Email</Label>
                          <Input
                            id="new_client_email"
                            type="email"
                            value={newClientData.email}
                            onChange={(e) => setNewClientData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="Client email"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new_client_company">Company/Label</Label>
                        <Input
                          id="new_client_company"
                          value={newClientData.company}
                          onChange={(e) => setNewClientData(prev => ({ ...prev, company: e.target.value }))}
                          placeholder="Company name"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleCreateClient}
                        className="w-full"
                        disabled={!newClientData.name}
                      >
                        Create Client
                      </Button>
                    </div>
                  </Card>
                )}
              </div>

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional information about the campaign..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? "Submitting..." : "Submit Campaign"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}