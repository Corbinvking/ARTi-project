export interface Creator {
  id: string;
  instagram_handle: string;
  email?: string;
  followers: number;
  median_views_per_video: number;
  engagement_rate: number;
  base_country: string;
  audience_countries: string[];
  audience_percentages?: number[];
  content_types: string[];
  music_genres: string[];
  reel_rate: number;
  carousel_rate?: number;
  story_rate?: number;
  performance_score?: number;
  performance_history?: PerformanceHistory[];
  created_at: string;
  updated_at?: string;
  // Algorithm fields
  cpv?: number;
  campaignFitScore?: number;
  selected_rate?: number;
  selected_post_type?: string;
  posts_count?: number;
  campaign_rate?: number; // Campaign-specific rate override
  manually_added?: boolean; // Flag for manually added creators
}

export interface PerformanceHistory {
  date: string;
  performance_score: number;
  campaign_satisfaction: number;
}

export interface CampaignForm {
  campaign_name: string;
  total_budget: number;
  selected_genres: string[];  // Changed from primary_genre to selected_genres array
  campaign_type: 'Audio Seeding' | 'Footage Seeding';
  post_type_preference: string[];
  territory_preferences: string[];
  content_type_preferences: string[];
}

export interface CampaignTotals {
  total_creators: number;
  total_posts?: number;
  total_cost: number;
  total_followers: number;
  total_median_views: number;
  total_predicted_views?: number;
  baseline_cpv?: number;
  predicted_cpv?: number;
  average_cpv: number;
  budget_remaining: number;
  budget_utilization?: number;
}

export interface CampaignResults {
  selectedCreators: Creator[];
  totals: CampaignTotals;
  eligible: Creator[];
  recommendations?: string[];
  message?: string;
}

export interface Campaign {
  id: string;
  campaign_name: string;
  date_created: string;
  status: 'Draft' | 'Active' | 'Completed';
  form_data: CampaignForm;
  selected_creators: Creator[];
  totals: CampaignTotals;
  actual_results?: {
    executed: boolean;
    creator_results: CreatorResult[];
    overall_satisfaction: number;
  };
  public_token?: string | null;
  public_access_enabled?: boolean;
}

export interface PostResult {
  post_number: number;
  actual_views: number;
  actual_engagement_rate: number;
  notes?: string;
}

export interface CreatorResult {
  creator_id: string;
  posts: PostResult[];
  total_actual_views: number;
  average_engagement_rate: number;
  notes?: string;
}

// Import from the new hierarchical genre system
export { 
  ALL_GENRES as MUSIC_GENRES,
  CONTENT_TYPES,
  COUNTRIES,
  POST_TYPES,
  TERRITORY_PREFERENCES
} from './genreSystem';

// All constants now imported from genreSystem.ts for consistency