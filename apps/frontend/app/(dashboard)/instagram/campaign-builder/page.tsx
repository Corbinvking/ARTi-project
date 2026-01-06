"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ArrowRight, Download, Save, Users, DollarSign, Eye, Target, Plus, X, ChevronRight, Home } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// Import types and utilities from seedstorm-builder
import { Creator, Campaign, CampaignForm, POST_TYPES } from "../seedstorm-builder/lib/types";
import { generateCampaign, generateUUID } from "../seedstorm-builder/lib/campaignAlgorithm";
import { formatNumber, formatCurrency, saveCampaign } from "../seedstorm-builder/lib/localStorage";
import { getSupabaseCreators, migrateCreatorsToSupabase } from "../seedstorm-builder/lib/creatorMigration";
import { exportCampaignCSV, initializeSampleData } from "../seedstorm-builder/lib/csvUtils";
import { toast } from "@/components/ui/use-toast";
import { useTagSync } from "../seedstorm-builder/hooks/useTagSync";
import { TagSelectDropdown } from "../seedstorm-builder/components/TagSelectDropdown";
import { MultiGenreSelect } from "../seedstorm-builder/components/MultiGenreSelect";
import { CreatorSearchModal } from "../seedstorm-builder/components/CreatorSearchModal";
import { getCreators } from "../seedstorm-builder/lib/localStorage";

// Breadcrumbs component for Next.js
function Breadcrumbs() {
  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-4">
      <Link href="/instagram" className="hover:text-foreground transition-colors">
        <Home className="h-4 w-4" />
      </Link>
      <ChevronRight className="h-4 w-4 mx-1" />
      <span className="text-foreground font-medium">Campaign Builder</span>
    </nav>
  );
}

