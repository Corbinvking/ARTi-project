import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, CalendarIcon, CheckCircle, Search, Users, AlertTriangle, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useCampaigns } from "../../hooks/useCampaigns";
import { useValidation } from "../../hooks/useValidation";
import { GENRE_OPTIONS, LIKE_SERVER_OPTIONS, COMMENT_SERVER_OPTIONS, SERVICE_TYPES } from "../../lib/constants";
import { sanitizeYouTubeUrl } from "../../lib/youtube";
import { ServiceTypeSelector } from "./ServiceTypeSelector";
import { MultiServiceTypeSelector } from "./MultiServiceTypeSelector";
import { getApiUrl } from "../../lib/getApiUrl";
import type { Database } from "../../integrations/supabase/types";

type ServiceType = Database['public']['Enums']['service_type'];

interface ServiceTypeGoal {
  id: string;
  service_type: ServiceType;
  custom_service_type?: string;
  goal_views: number;
}

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateCampaignModal = ({ isOpen, onClose }: CreateCampaignModalProps) => {
  const { toast } = useToast();
  const { clients, salespersons, createCampaign, createClient } = useCampaigns();
  const { isValidating, validateYouTubeUrl, checkDuplicateCampaign, validateCampaignData } = useValidation();
  
  const [step, setStep] = useState(1);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    campaign_name: '',
    youtube_url: '',
    video_id: '',
    client_id: '',
    salesperson_id: '',
    genre: '',
    sale_price: '',
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
    artist_tier: '',
    comments_sheet_url: '',
    like_server: '',
    comment_server: '',
    wait_time_seconds: '',
    desired_daily: '',
    status: 'pending' as 'active' | 'pending'
  });

  const [serviceTypes, setServiceTypes] = useState<ServiceTypeGoal[]>([
    { id: '1', service_type: '' as ServiceType, goal_views: 0 }
  ]);

  const [loading, setLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: '',
    email: '',
    company: ''
  });
  const [creatingClient, setCreatingClient] = useState(false);
  const [campaignNameTouched, setCampaignNameTouched] = useState(false);
  const [highlightedClientIndex, setHighlightedClientIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get selected client info
  const selectedClient = clients.find(client => client.id === formData.client_id);
  
  // Filter clients based on search
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (client.company && client.company.toLowerCase().includes(clientSearch.toLowerCase()))
  );

  // Reset highlighted index when filtered list changes
  useEffect(() => {
    setHighlightedClientIndex(0);
  }, [filteredClients.length, clientSearch]);

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
    const newData = { ...formData, [field]: value };
    
    // Auto-calculate desired daily views based on total goal views and dates
    if ((field === 'start_date' || field === 'end_date') && 
        newData.start_date && newData.end_date && serviceTypes.length > 0) {
      const totalGoalViews = serviceTypes.reduce((sum, st) => sum + st.goal_views, 0);
      const startDate = new Date(newData.start_date);
      const endDate = new Date(newData.end_date);
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 0 && totalGoalViews > 0) {
        newData.desired_daily = Math.ceil(totalGoalViews / daysDiff).toString();
      }
    }
    
    setFormData(newData);
  };

  const extractVideoInfo = async (url: string) => {
    if (!url) return;
    
    // Clear previous validation errors
    setValidationErrors(prev => ({ ...prev, youtube_url: '' }));
    
    // Validate YouTube URL
    const validation = await validateYouTubeUrl(url);
    
    if (!validation.isValid) {
      setValidationErrors(prev => ({ ...prev, youtube_url: validation.error || 'Invalid YouTube URL' }));
      return;
    }
    
    // Check for duplicates if client is selected
    if (formData.client_id && validation.data?.videoId) {
      const duplicateCheck = await checkDuplicateCampaign(
        validation.data.videoId,
        formData.client_id,
        formData.campaign_name
      );
      
      if (!duplicateCheck.isValid) {
        setValidationErrors(prev => ({ ...prev, duplicate: duplicateCheck.error || 'Duplicate campaign detected' }));
      } else {
        setValidationErrors(prev => ({ ...prev, duplicate: '' }));
      }
    }
    
    // Try to extract video title
    const videoIdMatch = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
    );
    if (videoIdMatch) {
      const videoId = videoIdMatch[1];
      try {
        const apiUrl = getApiUrl();
        console.log("🎬 Fetching YouTube title for create modal", { apiUrl, url, videoId });
        const response = await fetch(`${apiUrl}/api/youtube-data-api/fetch-video-stats`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoUrl: url }),
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(`Failed to fetch video stats (HTTP ${response.status}). ${text}`);
        }

        const data = await response.json();
        console.log("✅ Title fetch response", data);

        setFormData((prev) => {
          const isAutoName =
            !prev.campaign_name ||
            prev.campaign_name === `Campaign for ${videoId}` ||
            prev.campaign_name.startsWith("Campaign for ");

          const nextName =
            !campaignNameTouched && isAutoName
              ? (data?.title || `Campaign for ${videoId}`)
              : prev.campaign_name;

          return {
            ...prev,
            campaign_name: nextName,
            video_id: data?.videoId || videoId,
          };
        });
      } catch (error) {
        console.error('Error fetching video info:', error);
        toast({
          title: "Couldn’t fetch video title",
          description:
            "Using a placeholder name. Make sure the API server is reachable and has YOUTUBE_API_KEY configured.",
          variant: "destructive",
        });
        // Fallback to video ID if API fails
        if (!campaignNameTouched && !formData.campaign_name) {
          setFormData(prev => ({ 
            ...prev, 
            campaign_name: `Campaign for ${videoId}`,
            video_id: prev.video_id || videoId
          }));
        }
      }
    }
  };

  const isStepValid = (stepNum: number) => {
    switch (stepNum) {
      case 1:
        return formData.campaign_name && 
               formData.youtube_url && 
               !validationErrors.youtube_url &&
               !validationErrors.duplicate &&
               serviceTypes.length > 0 && 
               serviceTypes.every(st => st.service_type && (st.service_type === 'engagements_only' || st.goal_views > 0));
      case 2:
        return true; // Optional fields
      case 3:
        return true; // Optional fields
      case 4:
        return true; // Review step
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < 4 && isStepValid(step)) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setValidationErrors({});
    setValidationWarnings([]);
    
    try {
      // Final validation before submission
      const validation = validateCampaignData({
        ...formData,
        service_types: serviceTypes
      });
      
      if (!validation.isValid) {
        setValidationErrors({ general: validation.error || 'Validation failed' });
        setLoading(false);
        return;
      }
      
      if (validation.warnings) {
        setValidationWarnings(validation.warnings);
      }
      
      // Create a campaign for the primary service type (first one)
      const primaryServiceType = serviceTypes[0];
      const totalGoalViews = serviceTypes.reduce((sum, st) => sum + st.goal_views, 0);
      
      const campaignData = {
        campaign_name: formData.campaign_name,
        youtube_url: sanitizeYouTubeUrl(formData.youtube_url),
        video_id: formData.video_id || null,
        client_id: formData.client_id || null,
        salesperson_id: formData.salesperson_id || null,
        service_type: primaryServiceType.service_type,
        custom_service_type: primaryServiceType.custom_service_type || null,
        service_types: JSON.stringify(serviceTypes.map(({ id, ...st }) => st)),
        genre: formData.genre || null,
        goal_views: totalGoalViews,
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
        start_date: formData.start_date ? format(formData.start_date, 'yyyy-MM-dd') : null,
        end_date: formData.end_date ? format(formData.end_date, 'yyyy-MM-dd') : null,
        artist_tier: formData.artist_tier ? parseInt(formData.artist_tier) : null,
        comments_sheet_url: formData.comments_sheet_url || null,
        like_server: formData.like_server || null,
        comment_server: formData.comment_server || null,
        wait_time_seconds: formData.wait_time_seconds ? parseInt(formData.wait_time_seconds) : 0,
        desired_daily: formData.desired_daily ? parseInt(formData.desired_daily) : 0,
        status: formData.status,
        technical_setup_complete: formData.status === 'active' // Mark as complete if creating as active
      };

      const { data, error } = await createCampaign(campaignData);
      
      if (error) {
        throw error;
      }

      console.log('Campaign created successfully:', data);
      
      toast({
        title: "Campaign Created",
        description: `Campaign "${formData.campaign_name}" has been created successfully! Initial YouTube data will be collected automatically and appear in the performance overview shortly.`,
      });
      
      onClose();
      setStep(1);
      setValidationErrors({});
      setValidationWarnings([]);
      setFormData({
        campaign_name: '',
        youtube_url: '',
        client_id: '',
        salesperson_id: '',
        genre: '',
        sale_price: '',
        start_date: undefined,
        end_date: undefined,
        artist_tier: '',
        comments_sheet_url: '',
        like_server: '',
        comment_server: '',
        wait_time_seconds: '',
        desired_daily: '',
        status: 'pending' as 'active' | 'pending'
      });
      setServiceTypes([{ id: '1', service_type: '' as ServiceType, goal_views: 0 }]);
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      
      // Handle specific database constraint errors
      if (error.message?.includes('duplicate') || error.message?.includes('already exists')) {
        setValidationErrors({ duplicate: error.message });
      } else {
        setValidationErrors({ general: error.message || 'Failed to create campaign. Please try again.' });
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Campaign</DialogTitle>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3, 4].map((stepNum) => (
            <div key={stepNum} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  stepNum === step
                    ? 'bg-primary text-primary-foreground'
                    : stepNum < step
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {stepNum < step ? <CheckCircle className="w-4 h-4" /> : stepNum}
              </div>
              {stepNum < 4 && (
                <div
                  className={`w-16 h-1 mx-2 ${
                    stepNum < step ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="space-y-6">
          {/* Validation Errors */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive">Validation Errors</p>
                  {Object.values(validationErrors).map((error, index) => 
                    error && <p key={index} className="text-sm text-destructive">{error}</p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Validation Warnings */}
          {validationWarnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-yellow-800">Warnings</p>
                  {validationWarnings.map((warning, index) => 
                    <p key={index} className="text-sm text-yellow-700">{warning}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="space-y-2">
                <Label htmlFor="youtube_url">YouTube Video URL *</Label>
                <div className="relative">
                  <Input
                    id="youtube_url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={formData.youtube_url}
                    onChange={(e) => {
                      handleInputChange('youtube_url', e.target.value);
                      extractVideoInfo(e.target.value);
                    }}
                    className={validationErrors.youtube_url ? 'border-destructive' : ''}
                  />
                  {isValidating && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                {validationErrors.youtube_url && (
                  <p className="text-sm text-destructive">{validationErrors.youtube_url}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign_name">Campaign Name *</Label>
                <Input
                  id="campaign_name"
                  value={formData.campaign_name}
                  onChange={(e) => {
                    setCampaignNameTouched(true);
                    handleInputChange('campaign_name', e.target.value);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="artist_tier">Artist Tier</Label>
                <Select value={formData.artist_tier} onValueChange={(value) => handleInputChange('artist_tier', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tier (1-3)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Tier 1</SelectItem>
                    <SelectItem value="2">Tier 2</SelectItem>
                    <SelectItem value="3">Tier 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                    <Users className="w-4 h-4" />
                    New Client
                  </Button>
                </div>
                <div className="relative" ref={clientDropdownRef}>
                  <Input
                    id="client_search"
                    placeholder={selectedClient ? `${selectedClient.name} - ${selectedClient.company || 'No company'}` : "Search for a client..."}
                    value={clientSearch}
                    ref={inputRef}
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
                              className={`w-full justify-start text-left ${
                                index === highlightedClientIndex ? 'bg-accent border-2 border-primary' : ''
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
                            <div className="border-t pt-2 mt-2 bg-popover">
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
                                <Users className="w-4 h-4 mr-2" />
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
                              <Users className="w-4 h-4 mr-2" />
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
                      onClick={async () => {
                        if (!newClientData.name) {
                          toast({
                            title: "Error",
                            description: "Client name is required.",
                            variant: "destructive",
                          });
                          return;
                        }

                        setCreatingClient(true);
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
                            handleInputChange('client_id', result.data.id);
                            setClientSearch('');
                            setShowNewClientForm(false);
                            setNewClientData({ name: '', email: '', company: '' });
                            toast({
                              title: "Client created",
                              description: "Client added and selected.",
                            });
                          }
                        } catch (error) {
                          console.error('Error creating client:', error);
                          toast({
                            title: "Error",
                            description: "Failed to create client. Please try again.",
                            variant: "destructive",
                          });
                        } finally {
                          setCreatingClient(false);
                        }
                      }}
                      className="w-full"
                      disabled={!newClientData.name || creatingClient}
                    >
                      {creatingClient ? "Creating..." : "Create Client"}
                    </Button>
                  </div>
                </Card>
              )}
              
            <MultiServiceTypeSelector
              serviceTypes={serviceTypes}
              onServiceTypesChange={setServiceTypes}
            />
            
            {/* Salesperson - moved to Step 1 for better UX */}
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
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No salespersons available
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {/* Start Date - moved to Step 1 for better UX */}
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
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Campaign Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sale_price">Sale Price ($)</Label>
                  <Input
                    id="sale_price"
                    type="number"
                    step="0.01"
                    value={formData.sale_price}
                    onChange={(e) => handleInputChange('sale_price', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="genre">Genre</Label>
                  <Select value={formData.genre} onValueChange={(value) => handleInputChange('genre', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select genre" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENRE_OPTIONS.map((genre) => (
                        <SelectItem key={genre} value={genre}>
                          {genre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        type="button"
                        variant="outline" 
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.end_date ? format(formData.end_date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={formData.end_date}
                        onSelect={(date) => {
                          if (date) {
                            handleInputChange('end_date', date);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Campaign Status</Label>
                  <Select value={formData.status} onValueChange={(value: 'active' | 'pending') => handleInputChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending (Unreleased)</SelectItem>
                      <SelectItem value="active">Active (Song is out)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="desired_daily">Desired Daily Views (Auto-calculated)</Label>
                <Input
                  id="desired_daily"
                  type="number"
                  placeholder="Will auto-calculate from total goals and dates"
                  value={formData.desired_daily}
                  onChange={(e) => handleInputChange('desired_daily', e.target.value)}
                  disabled={Boolean(serviceTypes.some(st => st.goal_views > 0) && formData.start_date && formData.end_date)}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Technical Setup</h3>
              <div className="space-y-2">
                <Label htmlFor="comments_sheet_url">Comments Sheet URL</Label>
                <Input
                  id="comments_sheet_url"
                  value={formData.comments_sheet_url}
                  onChange={(e) => handleInputChange('comments_sheet_url', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="like_server">Like Server</Label>
                  <Select value={formData.like_server} onValueChange={(value) => handleInputChange('like_server', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select like server" />
                    </SelectTrigger>
                    <SelectContent>
                      {LIKE_SERVER_OPTIONS.map((server) => (
                        <SelectItem key={server} value={server}>
                          {server}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comment_server">Comment Server</Label>
                  <Select value={formData.comment_server} onValueChange={(value) => handleInputChange('comment_server', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select comment server" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMENT_SERVER_OPTIONS.map((server) => (
                        <SelectItem key={server} value={server}>
                          {server}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wait_time_seconds">Wait Time (seconds)</Label>
                <Input
                  id="wait_time_seconds"
                  type="number"
                  value={formData.wait_time_seconds}
                  onChange={(e) => handleInputChange('wait_time_seconds', e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Review & Launch</h3>
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div><strong>Campaign Name:</strong> {formData.campaign_name}</div>
                  <div><strong>YouTube URL:</strong> {formData.youtube_url}</div>
                  <div><strong>Service Types:</strong> {serviceTypes.map(st => {
                    const label = SERVICE_TYPES.find(type => type.value === st.service_type)?.label || st.custom_service_type || 'Unknown';
                    return `${label} (${st.goal_views.toLocaleString()} views)`;
                  }).join(', ')}</div>
                  <div><strong>Total Goal Views:</strong> {serviceTypes.reduce((sum, st) => sum + st.goal_views, 0).toLocaleString()}</div>
                  <div><strong>Desired Daily:</strong> {formData.desired_daily ? Number(formData.desired_daily).toLocaleString() : 'Not set'}</div>
                  <div><strong>Sale Price:</strong> {formData.sale_price ? `$${formData.sale_price}` : 'Not set'}</div>
                  <div><strong>Start Date:</strong> {formData.start_date ? format(formData.start_date, "PPP") : "Not set"}</div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={step === 1}
            >
              Previous
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              {step < 4 ? (
                <Button 
                  onClick={handleNext}
                  disabled={!isStepValid(step)}
                >
                  Next
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? "Creating..." : "Create Campaign"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};