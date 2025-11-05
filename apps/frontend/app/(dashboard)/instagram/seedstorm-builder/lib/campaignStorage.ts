
import { supabase } from "../integrations/supabase/client";
import { verifyProjectIntegrity } from "./projectGuard";

export interface Campaign {
  id: string;
  name: string;
  brand_name: string;
  description?: string;
  budget: number;
  creator_count: number;
  selected_creators: any[];
  totals: any;
  results: any;
  created_at: string;
  updated_at: string;
  stream_goal: number;
  remaining_streams: number;
  start_date: string;
  duration_days: number;
  selected_playlists: any[];
  vendor_allocations: any;
  allocated_streams?: number;
  daily_streams?: number;
  weekly_streams?: number;
  client_id?: string;
  public_token?: string;
  public_access_enabled?: boolean;
  client: string;
  track_url: string;
  sub_genre: string;
  client_name?: string;
  track_name?: string;
  sub_genres?: string[];
  campaign_type: string;
  source: string;
  salesperson?: string;
  music_genres: string[];
  content_types: string[];
  territory_preferences: string[];
  post_types: string[];
  status: string;
}

export const saveCampaign = async (campaignData: Partial<Campaign>): Promise<string> => {
  // Verify project integrity before saving
  verifyProjectIntegrity();
  
  // Avoid accessing protected supabaseUrl property in typings
  console.log('🔒 Saving campaign to verified project');

  const payload: any = {
    ...campaignData,
    campaign_type: 'instagram',
    source: 'campaign_manager',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  const { data, error } = await supabase
    .from('campaigns')
    .insert(payload as any)
    .select('id')
    .single();

  if (error) {
    console.error('❌ Failed to save campaign:', error);
    throw error;
  }

  console.log('✅ Campaign saved successfully with ID:', data.id);
  return data.id as string;
};

export const getCampaigns = async (): Promise<Campaign[]> => {
  // Verify project integrity before fetching
  verifyProjectIntegrity();
  
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Failed to fetch campaigns:', error);
    throw error;
  }

  return (data as Campaign[]) || [];
};

export const updateCampaign = async (id: string, updates: Partial<Campaign>): Promise<void> => {
  // Verify project integrity before updating
  verifyProjectIntegrity();
  
  const { error } = await supabase
    .from('campaigns')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', id);

  if (error) {
    console.error('❌ Failed to update campaign:', error);
    throw error;
  }

  console.log('✅ Campaign updated successfully');
};

export const deleteCampaign = async (id: string): Promise<void> => {
  // Verify project integrity before deleting
  verifyProjectIntegrity();
  
  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('❌ Failed to delete campaign:', error);
    throw error;
  }

  console.log('✅ Campaign deleted successfully');
};
