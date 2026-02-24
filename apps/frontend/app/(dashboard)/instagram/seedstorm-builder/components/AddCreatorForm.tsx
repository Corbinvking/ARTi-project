import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TagSelectDropdown } from "../components/TagSelectDropdown";
import { X } from "lucide-react";
import { Creator, COUNTRIES } from "../lib/types";
import { saveCreator } from "../lib/localStorage";
import { saveCreatorToSupabase } from "../lib/creatorMigration";
import { generateUUID } from "../lib/campaignAlgorithm";
import { toast } from "../hooks/use-toast";
import { getAllTags, saveMultipleTagsToCollection, deleteTagFromCollection } from "../lib/tagStorage";
import { useTagSync } from "../hooks/useTagSync";

interface AddCreatorFormProps {
  onSuccess: () => void;
}

export const AddCreatorForm = ({ onSuccess }: AddCreatorFormProps) => {
  const [formData, setFormData] = useState({
    instagram_handle: '',
    email: '',
    followers: '',
    median_views_per_video: '',
    engagement_rate: '',
    base_country: '',
    reel_rate: '',
    carousel_rate: '',
    story_rate: ''
  });

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { tags: allTags, refreshTags } = useTagSync();
  
  // Reorder countries to put USA first
  const reorderedCountries = ['USA', ...COUNTRIES.filter(c => c !== 'United States' && c !== 'USA')];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.instagram_handle.trim()) {
      newErrors.instagram_handle = 'Instagram handle is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors and try again",
        variant: "destructive",
      });
      return;
    }

    // Note: Tags are auto-saved individually when added, not here
    // This only saves tags that were manually selected from existing lists
    const currentStoredTags = getAllTags();
    const newGenres = selectedGenres.filter(g => !currentStoredTags.genres.includes(g));
    const newContentTypes = selectedContentTypes.filter(c => !currentStoredTags.contentTypes.includes(c));
    
    if (newGenres.length > 0) saveMultipleTagsToCollection(newGenres, 'genres');
    if (newContentTypes.length > 0) saveMultipleTagsToCollection(newContentTypes, 'contentTypes');
    
    const baseCountries = formData.base_country
      ? [formData.base_country, ...selectedCountries].slice(0, 3)
      : selectedCountries.slice(0, 3);

    const newCreator: Creator = {
      id: generateUUID(),
      instagram_handle: formData.instagram_handle.replace('@', ''),
      email: formData.email || undefined,
      followers: parseInt(formData.followers) || 0,
      median_views_per_video: parseInt(formData.median_views_per_video) || 0,
      engagement_rate: parseFloat(formData.engagement_rate) || 0,
      base_country: formData.base_country || '',
      audience_countries: baseCountries,
      music_genres: selectedGenres,
      content_types: selectedContentTypes,
      reel_rate: parseFloat(formData.reel_rate) || 0,
      carousel_rate: formData.carousel_rate ? parseFloat(formData.carousel_rate) : undefined,
      story_rate: formData.story_rate ? parseFloat(formData.story_rate) : undefined,
      performance_score: 1.0,
      created_at: new Date().toISOString()
    };

    // Try to save to Supabase first
    const supabaseResult = await saveCreatorToSupabase(newCreator);
    
    if (supabaseResult.success) {
      // Also save to localStorage as backup
      saveCreator(newCreator);
      
      toast({
        title: "Creator Added",
        description: `@${newCreator.instagram_handle} has been added to the database`,
      });
    } else {
      // Check if error is authentication related
      const isAuthError = supabaseResult.error && (
        supabaseResult.error.includes('JWT') || 
        supabaseResult.error.includes('authentication') ||
        supabaseResult.error.includes('not authenticated')
      );
      
      if (isAuthError) {
        // Fallback to localStorage for auth errors
        saveCreator(newCreator);
        
        toast({
          title: "Saved Locally",
          description: `@${newCreator.instagram_handle} saved locally. Please sign in to sync to database.`,
          variant: "destructive",
        });
      } else {
        // Fallback to localStorage for other errors
        saveCreator(newCreator);
        
        toast({
          title: "Creator Added (Local Only)",
          description: `@${newCreator.instagram_handle} saved locally. Database sync failed.`,
          variant: "destructive",
        });
      }
    }
    
    // Trigger a full sync to catch any new data  
    try {
      const { syncCreatorDataToTags } = await import('../lib/tagStorage');
      await syncCreatorDataToTags();
    } catch (error) {
      console.error('Error syncing creator data to tags:', error);
    }
    
    onSuccess();
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="instagram_handle">Instagram Handle</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">@</span>
            <Input
              id="instagram_handle"
              placeholder="username"
              value={formData.instagram_handle.replace('@', '')}
              onChange={(e) => {
                const value = e.target.value.replace('@', '');
                setFormData(prev => ({...prev, instagram_handle: value}));
              }}
              className={`pl-8 ${errors.instagram_handle ? 'border-destructive' : ''}`}
            />
          </div>
          {errors.instagram_handle && <p className="text-sm text-destructive">{errors.instagram_handle}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="base_country">Base Country</Label>
          <Select 
            value={formData.base_country} 
            onValueChange={(value) => setFormData(prev => ({...prev, base_country: value}))}
          >
            <SelectTrigger className={errors.base_country ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {reorderedCountries.map(country => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.base_country && <p className="text-sm text-destructive">{errors.base_country}</p>}
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email (Optional)</Label>
        <Input
          id="email"
          type="email"
          placeholder="creator@example.com"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
        />
      </div>

      {/* Audience Territories */}
      <div className="space-y-2">
        <Label htmlFor="audience_countries">Audience Territories (up to 3)</Label>
        <div className="space-y-2">
          <Select 
            value="" 
            onValueChange={(value) => {
              if (!selectedCountries.includes(value) && selectedCountries.length < 3) {
                setSelectedCountries(prev => [...prev, value]);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Add audience territory" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {reorderedCountries.filter(c => !selectedCountries.includes(c)).map(country => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedCountries.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedCountries.map(country => (
                <Badge key={country} variant="secondary" className="flex items-center gap-1">
                  {country}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setSelectedCountries(prev => prev.filter(c => c !== country))} 
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="followers">Followers</Label>
          <Input
            id="followers"
            type="number"
            placeholder="125000"
            value={formData.followers}
            onChange={(e) => setFormData(prev => ({...prev, followers: e.target.value}))}
            className={errors.followers ? 'border-destructive' : ''}
          />
          {errors.followers && <p className="text-sm text-destructive">{errors.followers}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="median_views_per_video">Median Views</Label>
          <Input
            id="median_views_per_video"
            type="number"
            placeholder="45000"
            value={formData.median_views_per_video}
            onChange={(e) => setFormData(prev => ({...prev, median_views_per_video: e.target.value}))}
            className={errors.median_views_per_video ? 'border-destructive' : ''}
          />
          {errors.median_views_per_video && <p className="text-sm text-destructive">{errors.median_views_per_video}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="engagement_rate">Engagement Rate (%)</Label>
          <Input
            id="engagement_rate"
            type="number"
            step="0.1"
            placeholder="4.2"
            value={formData.engagement_rate}
            onChange={(e) => setFormData(prev => ({...prev, engagement_rate: e.target.value}))}
            className={errors.engagement_rate ? 'border-destructive' : ''}
          />
          {errors.engagement_rate && <p className="text-sm text-destructive">{errors.engagement_rate}</p>}
        </div>
      </div>

      {/* Rates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="reel_rate">Reel Rate ($)</Label>
          <Input
            id="reel_rate"
            type="number"
            placeholder="350"
            value={formData.reel_rate}
            onChange={(e) => setFormData(prev => ({...prev, reel_rate: e.target.value}))}
            className={errors.reel_rate ? 'border-destructive' : ''}
          />
          {errors.reel_rate && <p className="text-sm text-destructive">{errors.reel_rate}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="carousel_rate">Carousel Rate ($)</Label>
          <Input
            id="carousel_rate"
            type="number"
            placeholder="250"
            value={formData.carousel_rate}
            onChange={(e) => setFormData(prev => ({...prev, carousel_rate: e.target.value}))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="story_rate">Story Rate ($)</Label>
          <Input
            id="story_rate"
            type="number"
            placeholder="150"
            value={formData.story_rate}
            onChange={(e) => setFormData(prev => ({...prev, story_rate: e.target.value}))}
          />
        </div>
      </div>

      {/* Music Genres */}
      <TagSelectDropdown
        label="Music Genres"
        selectedTags={selectedGenres}
        onTagsChange={setSelectedGenres}
        tagType="genres"
        placeholder="Select music genres..."
        error={errors.genres}
      />

      {/* Content Types */}
      <TagSelectDropdown
        label="Content Types"
        selectedTags={selectedContentTypes}
        onTagsChange={setSelectedContentTypes}
        tagType="contentTypes"
        placeholder="Select content types..."
        error={errors.content_types}
      />


      {/* Submit */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" variant="gradient">
          Add Creator
        </Button>
      </div>
    </form>
  );
};