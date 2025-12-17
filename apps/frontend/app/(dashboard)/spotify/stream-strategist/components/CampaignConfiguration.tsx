"use client"

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { supabase } from "../integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ClientSelector } from "./ClientSelector";
import { useToast } from "../hooks/use-toast";
import { cn } from "../lib/utils";
import { Loader2 } from "lucide-react";
import { 
  ArrowLeft, 
  ArrowRight, 
  Zap, 
  Target, 
  DollarSign,
  CalendarIcon,
  Music,
  Sparkles
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const campaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  client: z.string().optional(), // Backward compatibility (unused in UI)
  client_id: z.string().optional(),
  track_url: z.string().url("Please enter a valid Spotify URL"),
  sfa_url: z.string().url("Please enter a valid URL").optional().or(z.literal("")), // NEW: Spotify for Artists URL
  track_name: z.string().optional(),
  stream_goal: z.number().min(1, "Stream goal must be greater than 0"),
  budget: z.number().min(1, "Budget must be greater than 0"),
  sub_genre: z.string().min(1, "At least one genre is required"),
  start_date: z.string().min(1, "Start date is required"),
  duration_days: z.number().min(1, "Duration must be at least 1 day").max(365, "Duration cannot exceed 365 days"),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

interface CampaignBuilderProps {
  onNext: (data: CampaignFormData) => void;
  onBack?: () => void;
  initialData?: Partial<CampaignFormData>;
}

import { UNIFIED_GENRES } from "../lib/constants";

const popularGenres = UNIFIED_GENRES;

export default function CampaignConfiguration({ onNext, onBack, initialData }: CampaignBuilderProps) {
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    initialData?.sub_genre ? initialData.sub_genre.split(', ') : []
  );
  const [trackName, setTrackName] = useState(initialData?.track_name || "");
  const [selectedClientId, setSelectedClientId] = useState(initialData?.client_id || "");
  const [clientName, setClientName] = useState("");
  const [clientCreditBalance, setClientCreditBalance] = useState<number>(0);
  const [creditsToAllocate, setCreditsToAllocate] = useState<number>(0);
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialData?.start_date ? new Date(`${initialData.start_date}T12:00:00`) : undefined
  );
  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Initialize form FIRST before using setValue in useEffect
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      duration_days: 90,
      // Map submission data to campaign form
        // Map submission data to campaign form, specifically handling client auto-population
        client_id: initialData?.client_id || '',
        budget: initialData?.budget || (initialData as any)?.price_paid || 0,
      ...initialData
    }
  });
  
  // Fetch client credit balance when client is selected
  useEffect(() => {
    if (!selectedClientId) {
      setClientCreditBalance(0);
      setCreditsToAllocate(0);
      return;
    }

    const fetchClientData = async () => {
      try {
        const { data: client, error } = await supabase
          .from('clients')
          .select('name, credit_balance')
          .eq('id', selectedClientId)
          .single();

        if (error) throw error;

        if (client) {
          setClientName(client.name);
          setClientCreditBalance(client.credit_balance || 0);
        }
      } catch (error) {
        console.error('Error fetching client data:', error);
      }
    };

    fetchClientData();
  }, [selectedClientId]);

  // Auto-populate client from submission or existing campaign data
  useEffect(() => {
    if (!initialData) return;
    const submissionData = initialData as any;

    const incomingClientId: string | undefined = submissionData.client_id;
    const incomingClientName: string | undefined = submissionData.client_name || submissionData.client || submissionData.brand_name;

    // If we have a client_id already, we may load its name in a separate effect
    if (incomingClientId && incomingClientId !== selectedClientId) {
      setSelectedClientId(incomingClientId);
      setValue('client_id', incomingClientId);
    }

    // If we don't have a client_id yet but we do have a name, try to resolve it
    if (!incomingClientId && incomingClientName) {
      const nameToResolve = String(incomingClientName).trim();
      if (!nameToResolve) return;

      const resolveClientId = async () => {
        try {
          // Case-insensitive exact match first
          let { data: client } = await supabase
            .from('clients')
            .select('id, name')
            .ilike('name', nameToResolve)
            .maybeSingle();

          // If not found, try prefix match as a fallback
          if (!client) {
            const { data: candidates } = await supabase
              .from('clients')
              .select('id, name')
              .ilike('name', `${nameToResolve}%`)
              .limit(1);
            client = candidates?.[0];
          }

          if (client) {
            setSelectedClientId(client.id);
            setValue('client_id', client.id);
            setClientName(client.name);
          }
        } catch (error) {
          console.log('Could not resolve client_id:', error);
        }
      };

      resolveClientId();
    }
  }, [initialData, setValue, clientName, selectedClientId]);

  // Auto-populate track data when initialData has track_url
  useEffect(() => {
    if (initialData?.track_url && !trackName) {
      handleTrackUrlChange(initialData.track_url);
    }
  }, [initialData?.track_url]);

  // Reset form when initialData changes (for submission review)
  useEffect(() => {
    if (initialData) {
      // Map submission data to form fields
      const mappedData = {
        budget: initialData.budget || (initialData as any)?.price_paid || 0,
        stream_goal: initialData.stream_goal || 0,
        start_date: initialData.start_date || '',
        duration_days: initialData.duration_days || 90,
        name: initialData.name || '',
        track_url: initialData.track_url || '',
        sub_genre: initialData.sub_genre || ''
      };
      
      // Reset form with mapped data
      Object.entries(mappedData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          setValue(key as any, value);
        }
      });

      // Set start date state
      if (initialData.start_date) {
        setStartDate(new Date(`${initialData.start_date}T12:00:00`));
      }

      // Set genres if available
      if (initialData.sub_genre) {
        const genres = initialData.sub_genre.split(', ').filter(g => g.trim());
        setSelectedGenres(genres);
        setValue("sub_genre", genres.join(', '));
      }
    }
  }, [initialData, setValue]);

  // Load client name if we have a client_id from submission data
  useEffect(() => {
    const loadClientName = async () => {
      if (selectedClientId && !clientName) {
        try {
          const { data: client } = await supabase
            .from('clients')
            .select('name')
            .eq('id', selectedClientId)
            .single();
          if (client) {
            setClientName(client.name);
          }
        } catch (error) {
          console.log('Could not load client name:', error);
        }
      }
    };
    loadClientName();
  }, [selectedClientId, clientName]);

  const watchedValues = watch();

  const onSubmit = async (data: CampaignFormData) => {
    console.log('Form submission started with data:', data);
    console.log('Current selectedClientId:', selectedClientId);
    console.log('Current selectedGenres:', selectedGenres);
    
    setIsSubmitting(true);
    
    try {
      // Validate client selection
      if (!selectedClientId) {
        toast({
          title: "Client Required",
          description: "Please select a client to continue",
          variant: "destructive",
        });
        // Scroll to client selector
        document.getElementById('client')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      // Validate genre selection
      if (selectedGenres.length === 0) {
        toast({
          title: "Genre Required",
          description: "Please select at least one genre to continue",
          variant: "destructive",
        });
        // Scroll to genre selection
        document.querySelector('[data-testid="genre-selection"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      // Check if there are any playlists available
      console.log('Checking playlist availability...');
      const { data: playlists, error: playlistError } = await supabase
        .from('playlists')
        .select('*, vendor:vendors(*)')
        .limit(1);
      
      if (playlistError) {
        console.error('Database error checking playlists:', playlistError);
        toast({
          title: "Database Error",
          description: "Failed to check playlist availability. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      if (!playlists || playlists.length === 0) {
        console.log('No playlists available in database');
        toast({
          title: "No Playlists Available",
          description: "Please add playlists first in the Vendors & Playlists section.",
          variant: "destructive",
        });
        return;
      }
      
      console.log('Successfully found playlists:', playlists.length);
      
      const finalData = { 
        ...data, 
        client_id: selectedClientId,
        sub_genre: selectedGenres.join(', '), 
        track_name: trackName,
        credits_allocated: creditsToAllocate,
        client_credit_balance: clientCreditBalance
      };
      
      console.log('Moving to AI Recommendations with data:', finalData);
      
      toast({
        title: "Moving to AI Recommendations",
        description: "Processing your campaign configuration...",
      });
      
      // Small delay to show the toast
      setTimeout(() => {
        onNext(finalData);
      }, 500);
      
    } catch (error) {
      console.error('Unexpected error during form submission:', error);
      toast({
        title: "Unexpected Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => {
      let newGenres;
      if (prev.includes(genre)) {
        newGenres = prev.filter(g => g !== genre);
      } else if (prev.length < 3) {
        newGenres = [...prev, genre];
      } else {
        return prev;
      }
      
      // Update the form field with the joined genres
      setValue("sub_genre", newGenres.join(', '));
      return newGenres;
    });
  };

  const handleTrackUrlChange = async (url: string) => {
    setValue("track_url", url);
    
    if (url.includes('spotify.com/track/')) {
      try {
        const trackId = url.split('/track/')[1]?.split('?')[0];
        if (trackId) {
          // Use the existing Spotify Web API route
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002';
          const response = await fetch(`${apiBaseUrl}/api/spotify-web-api/track/${trackId}`);
          
          if (!response.ok) {
            console.error('Failed to fetch track data:', response.statusText);
            toast({
              title: "Could not fetch track data",
              description: "Please enter the campaign name manually",
              variant: "destructive",
            });
            return;
          }
          
          const result = await response.json();
          
          if (result.success && result.data?.name && result.data?.artists?.[0]?.name) {
            const campaignName = `${result.data.artists[0].name} - ${result.data.name}`;
            setTrackName(result.data.name);
            setValue("track_name", result.data.name);
            setValue("name", campaignName); // Auto-populate campaign name
            
            toast({
              title: "Track loaded!",
              description: `${campaignName}`,
            });
            
            // Auto-select genres from Spotify data if available
            if (result.data.genres && result.data.genres.length > 0) {
              const spotifyGenres = result.data.genres.filter((genre: string) => 
                popularGenres.includes(genre)
              ).slice(0, 3);
              
              if (spotifyGenres.length > 0) {
                setSelectedGenres(spotifyGenres);
                setValue("sub_genre", spotifyGenres.join(', '));
              }
            }
          }
        }
      } catch (error) {
        console.log("Could not auto-fetch track data:", error);
      }
    }
  };

  const calculateCPSt = () => {
    if (watchedValues.budget && watchedValues.stream_goal) {
      return (watchedValues.budget / watchedValues.stream_goal).toFixed(4);
    }
    return "0.0000";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold gradient-primary bg-clip-text text-transparent">
          Campaign Configuration
        </h1>
        <p className="text-muted-foreground">
          Set up your Spotify playlisting campaign details
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Hidden field to register genres for validation */}
        <input type="hidden" {...register("sub_genre")} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Music className="w-5 h-5 text-primary" />
                  <span>Campaign Details</span>
                </CardTitle>
                <CardDescription>
                  Basic information about your campaign
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="name">Campaign Name *</Label>
                     <Input
                       id="name"
                       {...register("name")}
                       placeholder="Will auto-populate from Spotify URL"
                       className={errors.name ? "border-destructive" : ""}
                     />
                     {errors.name && (
                       <p className="text-sm text-destructive">{errors.name.message}</p>
                     )}
                   </div>
                  
                    <div className="space-y-2">
                      <Label htmlFor="client">Client *</Label>
                      {clientName ? (
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                          <span className="font-medium">{clientName}</span>
                          {clientCreditBalance > 0 && (
                            <Badge variant="secondary" className="bg-green-50 text-green-700">
                              ${clientCreditBalance} credits
                            </Badge>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                              onClick={() => {
                                setClientName("");
                                setSelectedClientId("");
                                setValue('client_id', '');
                                setClientCreditBalance(0);
                                setCreditsToAllocate(0);
                              }}
                          >
                            Change
                          </Button>
                        </div>
                      ) : (
                        <ClientSelector
                          value={selectedClientId}
                          onChange={(clientId) => {
                            console.log('Client selector onChange called with:', clientId);
                            setSelectedClientId(clientId);
                            setValue('client_id', clientId);
                          }}
                          placeholder="Select or add client..."
                        />
                      )}
                       {!selectedClientId && (
                         <p className="text-sm text-destructive">Please select a client</p>
                       )}
                       
                       {/* Credit Allocation */}
                       {clientName && clientCreditBalance > 0 && (
                         <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md space-y-2">
                           <div className="flex items-center justify-between">
                             <Label className="text-sm font-medium text-green-900">
                               Allocate Credits (Available: ${clientCreditBalance})
                             </Label>
                           </div>
                           <Input
                             type="number"
                             min={0}
                             max={clientCreditBalance}
                             value={creditsToAllocate}
                             onChange={(e) => {
                               const value = parseFloat(e.target.value) || 0;
                               setCreditsToAllocate(Math.min(value, clientCreditBalance));
                             }}
                             placeholder="Enter amount to use from credits"
                             className="bg-white"
                           />
                           {creditsToAllocate > 0 && (
                             <p className="text-xs text-green-700">
                               Campaign cost will be reduced by ${creditsToAllocate}
                             </p>
                           )}
                         </div>
                       )}
                    </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="track_url">Spotify Track URL *</Label>
                  <Input
                    id="track_url"
                    placeholder="https://open.spotify.com/track/..."
                    className={errors.track_url ? "border-destructive" : ""}
                    defaultValue={initialData?.track_url}
                    {...register("track_url", { onChange: (e) => handleTrackUrlChange(e.target.value) })}
                  />
                  {errors.track_url && (
                    <p className="text-sm text-destructive">{errors.track_url.message}</p>
                  )}
                  {trackName && (
                    <p className="text-sm text-accent">✓ Track: {trackName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sfa_url">Spotify for Artists URL (Optional)</Label>
                  <Input
                    id="sfa_url"
                    placeholder="https://artists.spotify.com/c/song/..."
                    className={errors.sfa_url ? "border-destructive" : ""}
                    defaultValue={(initialData as any)?.sfa_url}
                    {...register("sfa_url")}
                  />
                  {errors.sfa_url && (
                    <p className="text-sm text-destructive">{errors.sfa_url.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Link to Spotify for Artists dashboard for this track
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Price & Margin Analysis */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-secondary" />
                  <span>Price & Margin Analysis</span>
                </CardTitle>
                <CardDescription>
                  Set pricing with 40% minimum margin requirement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stream_goal">Stream Goal *</Label>
                    <Input
                      id="stream_goal"
                      type="number"
                      {...register("stream_goal", { valueAsNumber: true })}
                      placeholder="100000"
                      className={errors.stream_goal ? "border-destructive" : ""}
                    />
                    {errors.stream_goal && (
                      <p className="text-sm text-destructive">{errors.stream_goal.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="budget">Price Paid (USD) *</Label>
                    <Input
                      id="budget"
                      type="number"
                      step="0.01"
                      {...register("budget", { valueAsNumber: true })}
                      placeholder="2500.00"
                      className={errors.budget ? "border-destructive" : ""}
                    />
                    {errors.budget && (
                      <p className="text-sm text-destructive">{errors.budget.message}</p>
                    )}
                    {watchedValues.budget && (
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Estimated costs (60%):</span>
                          <span>${(watchedValues.budget * 0.6).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Target margin (40%):</span>
                          <span className="text-green-600">${(watchedValues.budget * 0.4).toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="start_date">Start Date *</Label>
                     <Popover open={isStartDateOpen} onOpenChange={setIsStartDateOpen}>
                       <PopoverTrigger asChild>
                         <Button
                           variant="outline"
                           className={cn(
                             "w-full justify-start text-left font-normal",
                             !startDate && "text-muted-foreground",
                             errors.start_date && "border-destructive"
                           )}
                         >
                           <CalendarIcon className="mr-2 h-4 w-4" />
                           {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                         </Button>
                       </PopoverTrigger>
                       <PopoverContent className="w-auto p-0" align="start">
                         <Calendar
                           mode="single"
                           selected={startDate}
                           onSelect={(date) => {
                             setStartDate(date);
                             if (date) {
                               setValue("start_date", format(date, "yyyy-MM-dd"));
                               setIsStartDateOpen(false);
                             }
                           }}
                           initialFocus
                           className={cn("p-3 pointer-events-auto")}
                         />
                       </PopoverContent>
                     </Popover>
                     {errors.start_date && (
                       <p className="text-sm text-destructive">{errors.start_date.message}</p>
                     )}
                   </div>
                  
                   <div className="space-y-2">
                     <Label htmlFor="duration_days">Duration (Days) *</Label>
                     <Select 
                       value={watchedValues.duration_days?.toString() || "90"}
                       onValueChange={(value) => setValue("duration_days", parseInt(value))}
                     >
                       <SelectTrigger className={errors.duration_days ? "border-destructive" : ""}>
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="30">30 days</SelectItem>
                         <SelectItem value="60">60 days</SelectItem>
                         <SelectItem value="90">90 days (recommended)</SelectItem>
                         <SelectItem value="120">120 days</SelectItem>
                       </SelectContent>
                     </Select>
                     {errors.duration_days && (
                       <p className="text-sm text-destructive">{errors.duration_days.message}</p>
                     )}
                   </div>
                </div>
              </CardContent>
            </Card>

            {/* Genre Selection */}
            <Card className="bg-card/50 border-border/50" data-testid="genre-selection">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  <span>Genre Selection (1-3 genres)</span>
                </CardTitle>
                <CardDescription>
                  Choose up to 3 genres for AI playlist matching
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {popularGenres.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => toggleGenre(genre)}
                      className={`px-3 py-1 rounded-full text-sm transition-all hover:scale-105 ${
                        selectedGenres.includes(genre)
                          ? 'bg-primary text-primary-foreground shadow-neon'
                          : 'bg-muted hover:bg-accent/20 text-muted-foreground hover:text-accent-foreground'
                      }`}
                      disabled={!selectedGenres.includes(genre) && selectedGenres.length >= 3}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Selected genres ({selectedGenres.length}/3): {selectedGenres.join(', ') || 'None'}
                </p>
                {selectedGenres.length === 0 && (
                  <p className="text-sm text-destructive">Please select at least one genre</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Summary */}
          <div className="space-y-6">
            <Card className="bg-gradient-glow border-primary/20 sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-accent" />
                  <span>Campaign Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Stream Goal</span>
                    <span className="font-mono text-sm">
                      {watchedValues.stream_goal?.toLocaleString() || "0"}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Price Paid</span>
                    <span className="font-mono text-sm">
                      ${watchedValues.budget?.toLocaleString() || "0"}
                    </span>
                  </div>
                  
                  {creditsToAllocate > 0 && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Credits Applied</span>
                        <span className="font-mono text-sm text-green-600">
                          -${creditsToAllocate.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-y border-border/30 py-2">
                        <span className="text-sm font-semibold">Net Cost</span>
                        <span className="font-mono text-sm font-semibold text-primary">
                          ${((watchedValues.budget || 0) - creditsToAllocate).toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Target Margin</span>
                    <span className="font-mono text-sm text-green-600">
                      ${(((watchedValues.budget || 0) - creditsToAllocate) * 0.4).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Duration</span>
                    <span className="font-mono text-sm">
                      {watchedValues.duration_days || 0} days
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center border-t border-border/30 pt-3">
                    <span className="text-sm text-muted-foreground">Cost per Stream</span>
                    <span className="font-mono text-sm text-primary">
                      ${calculateCPSt()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Cost per 1k Streams</span>
                    <span className="font-mono text-sm text-accent">
                      ${((parseFloat(calculateCPSt()) || 0) * 1000).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Genres</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedGenres.length > 0 ? selectedGenres.map(genre => (
                        <Badge key={genre} variant="outline" className="text-xs">
                          {genre}
                        </Badge>
                      )) : (
                        <Badge variant="outline" className="text-xs">
                          None selected
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-6 border-t border-border/30">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onBack}
            disabled={!onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <Button 
            type="submit" 
            className="bg-gradient-primary hover:opacity-80 shadow-glow"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Continue to AI Recommendations
                <Zap className="w-4 h-4 ml-2" />
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}








