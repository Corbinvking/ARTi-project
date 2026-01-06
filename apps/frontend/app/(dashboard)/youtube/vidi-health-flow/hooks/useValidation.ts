import { useState } from 'react';
import { supabase } from "../integrations/supabase/client";
import { extractYouTubeVideoId, sanitizeYouTubeUrl } from "../lib/youtube";

interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
  data?: any;
}

export function useValidation() {
  const [isValidating, setIsValidating] = useState(false);

  const validateYouTubeUrl = async (url: string): Promise<ValidationResult> => {
    if (!url.trim()) {
      return { isValid: false, error: 'YouTube URL is required' };
    }

    // Client-side validation
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      return { isValid: false, error: 'Invalid YouTube URL format. Please use a valid YouTube video URL.' };
    }

    // Generate canonical URL
    const canonicalUrl = sanitizeYouTubeUrl(url);
    
    return { 
      isValid: true, 
      data: {
        videoId,
        canonicalUrl
      }
    };
  };

  const checkDuplicateCampaign = async (
    videoId: string, 
    clientId: string, 
    campaignName: string,
    excludeCampaignId?: string
  ): Promise<ValidationResult> => {
    if (!videoId || !clientId) {
      return { isValid: true };
    }

    setIsValidating(true);
    
    try {
      // Check for duplicate by video_id and client_id
      let query = supabase
        .from('campaigns')
        .select('id, campaign_name')
        .eq('video_id', videoId)
        .eq('client_id', clientId);
        
      if (excludeCampaignId) {
        query = query.neq('id', excludeCampaignId);
      }
      
      const { data: videoDuplicates, error: videoError } = await query;
      
      if (videoError) {
        throw new Error(videoError.message);
      }
      
      if (videoDuplicates && videoDuplicates.length > 0) {
        return { 
          isValid: false, 
          error: `A campaign for this video already exists for this client: "${videoDuplicates[0].campaign_name}"` 
        };
      }
      
      // Check for duplicate campaign name with same client
      let nameQuery = supabase
        .from('campaigns')
        .select('id, youtube_url')
        .eq('campaign_name', campaignName)
        .eq('client_id', clientId);
        
      if (excludeCampaignId) {
        nameQuery = nameQuery.neq('id', excludeCampaignId);
      }
      
      const { data: nameDuplicates, error: nameError } = await nameQuery;
      
      if (nameError) {
        throw new Error(nameError.message);
      }
      
      if (nameDuplicates && nameDuplicates.length > 0) {
        return { 
          isValid: false, 
          error: `A campaign with this name already exists for this client` 
        };
      }
      
      return { isValid: true };
      
    } catch (err: any) {
      return { isValid: false, error: err.message || 'Failed to check for duplicate campaigns' };
    } finally {
      setIsValidating(false);
    }
  };

  const validatePricingTiers = async (): Promise<ValidationResult> => {
    setIsValidating(true);
    
    try {
      const { data, error } = await supabase.rpc('validate_pricing_tiers');
      
      if (error) {
        throw new Error(error.message);
      }
      
      const validationData = data as any;
      if (!validationData.valid) {
        return { 
          isValid: false, 
          error: 'Pricing tier validation failed',
          warnings: validationData.issues?.map((issue: any) => issue.message) || []
        };
      }
      
      return { isValid: true };
      
    } catch (err: any) {
      return { isValid: false, error: err.message || 'Failed to validate pricing tiers' };
    } finally {
      setIsValidating(false);
    }
  };

  const validateCampaignData = (campaignData: any): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Required fields
    if (!campaignData.campaign_name?.trim()) {
      errors.push('Campaign name is required');
    }
    
    if (!campaignData.youtube_url?.trim()) {
      errors.push('YouTube URL is required');
    }
    
    if (!campaignData.client_id) {
      errors.push('Client selection is required');
    }
    
    if (!campaignData.service_types || campaignData.service_types.length === 0) {
      errors.push('At least one service type is required');
    }
    
    // Date validation
    if (campaignData.start_date && campaignData.end_date) {
      if (new Date(campaignData.start_date) >= new Date(campaignData.end_date)) {
        errors.push('End date must be after start date');
      }
    }
    
    // Check if this is an engagements-only campaign
    const isEngagementsOnly = campaignData.service_types?.some(
      (service: any) => service.service_type === 'engagements_only'
    );
    
    // Goal views validation (skip for engagements-only campaigns)
    if (!isEngagementsOnly) {
      const totalGoalViews = campaignData.service_types?.reduce((total: number, service: any) => {
        return total + (service.goal_views || 0);
      }, 0) || 0;
      
      if (totalGoalViews <= 0) {
        errors.push('Total goal views must be greater than 0');
      }
      
      if (totalGoalViews > 10000000) {
        warnings.push('Very high goal views detected - please verify this is correct');
      }
      
      // Daily views validation
      if (campaignData.desired_daily && campaignData.desired_daily > totalGoalViews) {
        warnings.push('Daily views target exceeds total goal views');
      }
    }
    
    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors[0] : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  };

  return {
    isValidating,
    validateYouTubeUrl,
    checkDuplicateCampaign,
    validatePricingTiers,
    validateCampaignData
  };
}