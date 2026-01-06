import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../integrations/supabase/client';
import { verifyProjectIntegrity } from './projectGuard';
import type { Creator as UICreator, Campaign as UICampaign, CampaignTotals } from './types';

// Helper functions
export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Creator functions (stored in browser localStorage for the creator DB)
export const saveCreator = async (creator: UICreator): Promise<UICreator> => {
  const existingCreators = await getCreators();
  const finalCreator: UICreator = {
    ...creator,
    id: creator.id || uuidv4(),
  };
  localStorage.setItem('creators', JSON.stringify([...existingCreators, finalCreator]));
  return finalCreator;
};

export const getCreators = async (): Promise<UICreator[]> => {
  const creators = localStorage.getItem('creators');
  return creators ? JSON.parse(creators) : [];
};

export const updateCreator = async (id: string, updates: Partial<UICreator>): Promise<UICreator | null> => {
  const existingCreators = await getCreators();
  const updatedCreators = existingCreators.map(creator => creator.id === id ? { ...creator, ...updates } : creator);
  localStorage.setItem('creators', JSON.stringify(updatedCreators));
  
  const updatedCreator = updatedCreators.find(creator => creator.id === id) || null;
  return updatedCreator;
};

export const deleteCreator = async (id: string): Promise<void> => {
  const existingCreators = await getCreators();
  const filteredCreators = existingCreators.filter(creator => creator.id !== id);
  localStorage.setItem('creators', JSON.stringify(filteredCreators));
};

export const importCreators = async (creators: UICreator[]): Promise<void> => {
  const existingCreators = await getCreators();
  const allCreators = [...existingCreators];
  
  creators.forEach(newCreator => {
    const existingIndex = allCreators.findIndex(c => c.instagram_handle === newCreator.instagram_handle);
    if (existingIndex >= 0) {
      allCreators[existingIndex] = { ...allCreators[existingIndex], ...newCreator };
    } else {
      allCreators.push({ ...newCreator, id: newCreator.id || uuidv4() });
    }
  });
  
  localStorage.setItem('creators', JSON.stringify(allCreators));
};

// Local-only campaign helpers (not used for primary storage)
export const saveCampaignLocally = async (campaign: Omit<UICampaign, 'id' | 'date_created'>): Promise<string> => {
  const id = uuidv4();
  const now = new Date().toISOString();
  const newCampaign: UICampaign = { id, date_created: now, ...campaign };
  const existingCampaigns = await getCampaignsLocally();
  localStorage.setItem('campaigns', JSON.stringify([...existingCampaigns, newCampaign]));
  return id;
};

export const getCampaignsLocally = async (): Promise<UICampaign[]> => {
  const campaigns = localStorage.getItem('campaigns');
  return campaigns ? JSON.parse(campaigns) : [];
};

export const updateCampaignLocally = async (id: string, updates: Partial<UICampaign>): Promise<void> => {
  const existingCampaigns = await getCampaignsLocally();
  const updatedCampaigns = existingCampaigns.map(c =>
    c.id === id ? { ...c, ...updates } : c
  );
  localStorage.setItem('campaigns', JSON.stringify(updatedCampaigns));
};

export const deleteCampaignLocally = async (id: string): Promise<void> => {
  const existingCampaigns = await getCampaignsLocally();
  const filteredCampaigns = existingCampaigns.filter(c => c.id !== id);
  localStorage.setItem('campaigns', JSON.stringify(filteredCampaigns));
};

// Supabase-backed campaign functions mapped to UI Campaign type

const mapDbStatusToUI = (s: string | null | undefined): UICampaign['status'] => {
  if (!s) return 'Draft';
  const l = s.toLowerCase();
  if (l.startsWith('draft')) return 'Draft';
  if (l.startsWith('active')) return 'Active';
  if (l.startsWith('completed')) return 'Completed';
  return 'Draft';
};

const mapUIStatusToDb = (s: UICampaign['status']): string => {
  if (s === 'Draft') return 'draft';
  if (s === 'Active') return 'active';
  return 'completed';
};

