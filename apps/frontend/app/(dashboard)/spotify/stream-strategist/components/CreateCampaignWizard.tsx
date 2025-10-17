"use client"

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  Trash2, 
  Music, 
  Users, 
  DollarSign, 
  Calendar,
  ArrowRight,
  ArrowLeft,
  Check,
  ExternalLink
} from 'lucide-react';
import { useClients } from '../hooks/useClients';
import { useVendors } from '../hooks/useVendors';
import { useCreateCampaign } from '../hooks/useCampaigns';
import { toast } from '@/components/ui/use-toast';

// Schema for the multi-step campaign form
const songSchema = z.object({
  track_url: z.string().optional(),
  sfa_link: z.string().optional(),
  campaign_name: z.string().min(1, 'Song/campaign name is required'),
  goal: z.string().min(1, 'Stream goal is required'),
  budget: z.string().min(1, 'Budget is required'),
  vendor_id: z.string().optional(),
}).refine(
  (data) => {
    // At least one URL must be provided
    return (data.track_url && data.track_url.length > 0) || (data.sfa_link && data.sfa_link.length > 0);
  },
  {
    message: 'Either Spotify Track URL or SFA Link is required',
    path: ['track_url'], // Show error on track_url field
  }
).refine(
  (data) => {
    // If track_url is provided, validate it
    if (data.track_url && data.track_url.length > 0) {
      try {
        new URL(data.track_url);
        return data.track_url.includes('open.spotify.com/track/');
      } catch {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Must be a valid Spotify track URL (https://open.spotify.com/track/...)',
    path: ['track_url'],
  }
).refine(
  (data) => {
    // If sfa_link is provided, validate it
    if (data.sfa_link && data.sfa_link.length > 0) {
      try {
        new URL(data.sfa_link);
        return data.sfa_link.includes('artists.spotify.com');
      } catch {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Must be a valid Spotify for Artists URL (https://artists.spotify.com/...)',
    path: ['sfa_link'],
  }
);

const campaignSchema = z.object({
  // Step 1: Basic Info
  client_id: z.string().min(1, 'Client is required'),
  campaign_group_name: z.string().min(1, 'Campaign name is required'),
  artist_name: z.string().min(1, 'Artist name is required'),
  start_date: z.string().min(1, 'Start date is required'),
  
  // Step 2: Songs
  songs: z.array(songSchema).min(1, 'At least one song is required'),
  
  // Step 3: Budget & Goals
  total_budget: z.string().min(1, 'Total budget is required'),
  
  // Step 4: Additional Info
  genre: z.string().optional(),
  salesperson: z.string().optional(),
  notes: z.string().optional(),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

const STEPS = [
  { id: 1, name: 'Basic Info', icon: Users },
  { id: 2, name: 'Add Songs', icon: Music },
  { id: 3, name: 'Budget & Goals', icon: DollarSign },
  { id: 4, name: 'Review & Submit', icon: Check },
];

interface CreateCampaignWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCampaignWizard({ open, onOpenChange }: CreateCampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const { data: clients = [] } = useClients();
  const { data: vendors = [] } = useVendors();
  const createCampaign = useCreateCampaign();

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      client_id: '',
      campaign_group_name: '',
      artist_name: '',
      start_date: new Date().toISOString().split('T')[0],
      songs: [{
        track_url: '',
        sfa_link: '',
        campaign_name: '',
        goal: '',
        budget: '',
        vendor_id: '',
      }],
      total_budget: '',
      genre: '',
      salesperson: '',
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'songs',
  });

  const activeVendors = vendors.filter(v => v.is_active);

  const onSubmit = async (data: CampaignFormData) => {
    try {
      await createCampaign.mutateAsync(data);
      toast({
        title: 'Campaign created successfully!',
        description: `Campaign "${data.campaign_group_name}" has been created.`,
      });
      form.reset();
      setCurrentStep(1);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error creating campaign',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const nextStep = async () => {
    let fieldsToValidate: any[] = [];
    
    switch (currentStep) {
      case 1:
        fieldsToValidate = ['client_id', 'campaign_group_name', 'artist_name', 'start_date'];
        break;
      case 2:
        fieldsToValidate = ['songs'];
        break;
      case 3:
        fieldsToValidate = ['total_budget'];
        break;
    }

    const isValid = await form.trigger(fieldsToValidate as any);
    if (isValid && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;
  const selectedClient = clients.find(c => c.id === form.watch('client_id'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create New Campaign</DialogTitle>
          <DialogDescription>
            Follow the steps to create a comprehensive campaign for your client
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`
                        flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                        ${isActive ? 'border-primary bg-primary text-primary-foreground' : ''}
                        ${isCompleted ? 'border-green-500 bg-green-500 text-white' : ''}
                        ${!isActive && !isCompleted ? 'border-muted-foreground/30 text-muted-foreground' : ''}
                      `}
                    >
                      {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span className={`text-xs mt-1 font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                      {step.name}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`h-[2px] flex-1 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                  )}
                </div>
              );
            })}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Campaign Basic Information
                </h3>

                <FormField
                  control={form.control}
                  name="client_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                              {client.emails && client.emails.length > 0 && (
                                <span className="text-muted-foreground text-xs ml-2">
                                  ({client.emails[0]})
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The client this campaign is for
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="campaign_group_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Segan - DNBMF Campaign" {...field} />
                      </FormControl>
                      <FormDescription>
                        A descriptive name for this campaign
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="artist_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Artist Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Segan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 2: Add Songs */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Music className="h-5 w-5" />
                    Add Songs to Campaign
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({
                      track_url: '',
                      sfa_link: '',
                      campaign_name: '',
                      goal: '',
                      budget: '',
                      vendor_id: '',
                    })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Song
                  </Button>
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <Card key={field.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">Song #{index + 1}</CardTitle>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <FormField
                          control={form.control}
                          name={`songs.${index}.track_url`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Spotify Track URL</FormLabel>
                              <FormControl>
                                <div className="flex gap-2">
                                  <Input 
                                    placeholder="https://open.spotify.com/track/..." 
                                    {...field}
                                  />
                                  {field.value && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => window.open(field.value, '_blank')}
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`songs.${index}.sfa_link`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Spotify for Artists (SFA) Link</FormLabel>
                              <FormControl>
                                <div className="flex gap-2">
                                  <Input 
                                    placeholder="https://artists.spotify.com/c/artist/.../song/.../stats" 
                                    {...field}
                                  />
                                  {field.value && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => window.open(field.value, '_blank')}
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </FormControl>
                              <FormDescription className="text-xs">
                                Either Spotify Track URL or SFA Link is required
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`songs.${index}.campaign_name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Song Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., DNBMF" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name={`songs.${index}.goal`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Stream Goal *</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="100000" 
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`songs.${index}.budget`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Budget ($) *</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.01"
                                    placeholder="500.00" 
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name={`songs.${index}.vendor_id`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Assign Vendor (Optional)</FormLabel>
                              <Select 
                                onValueChange={(value) => {
                                  // Convert "unassigned" back to empty string for the form
                                  field.onChange(value === "unassigned" ? "" : value);
                                }} 
                                value={field.value || "unassigned"}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select vendor or leave blank" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="unassigned">No vendor assigned</SelectItem>
                                  {activeVendors.map((vendor) => (
                                    <SelectItem key={vendor.id} value={vendor.id}>
                                      {vendor.name}
                                      {vendor.cost_per_1k_streams && (
                                        <span className="text-muted-foreground text-xs ml-2">
                                          (${vendor.cost_per_1k_streams}/1k)
                                        </span>
                                      )}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription className="text-xs">
                                You can assign vendors now or later
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Budget & Goals */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Budget & Additional Info
                </h3>

                <FormField
                  control={form.control}
                  name="total_budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Campaign Budget ($) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="1000.00" 
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Total budget across all songs in this campaign
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="genre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Genre</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Hip Hop, Electronic" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="salesperson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salesperson</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any additional notes about this campaign..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Check className="h-5 w-5" />
                  Review & Submit
                </h3>

                <Card>
                  <CardHeader>
                    <CardTitle>Campaign Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Client</p>
                      <p className="text-lg">{selectedClient?.name}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Campaign Name</p>
                      <p className="text-lg">{form.watch('campaign_group_name')}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Artist</p>
                      <p className="text-lg">{form.watch('artist_name')}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Number of Songs</p>
                      <p className="text-lg">{form.watch('songs').length} song(s)</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                      <p className="text-lg font-bold">${form.watch('total_budget')}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Stream Goal</p>
                      <p className="text-lg font-bold">
                        {form.watch('songs').reduce((sum, song) => sum + (parseInt(song.goal) || 0), 0).toLocaleString()} streams
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Songs</p>
                      <div className="space-y-2">
                        {form.watch('songs').map((song, index) => (
                          <Badge key={index} variant="secondary" className="mr-2">
                            {song.campaign_name} - {parseInt(song.goal).toLocaleString()} streams - ${song.budget}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {currentStep < 4 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={createCampaign.isPending}
                >
                  {createCampaign.isPending ? 'Creating...' : 'Create Campaign'}
                  <Check className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