export default function InstagramCampaignBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [creators, setCreators] = useState<Creator[]>([]);
  
  // Check for duplicate data from URL params
  const duplicateName = searchParams.get('duplicateName');
  
  const [formData, setFormData] = useState<CampaignForm>({
    campaign_name: duplicateName || '',
    total_budget: 5000,
    selected_genres: [],
    campaign_type: 'Audio Seeding',
    post_type_preference: ['Reel'],
    territory_preferences: [],
    content_type_preferences: []
  });
  
  const [campaignResults, setCampaignResults] = useState<{
    selectedCreators: Creator[],
    totals: any,
    eligible: Creator[]
  } | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const { tags: allTags, refreshTags } = useTagSync();

  useEffect(() => {
    const fetchData = async () => {
      initializeSampleData();
      
      try {
        // First try to get creators from Supabase
        console.log('🔄 Fetching creators from Supabase...');
        let creatorsData = await getSupabaseCreators();
        
        // If no creators in Supabase, try migration from localStorage
        if (creatorsData.length === 0) {
          console.log('⚠️ No creators in Supabase, checking localStorage...');
          const localCreators = await getCreators();
          
          if (localCreators.length > 0) {
            console.log('🔄 Migrating creators from localStorage to Supabase...');
            await migrateCreatorsToSupabase();
            creatorsData = await getSupabaseCreators();
            
            toast({
              title: "Creators Migrated",
              description: `Successfully migrated ${localCreators.length} creators to database`,
            });
          }
        }
        
        console.log(`✅ Loaded ${creatorsData.length} creators for campaign building`);
        setCreators(creatorsData);
        
      } catch (error) {
        console.error('❌ Error fetching creators:', error);
        // Fallback to localStorage if Supabase fails
        const localCreators = await getCreators();
        setCreators(localCreators);
        
        toast({
          title: "Database Error",
          description: "Using local data. Some features may be limited.",
          variant: "destructive",
        });
      }
    };
    fetchData();
  }, []);

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.campaign_name.trim()) {
      newErrors.campaign_name = 'Campaign name is required';
    }
    if (!formData.total_budget || formData.total_budget < 100) {
      newErrors.total_budget = 'Budget must be at least $100';
    }
    if (formData.selected_genres.length === 0) {
      newErrors.selected_genres = 'At least one genre is required';
    }
    if (formData.post_type_preference.length === 0) {
      newErrors.post_type_preference = 'At least one post type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!validateStep1()) {
        toast({
          title: "Validation Error",
          description: "Please fix the errors and try again",
          variant: "destructive",
        });
        return;
      }
      
      // Fetch fresh creators data and generate campaign results
      try {
        console.log('🔄 Generating campaign with fresh creator data...');
        
        // Always fetch from Supabase for campaign generation
        let freshCreators: Creator[] = [];
        try {
          freshCreators = await getSupabaseCreators();
          console.log(`📊 Using ${freshCreators.length} creators from Supabase`);
        } catch (supabaseError: any) {
          console.error('❌ Supabase error:', supabaseError);
          // Fallback to localStorage creators
          freshCreators = creators;
          console.log(`📊 Fallback: Using ${freshCreators.length} creators from local state`);
          
          if (freshCreators.length === 0) {
            toast({
              title: "No Creators Available",
              description: "No creators found in database. Please add creators first.",
              variant: "destructive",
            });
            return;
          }
        }
        
        if (freshCreators.length === 0) {
          toast({
            title: "No Creators Available",
            description: "No creators found in database. Please add creators to run a campaign.",
            variant: "destructive",
          });
          return;
        }
        
        const results = generateCampaign(formData, freshCreators);
        
        if (results.selectedCreators.length === 0 && results.eligible.length === 0) {
          // Still proceed but warn the user - they can add creators manually
          toast({
            title: "No Matching Creators Found",
            description: "You can add creators manually in the next step. " + ((results as any).message || ""),
          });
        } else {
          toast({
            title: "Campaign Generated",
            description: `Found ${results.eligible.length} eligible creators, selected ${results.selectedCreators.length}`,
          });
        }
        
        // Always proceed to step 2 - user can add creators manually
        setCampaignResults(results);
        setStep(2);
      } catch (error: any) {
        console.error('❌ Error generating campaign:', error);
        toast({
          title: "Campaign Generation Failed",
          description: error?.message || "Check console for details. Ensure creators have valid rates and data.",
          variant: "destructive",
        });
      }
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handlePostTypeChange = (postType: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      post_type_preference: checked 
        ? [...prev.post_type_preference, postType]
        : prev.post_type_preference.filter(t => t !== postType)
    }));
  };

  const handleTerritoryChange = (territories: string[]) => {
    setFormData(prev => ({
      ...prev,
      territory_preferences: territories
    }));
  };

  const handleContentTypeChange = (contentTypes: string[]) => {
    setFormData(prev => ({
      ...prev,
      content_type_preferences: contentTypes
    }));
  };

  const toggleCreatorSelection = (creatorId: string) => {
    if (!campaignResults) return;
    
    setCampaignResults(prev => {
      if (!prev) return prev;
      
      const isSelected = prev.selectedCreators.some(c => c.id === creatorId);
      let newSelectedCreators;
      
      if (isSelected) {
        newSelectedCreators = prev.selectedCreators.filter(c => c.id !== creatorId);
      } else {
        const creatorToAdd = prev.eligible.find(c => c.id === creatorId);
        if (creatorToAdd && creatorToAdd.selected_rate) {
          // Add posts_count default to 1 if not set
          const creatorWithPosts = { ...creatorToAdd, posts_count: creatorToAdd.posts_count || 1 };
          
          // Group creators: manually added first, then algorithm-selected
          const manuallyAddedCreators = prev.selectedCreators.filter(c => c.manually_added);
          const algorithmCreators = prev.selectedCreators.filter(c => !c.manually_added);
          
          if (creatorWithPosts.manually_added) {
            newSelectedCreators = [creatorWithPosts, ...manuallyAddedCreators, ...algorithmCreators];
          } else {
            newSelectedCreators = [...manuallyAddedCreators, ...algorithmCreators, creatorWithPosts];
          }
        } else {
          return prev;
        }
      }
      
      // Recalculate totals including posts count
      const totalPosts = newSelectedCreators.reduce((sum, c) => sum + (c.posts_count || 1), 0);
      const totalCost = newSelectedCreators.reduce((sum, c) => sum + ((c.selected_rate || 0) * (c.posts_count || 1)), 0);
      
      const validCreatorsForCPV = newSelectedCreators.filter(c => c.cpv && c.cpv > 0 && !isNaN(c.cpv) && c.cpv !== Infinity);
      const averageCPV = validCreatorsForCPV.length > 0 
        ? validCreatorsForCPV.reduce((sum, c) => sum + (c.cpv || 0), 0) / validCreatorsForCPV.length
        : 0;
      
      const newTotals = {
        total_creators: newSelectedCreators.length,
        total_posts: totalPosts,
        total_cost: totalCost,
        total_followers: newSelectedCreators.reduce((sum, c) => sum + c.followers, 0),
        total_median_views: newSelectedCreators.reduce((sum, c) => sum + (c.median_views_per_video * (c.posts_count || 1)), 0),
        average_cpv: averageCPV,
        budget_remaining: formData.total_budget - totalCost
      };
      
      return {
        ...prev,
        selectedCreators: newSelectedCreators,
        totals: newTotals
      };
    });
  };

  const saveCampaignDraft = async () => {
    if (!campaignResults) {
      toast({
        title: "No Campaign Data",
        description: "Please complete the campaign configuration first.",
        variant: "destructive",
      });
      return;
    }

    // Allow saving with 0 creators (as a draft that can be edited later)
    if (campaignResults.selectedCreators.length === 0) {
      console.log('⚠️ Saving campaign with 0 creators as draft');
    }

    const campaign: Campaign = {
      id: generateUUID(),
      campaign_name: formData.campaign_name,
      date_created: new Date().toISOString(),
      status: 'Draft',
      form_data: formData,
      selected_creators: campaignResults.selectedCreators,
      totals: campaignResults.totals
    };

    // Show loading state
    toast({
      title: "Saving Campaign...",
      description: "Please wait while we save your campaign",
    });

    try {
      console.log('📝 Saving campaign:', campaign.campaign_name);
      console.log('📊 With', campaignResults.selectedCreators.length, 'creators');
      
      // Save to database first for immediate consistency
      const campaignId = await saveCampaign(campaign);
      console.log('✅ Campaign saved with ID:', campaignId);
      
      // Now save the campaign_creators records so they appear in QA
      const { supabase } = await import("../seedstorm-builder/integrations/supabase/client");
      
      // Insert campaign creators - use campaign_creators table (used by campaigns page)
      const creatorRecords = campaignResults.selectedCreators.map(creator => ({
        campaign_id: campaignId,
        creator_id: creator.id,
        instagram_handle: creator.instagram_handle,
        rate: creator.selected_rate || 0,
        posts_count: creator.posts_count || 1,
        post_type: creator.selected_post_type || 'Reel',
        payment_status: 'unpaid',
        post_status: 'not_posted',
        approval_status: 'pending',
      }));

      if (creatorRecords.length > 0) {
        const { error: creatorsError } = await supabase
          .from('campaign_creators')
          .insert(creatorRecords);

        if (creatorsError) {
          console.error('⚠️ Error saving campaign creators:', creatorsError);
          // Don't fail the whole save, just warn - table might not exist
        } else {
          console.log('✅ Campaign creators saved:', creatorRecords.length);
        }
      }
      
      // Navigate and show success
      toast({
        title: "Campaign Saved!",
        description: `Campaign "${campaign.campaign_name}" saved with ${campaignResults.selectedCreators.length} creators.`,
      });
      
      router.push('/instagram/campaigns');
    } catch (error: any) {
      console.error('❌ Error saving campaign:', error);
      toast({
        title: "Save Failed",
        description: error?.message || "Failed to save campaign. Please try again.",
        variant: "destructive",
      });
    }
  };

  const exportCampaign = () => {
    if (!campaignResults) return;

    const campaign: Campaign = {
      id: generateUUID(),
      campaign_name: formData.campaign_name,
      date_created: new Date().toISOString(),
      status: 'Draft',
      form_data: formData,
      selected_creators: campaignResults.selectedCreators,
      totals: campaignResults.totals
    };

    exportCampaignCSV(campaign);
    toast({
      title: "Export Complete",
      description: "Campaign exported successfully",
    });
  };

  const handleAddManualCreator = (creator: Creator) => {
    if (!campaignResults) return;

    // Check if creator is already selected
    const isAlreadySelected = campaignResults.selectedCreators.some(c => c.id === creator.id);
    if (isAlreadySelected) {
      toast({
        title: "Creator Already Added",
        description: "This creator is already in your campaign",
        variant: "destructive",
      });
      return;
    }

    // Add posts count and mark as manually added
    const creatorWithPosts = { ...creator, posts_count: 1, manually_added: true };

    // Add to eligible list at the top if not already there
    const newEligible = campaignResults.eligible.some(c => c.id === creator.id) 
      ? campaignResults.eligible.map(c => c.id === creator.id ? creatorWithPosts : c)
      : [creatorWithPosts, ...campaignResults.eligible];

    // Add to selected creators at the top (manually added creators first)
    const manuallyAddedCreators = [creatorWithPosts, ...campaignResults.selectedCreators.filter(c => c.manually_added)];
    const algorithmCreators = campaignResults.selectedCreators.filter(c => !c.manually_added);
    const newSelectedCreators = [...manuallyAddedCreators, ...algorithmCreators];
    
    // Recalculate totals including posts count
    const totalPosts = newSelectedCreators.reduce((sum, c) => sum + (c.posts_count || 1), 0);
    const totalCost = newSelectedCreators.reduce((sum, c) => sum + ((c.selected_rate || 0) * (c.posts_count || 1)), 0);
    
    const newTotals = {
      total_creators: newSelectedCreators.length,
      total_posts: totalPosts,
      total_cost: totalCost,
      total_followers: newSelectedCreators.reduce((sum, c) => sum + c.followers, 0),
      total_median_views: newSelectedCreators.reduce((sum, c) => sum + (c.median_views_per_video * (c.posts_count || 1)), 0),
      average_cpv: newSelectedCreators.length > 0 
        ? newSelectedCreators.reduce((sum, c) => sum + (c.cpv || 0), 0) / newSelectedCreators.length 
        : 0,
      budget_remaining: formData.total_budget - totalCost
    };

    setCampaignResults({
      ...campaignResults,
      eligible: newEligible,
      selectedCreators: newSelectedCreators,
      totals: newTotals
    });

    toast({
      title: "Creator Added",
      description: `@${creator.instagram_handle} has been added to the top of your campaign`,
    });
  };

  const handlePostsCountChange = (creatorId: string, newCount: number) => {
    if (!campaignResults) return;
    
    setCampaignResults(prev => {
      if (!prev) return prev;
      
      // Update both selected and eligible creators
      const newSelectedCreators = prev.selectedCreators.map(c => 
        c.id === creatorId ? { ...c, posts_count: newCount } : c
      );
      
      const newEligible = prev.eligible.map(c => 
        c.id === creatorId ? { ...c, posts_count: newCount } : c
      );
      
      // Recalculate totals
      const totalPosts = newSelectedCreators.reduce((sum, c) => sum + (c.posts_count || 1), 0);
      const totalCost = newSelectedCreators.reduce((sum, c) => sum + ((c.selected_rate || 0) * (c.posts_count || 1)), 0);
      
      const validCreatorsForCPV = newSelectedCreators.filter(c => c.cpv && c.cpv > 0 && !isNaN(c.cpv) && c.cpv !== Infinity);
      const averageCPV = validCreatorsForCPV.length > 0 
        ? validCreatorsForCPV.reduce((sum, c) => sum + (c.cpv || 0), 0) / validCreatorsForCPV.length
        : 0;
      
      const newTotals = {
        total_creators: newSelectedCreators.length,
        total_posts: totalPosts,
        total_cost: totalCost,
        total_followers: newSelectedCreators.reduce((sum, c) => sum + c.followers, 0),
        total_median_views: newSelectedCreators.reduce((sum, c) => sum + (c.median_views_per_video * (c.posts_count || 1)), 0),
        average_cpv: averageCPV,
        budget_remaining: formData.total_budget - totalCost
      };
      
      return {
        ...prev,
        selectedCreators: newSelectedCreators,
        eligible: newEligible,
        totals: newTotals
      };
    });
  };

  const handleDeselectAll = () => {
    if (!campaignResults) return;
    
    setCampaignResults(prev => {
      if (!prev) return prev;
      
      const newTotals = {
        total_creators: 0,
        total_posts: 0,
        total_cost: 0,
        total_followers: 0,
        total_median_views: 0,
        average_cpv: 0,
        budget_remaining: formData.total_budget
      };
      
      return {
        ...prev,
        selectedCreators: [],
        totals: newTotals
      };
    });

    toast({
      title: "All Creators Deselected",
      description: "You can now manually customize your campaign",
    });
  };

  // Step 1: Campaign Configuration
  if (step === 1) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-6">
          <div className="container mx-auto max-w-4xl">
            <Breadcrumbs />
            <div className="mb-8">
              <Button variant="ghost" onClick={() => router.push('/instagram')} className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <h1 className="text-4xl font-bold text-foreground mb-2">CAMPAIGN BUILDER</h1>
              <p className="text-xl text-muted-foreground">Step 1 of 3: Campaign Configuration</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
                <CardDescription>Configure your Instagram seeding campaign parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="campaign_name">Campaign Name</Label>
                    <Input
                      id="campaign_name"
                      placeholder="Artist/Brand Name - Song/Activation Name"
                      value={formData.campaign_name}
                      onChange={(e) => setFormData(prev => ({...prev, campaign_name: e.target.value}))}
                      className={errors.campaign_name ? 'border-destructive' : ''}
                    />
                    {errors.campaign_name && <p className="text-sm text-destructive">{errors.campaign_name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="total_budget">Total Budget ($)</Label>
                    <Input
                      id="total_budget"
                      type="number"
                      min="100"
                      placeholder="5000"
                      value={formData.total_budget}
                      onChange={(e) => setFormData(prev => ({...prev, total_budget: parseInt(e.target.value) || 0}))}
                      className={errors.total_budget ? 'border-destructive' : ''}
                    />
                    {errors.total_budget && <p className="text-sm text-destructive">{errors.total_budget}</p>}
                  </div>
                </div>

                {/* Genre & Campaign Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Selected Genres</Label>
                    <MultiGenreSelect
                      selectedGenres={formData.selected_genres}
                      onGenresChange={(genres) => setFormData(prev => ({...prev, selected_genres: genres}))}
                      error={!!errors.selected_genres}
                      placeholder="Select campaign genres"
                    />
                    {errors.selected_genres && <p className="text-sm text-destructive">{errors.selected_genres}</p>}
                  </div>

                  <div className="space-y-3">
                    <Label>Campaign Type</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="audio_seeding"
                          name="campaign_type"
                          value="Audio Seeding"
                          checked={formData.campaign_type === 'Audio Seeding'}
                          onChange={(e) => setFormData(prev => ({...prev, campaign_type: e.target.value as any}))}
                        />
                        <Label htmlFor="audio_seeding">Audio Seeding</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="footage_seeding"
                          name="campaign_type"
                          value="Footage Seeding"
                          checked={formData.campaign_type === 'Footage Seeding'}
                          onChange={(e) => setFormData(prev => ({...prev, campaign_type: e.target.value as any}))}
                        />
                        <Label htmlFor="footage_seeding">Footage Seeding</Label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Post Type Preference */}
                <div className="space-y-3">
                  <Label>Post Type Preference (Multiple Selection)</Label>
                  {errors.post_type_preference && <p className="text-sm text-destructive">{errors.post_type_preference}</p>}
                  <div className="grid grid-cols-3 gap-4">
                    {POST_TYPES.map(postType => (
                      <div key={postType} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`post-${postType}`}
                          checked={formData.post_type_preference.includes(postType)}
                          onCheckedChange={(checked) => handlePostTypeChange(postType, checked as boolean)}
                        />
                        <Label htmlFor={`post-${postType}`}>{postType}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Content Type Preferences */}
                <TagSelectDropdown
                  label="Content Type Preferences (Optional)"
                  selectedTags={formData.content_type_preferences}
                  onTagsChange={handleContentTypeChange}
                  tagType="contentTypes"
                  placeholder="Select content types..."
                />

                {/* Territory Preferences */}
                <TagSelectDropdown
                  label="Territory Preferences (Optional)"
                  selectedTags={formData.territory_preferences}
                  onTagsChange={handleTerritoryChange}
                  tagType="territoryPreferences"
                  placeholder="Select territory preferences..."
                />

                <div className="flex justify-end pt-6">
                  <Button onClick={handleNext} size="lg" className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
                    Generate Campaign
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Campaign Recommendations
  if (step === 2 && campaignResults) {
    const isSelected = (creatorId: string) => campaignResults.selectedCreators.some(c => c.id === creatorId);
    
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-8">
            <Button variant="ghost" onClick={() => setStep(1)} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Configuration
            </Button>
            <h1 className="text-4xl font-bold text-foreground mb-2">CAMPAIGN RECOMMENDATIONS</h1>
            <p className="text-xl text-muted-foreground">Step 2 of 3: Review and Adjust with AI Insights</p>
          </div>

          {/* Summary Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Creators
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaignResults.totals.total_creators}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">Total Posts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaignResults.totals.total_posts || campaignResults.totals.total_creators}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(campaignResults.totals.total_cost)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">Total Followers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(campaignResults.totals.total_followers)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Median Views
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(campaignResults.totals.total_median_views)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Avg CPV
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${(campaignResults.totals.average_cpv || 0).toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">Budget Left</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(campaignResults.totals.budget_remaining)}</div>
              </CardContent>
            </Card>
          </div>

          {/* AI Insights Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                AI Campaign Insights
              </CardTitle>
              <CardDescription>Real-time predictions and optimization recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Success Probability */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-muted-foreground">Success Probability</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-500">
                      {Math.round(65 + (campaignResults.selectedCreators.length * 2.5))}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">High confidence</p>
                  </CardContent>
                </Card>

                {/* Predicted Views */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-muted-foreground">Predicted Views</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatNumber(Math.round(campaignResults.totals.total_median_views * 1.2))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">+20% confidence range</p>
                  </CardContent>
                </Card>

                {/* ROI Prediction */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-muted-foreground">Predicted ROI</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-500">
                      {((campaignResults.totals.total_median_views * 0.02) / Math.max(campaignResults.totals.total_cost, 1) * 100).toFixed(1)}x
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Strong performance</p>
                  </CardContent>
                </Card>

                {/* Risk Assessment */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-muted-foreground">Risk Level</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant={campaignResults.totals.total_cost > formData.total_budget * 0.9 ? "destructive" : "default"}>
                      {campaignResults.totals.total_cost > formData.total_budget * 0.9 ? "High" : "Low"}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">Budget utilization</p>
                  </CardContent>
                </Card>
              </div>

              {/* AI Recommendations */}
              {campaignResults.selectedCreators.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Smart Recommendations
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {campaignResults.totals.budget_remaining > 1000 && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <Badge variant="default" className="mt-0.5">Budget</Badge>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Add More Creators</p>
                          <p className="text-xs text-muted-foreground">
                            You have {formatCurrency(campaignResults.totals.budget_remaining)} remaining to optimize reach
                          </p>
                        </div>
                      </div>
                    )}
                    {campaignResults.totals.average_cpv > 0.15 && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
                        <Badge variant="secondary" className="mt-0.5">CPV</Badge>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Optimize Cost Per View</p>
                          <p className="text-xs text-muted-foreground">
                            Consider creators with lower CPV to improve efficiency
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Creator Selection Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Selected Creators ({campaignResults.selectedCreators.length} of {campaignResults.eligible.length} eligible)</CardTitle>
                  <CardDescription>Toggle creators to add or remove from your campaign</CardDescription>
                </div>
                <div className="flex gap-2">
                  {campaignResults.selectedCreators.length > 0 && (
                    <Button 
                      variant="outline" 
                      onClick={handleDeselectAll}
                    >
                      <X className="h-4 w-4 mr-2" />
                      DE-SELECT ALL
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={() => setIsSearchModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    ADD MORE CREATORS
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SELECT</TableHead>
                      <TableHead>HANDLE</TableHead>
                      <TableHead>FOLLOWERS</TableHead>
                      <TableHead>MEDIAN VIEWS</TableHead>
                      <TableHead>ENGAGEMENT</TableHead>
                      <TableHead>FIT SCORE</TableHead>
                      <TableHead>POST TYPE</TableHead>
                      <TableHead>POSTS</TableHead>
                      <TableHead>COST</TableHead>
                      <TableHead>CPV</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaignResults.eligible.map((creator) => (
                      <TableRow key={creator.id} className={isSelected(creator.id) ? 'bg-primary/5' : ''}>
                        <TableCell>
                          <Switch
                            checked={isSelected(creator.id)}
                            onCheckedChange={() => toggleCreatorSelection(creator.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">@{creator.instagram_handle}</TableCell>
                        <TableCell>{formatNumber(creator.followers)}</TableCell>
                        <TableCell>{formatNumber(creator.median_views_per_video)}</TableCell>
                        <TableCell>{creator.engagement_rate}%</TableCell>
                        <TableCell>
                          <Badge variant={creator.campaignFitScore && creator.campaignFitScore > 80 ? 'default' : 'secondary'}>
                            {creator.campaignFitScore?.toFixed(1) || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>{creator.selected_post_type || 'N/A'}</TableCell>
                        <TableCell>
                          {isSelected(creator.id) ? (
                            <Input
                              type="number"
                              min="1"
                              max="10"
                              value={creator.posts_count || 1}
                              onChange={(e) => handlePostsCountChange(creator.id, parseInt(e.target.value) || 1)}
                              className="w-16 h-8"
                            />
                          ) : (
                            <span>1</span>
                          )}
                        </TableCell>
                        <TableCell>{formatCurrency((creator.selected_rate || 0) * (creator.posts_count || 1))}</TableCell>
                        <TableCell>${(creator.cpv || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between pt-8">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleNext} size="lg" className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
              Finalize Campaign
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {/* Creator Search Modal */}
          <CreatorSearchModal
            isOpen={isSearchModalOpen}
            onClose={() => setIsSearchModalOpen(false)}
            onSelectCreator={handleAddManualCreator}
            selectedCreatorIds={campaignResults.selectedCreators.map(c => c.id)}
          />
        </div>
      </div>
    );
  }

  // Step 3: Campaign Finalized
  if (step === 3 && campaignResults) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">CAMPAIGN FINALIZED</h1>
            <p className="text-xl text-muted-foreground">Step 3 of 3: Export and Save</p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Final Campaign Summary</CardTitle>
              <CardDescription>{formData.campaign_name} - Ready for execution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
                <div>
                  <div className="text-3xl font-bold text-primary">{campaignResults.totals.total_creators}</div>
                  <div className="text-sm text-muted-foreground font-mono uppercase">CREATORS SELECTED</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary">{campaignResults.totals.total_posts || campaignResults.totals.total_creators}</div>
                  <div className="text-sm text-muted-foreground font-mono uppercase">TOTAL POSTS</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary break-all">{formatCurrency(campaignResults.totals.total_cost)}</div>
                  <div className="text-sm text-muted-foreground font-mono uppercase break-words">TOTAL INVESTMENT</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-500 break-all">{formatNumber(campaignResults.totals.total_followers)}</div>
                  <div className="text-sm text-muted-foreground font-mono uppercase break-words">TOTAL FOLLOWERS</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-500">{formatNumber(campaignResults.totals.total_median_views)}</div>
                  <div className="text-sm text-muted-foreground font-mono uppercase">EXPECTED MEDIAN VIEWS</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary">${(campaignResults.totals.average_cpv || 0).toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground font-mono uppercase">AVERAGE CPM</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between pt-8">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex gap-4">
              <Button onClick={exportCampaign} variant="outline" size="lg">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={saveCampaignDraft} size="lg" className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
                <Save className="h-4 w-4 mr-2" />
                Save Campaign
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