const mapDbRowToUICampaign = (row: any): UICampaign => {
  // Parse price to get budget number (handles "$5000" format)
  const budgetNum = parseFloat(row?.price?.replace(/[^0-9.]/g, '') || '0') || 
                    Number(row?.budget) || 0;
  
  // Try to parse stored JSON data from report_notes
  let storedData: any = {};
  if (row?.report_notes) {
    try {
      storedData = JSON.parse(row.report_notes);
    } catch (e) {
      // Not JSON, that's fine
    }
  }

  const totals: CampaignTotals = storedData?.totals || row?.totals || {
    total_creators: row?.creator_count || 0,
    total_cost: budgetNum,
    total_followers: 0,
    total_median_views: 0,
    average_cpv: 0,
    budget_remaining: budgetNum,
  };

  const formData = storedData?.form_data || {};

  return {
    id: row.id,
    campaign_name: row.campaign || row.name || row.campaign_name || 'Untitled Campaign',
    date_created: row.created_at,
    status: mapDbStatusToUI(row.status),
    form_data: {
      campaign_name: row.campaign || row.name || 'Untitled Campaign',
      total_budget: budgetNum,
      selected_genres: formData.selected_genres || row.music_genres || [],
      campaign_type: formData.campaign_type || 'Audio Seeding',
      post_type_preference: formData.post_type_preference || row.post_types || [],
      territory_preferences: formData.territory_preferences || row.territory_preferences || [],
      content_type_preferences: formData.content_type_preferences || row.content_types || [],
    },
    selected_creators: storedData?.selected_creators || row.selected_creators || [],
    totals,
    actual_results: row.results
      ? {
          executed: !!row.results.executed,
          creator_results: row.results.creator_results || [],
          overall_satisfaction: row.results.overall_satisfaction ?? 0,
        }
      : undefined,
    public_token: row.public_token || null,
    public_access_enabled: !!row.public_access_enabled,
  };
};

export const getCampaigns = async (): Promise<UICampaign[]> => {
  verifyProjectIntegrity();
  const { data, error } = await supabase
    .from('instagram_campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Failed to fetch campaigns:', error);
    throw error;
  }

  return (data || []).map(mapDbRowToUICampaign);
};

export const updateCampaign = async (id: string, updates: Partial<UICampaign & { results?: any }>): Promise<void> => {
  verifyProjectIntegrity();

  const dbUpdates: any = {};
  if (typeof updates.campaign_name !== 'undefined') dbUpdates.name = updates.campaign_name;
  if (typeof updates.selected_creators !== 'undefined') dbUpdates.selected_creators = updates.selected_creators;
  if (typeof updates.totals !== 'undefined') dbUpdates.totals = updates.totals;
  if (typeof updates.status !== 'undefined') dbUpdates.status = mapUIStatusToDb(updates.status as UICampaign['status']);
  // Allow mapping of UI actual_results into DB results
  if (typeof (updates as any).actual_results !== 'undefined') dbUpdates.results = (updates as any).actual_results;
  if (typeof (updates as any).results !== 'undefined') dbUpdates.results = (updates as any).results;

  dbUpdates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('instagram_campaigns')
    .update(dbUpdates)
    .eq('id', id);

  if (error) {
    console.error('❌ Failed to update campaign:', error);
    throw error;
  }
};

// Save campaign to instagram_campaigns table
// Uses the ACTUAL production schema from migration 011 (Airtable import format)
export const saveCampaign = async (campaign: UICampaign): Promise<string> => {
  verifyProjectIntegrity();

  // Map UI data to actual production schema columns
  const payload: any = {
    campaign: campaign.campaign_name || 'Untitled Campaign',
    clients: campaign.campaign_name || 'Client', // Use campaign name as client name
    price: `$${campaign.form_data?.total_budget ?? campaign.totals?.total_cost ?? 0}`,
    spend: '$0',
    remaining: `$${campaign.form_data?.total_budget ?? campaign.totals?.total_cost ?? 0}`,
    status: mapUIStatusToDb(campaign.status),
    sound_url: '', // Audio URL if available
    tracker: '', // Tracker URL
    // Store JSON data in available text fields
    report_notes: JSON.stringify({
      selected_creators: campaign.selected_creators ?? [],
      totals: campaign.totals ?? {},
      form_data: campaign.form_data ?? {},
    }),
  };

  console.log('📝 Saving to instagram_campaigns:', payload.campaign);

  const { data, error } = await supabase
    .from('instagram_campaigns')
    .insert(payload as any)
    .select('id')
    .single();

  if (error) {
    console.error('❌ Failed to save campaign:', error);
    throw error;
  }

  console.log('✅ Saved campaign with ID:', data?.id);
  return data?.id as string;
};

export const deleteCampaign = async (id: string): Promise<void> => {
  verifyProjectIntegrity();
  const { error } = await supabase
    .from('instagram_campaigns')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('❌ Failed to delete campaign:', error);
    throw error;
  }
};
