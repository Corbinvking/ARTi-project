/**
 * SoundCloud Data Hooks
 * 
 * Centralized React Query hooks for fetching and mutating SoundCloud data.
 * All hooks use the correct soundcloud_* table names.
 * 
 * @example
 * ```tsx
 * import { useMembers, useCreateMember } from '../../hooks/useSoundCloudData';
 * 
 * function MembersPage() {
 *   const { data: members, isLoading, error } = useMembers();
 *   const createMember = useCreateMember();
 *   
 *   // ... component logic
 * }
 * ```
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface MemberFilters {
  status?: string;
  tier?: string;
  genre?: string;
  searchTerm?: string;
}

export interface CampaignFilters {
  status?: string;
  clientId?: string;
  dateRange?: { start: Date; end: Date };
}

// ============================================================================
// MEMBERS HOOKS
// ============================================================================

/**
 * Fetch all members with optional filtering
 * Query key: ['soundcloud-members', filters]
 */
export const useMembers = (filters?: MemberFilters) => {
  return useQuery({
    queryKey: ['soundcloud-members', filters],
    queryFn: async () => {
      let query = supabase
        .from('soundcloud_members')
        .select('*');
      
      // Apply filters
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.tier && filters.tier !== 'all') {
        query = query.eq('size_tier', filters.tier);
      }
      if (filters?.searchTerm) {
        query = query.or(`name.ilike.%${filters.searchTerm}%,primary_email.ilike.%${filters.searchTerm}%`);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    staleTime: 60000, // 1 minute
  });
};

/**
 * Fetch single member by ID
 * Query key: ['soundcloud-members', memberId]
 */
export const useMember = (memberId?: string) => {
  return useQuery({
    queryKey: ['soundcloud-members', memberId],
    queryFn: async () => {
      if (!memberId) throw new Error('Member ID is required');
      
      const { data, error } = await supabase
        .from('soundcloud_members')
        .select(`
          *,
          accounts:soundcloud_member_accounts(*),
          genres:soundcloud_member_genres(*),
          wallet:soundcloud_repost_credit_wallet(*)
        `)
        .eq('id', memberId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!memberId,
    staleTime: 300000, // 5 minutes
  });
};

/**
 * Create a new member
 */
export const useCreateMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (memberData: any) => {
      const { data, error } = await supabase
        .from('soundcloud_members')
        .insert(memberData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['soundcloud-members'] });
    },
  });
};

/**
 * Update an existing member
 */
export const useUpdateMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('soundcloud_members')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['soundcloud-members'] });
      queryClient.invalidateQueries({ queryKey: ['soundcloud-members', data.id] });
    },
  });
};

/**
 * Delete a member
 */
export const useDeleteMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (memberId: string) => {
      // 0. Deprovision auth credentials first (delete auth.users entry)
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.artistinfluence.com';
        await fetch(`${apiBaseUrl}/api/soundcloud/members/${memberId}/deprovision-auth`, {
          method: 'DELETE',
        });
      } catch (deprovisionErr) {
        // Log but don't block member deletion if auth cleanup fails
        console.warn('Auth deprovision failed (continuing with member delete):', deprovisionErr);
      }

      // Delete in correct order to avoid FK constraints
      
      // 1. Get member accounts
      const { data: accounts } = await supabase
        .from('soundcloud_member_accounts')
        .select('id')
        .eq('member_id', memberId);
      
      // 2. Delete integration status
      if (accounts && accounts.length > 0) {
        const accountIds = accounts.map(acc => acc.id);
        await supabase
          .from('soundcloud_integration_status')
          .delete()
          .in('member_account_id', accountIds);
      }
      
      // 3. Delete related records
      await supabase.from('soundcloud_member_accounts').delete().eq('member_id', memberId);
      await supabase.from('soundcloud_avoid_list_items').delete().eq('member_id', memberId);
      await supabase.from('soundcloud_member_genres').delete().eq('member_id', memberId);
      await supabase.from('soundcloud_repost_credit_ledger').delete().eq('member_id', memberId);
      await supabase.from('soundcloud_repost_credit_wallet').delete().eq('member_id', memberId);
      
      // 4. Finally delete member
      const { error } = await supabase
        .from('soundcloud_members')
        .delete()
        .eq('id', memberId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['soundcloud-members'] });
    },
  });
};

// ============================================================================
// CAMPAIGNS HOOKS
// ============================================================================

/**
 * Fetch all campaigns with optional filtering
 * Query key: ['soundcloud-campaigns', filters]
 */
export const useCampaigns = (filters?: CampaignFilters) => {
  return useQuery({
    queryKey: ['soundcloud-campaigns', filters],
    queryFn: async () => {
      let query = supabase
        .from('soundcloud_campaigns')
        .select(`
          *,
          client:soundcloud_clients(id, name, email)
        `);
      
      // Apply filters
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.clientId) {
        query = query.eq('client_id', filters.clientId);
      }
      if (filters?.dateRange) {
        query = query
          .gte('start_date', filters.dateRange.start.toISOString())
          .lte('end_date', filters.dateRange.end.toISOString());
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    staleTime: 60000, // 1 minute
  });
};

/**
 * Fetch single campaign by ID
 * Query key: ['soundcloud-campaigns', campaignId]
 */
export const useCampaign = (campaignId?: string) => {
  return useQuery({
    queryKey: ['soundcloud-campaigns', campaignId],
    queryFn: async () => {
      if (!campaignId) throw new Error('Campaign ID is required');
      
      const { data, error } = await supabase
        .from('soundcloud_campaigns')
        .select(`
          *,
          client:soundcloud_clients(id, name, email),
          snapshots:soundcloud_attribution_snapshots(*)
        `)
        .eq('id', campaignId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!campaignId,
    staleTime: 300000, // 5 minutes
  });
};

/**
 * Create a new campaign
 */
export const useCreateCampaign = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (campaignData: any) => {
      const { data, error } = await supabase
        .from('soundcloud_campaigns')
        .insert(campaignData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['soundcloud-campaigns'] });
    },
  });
};

/**
 * Update an existing campaign
 */
export const useUpdateCampaign = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('soundcloud_campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['soundcloud-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['soundcloud-campaigns', data.id] });
    },
  });
};

// ============================================================================
// SUBMISSIONS HOOKS
// ============================================================================

/**
 * Fetch all submissions (also used for "campaigns" display)
 * Query key: ['soundcloud-submissions']
 * 
 * NOTE: Your 2,083 imported "campaigns" are actually in the submissions table!
 * The CampaignsPage uses this to display submissions as campaigns.
 */
export const useSubmissions = (filters?: { status?: string; memberId?: string }) => {
  return useQuery({
    queryKey: ['soundcloud-submissions', filters],
    queryFn: async () => {
      let query = supabase
        .from('soundcloud_submissions')
        .select('*');
      
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.memberId) {
        query = query.eq('member_id', filters.memberId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });
};

/**
 * Create a new submission
 */
export const useCreateSubmission = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (submissionData: any) => {
      const { data, error } = await supabase
        .from('soundcloud_submissions')
        .insert(submissionData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['soundcloud-submissions'] });
    },
  });
};

/**
 * Update an existing submission
 */
export const useUpdateSubmission = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('soundcloud_submissions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['soundcloud-submissions'] });
    },
  });
};

/**
 * Delete a submission
 */
export const useDeleteSubmission = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (submissionId: string) => {
      const { error } = await supabase
        .from('soundcloud_submissions')
        .delete()
        .eq('id', submissionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['soundcloud-submissions'] });
    },
  });
};

// ============================================================================
// GENRE HOOKS
// ============================================================================

/**
 * Fetch all genre families
 * Query key: ['soundcloud-genre-families']
 */
export const useGenreFamilies = () => {
  return useQuery({
    queryKey: ['soundcloud-genre-families'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('soundcloud_genre_families')
        .select('*')
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    staleTime: 300000, // 5 minutes (genres rarely change)
  });
};

/**
 * Fetch all subgenres
 * Query key: ['soundcloud-subgenres', familyId]
 */
export const useSubgenres = (familyId?: string) => {
  return useQuery({
    queryKey: ['soundcloud-subgenres', familyId],
    queryFn: async () => {
      let query = supabase
        .from('soundcloud_subgenres')
        .select('*')
        .eq('active', true);
      
      if (familyId) {
        query = query.eq('family_id', familyId);
      }
      
      const { data, error } = await query.order('order_index');
      
      if (error) throw error;
      return data;
    },
    staleTime: 300000, // 5 minutes
  });
};

// ============================================================================
// QUEUE HOOKS
// ============================================================================

/**
 * Fetch queues
 * Query key: ['soundcloud-queues', date]
 */
export const useQueues = (date?: Date) => {
  return useQuery({
    queryKey: ['soundcloud-queues', date],
    queryFn: async () => {
      let query = supabase
        .from('soundcloud_queues')
        .select(`
          *,
          assignments:soundcloud_queue_assignments(
            *,
            submission:soundcloud_submissions(track_url, artist_name),
            supporter:soundcloud_members(id, name)
          )
        `);
      
      if (date) {
        query = query.eq('date', date.toISOString().split('T')[0]);
      }
      
      const { data, error } = await query.order('date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    staleTime: 30000, // 30 seconds
  });
};

// ============================================================================
// CREDIT SYSTEM HOOKS
// ============================================================================

/**
 * Fetch member credit wallet
 * Query key: ['soundcloud-credit-wallet', memberId]
 */
export const useMemberCreditWallet = (memberId?: string) => {
  return useQuery({
    queryKey: ['soundcloud-credit-wallet', memberId],
    queryFn: async () => {
      if (!memberId) throw new Error('Member ID is required');
      
      const { data, error } = await supabase
        .from('soundcloud_repost_credit_wallet')
        .select('*')
        .eq('member_id', memberId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!memberId,
    staleTime: 60000,
  });
};

/**
 * Fetch member credit ledger (transaction history)
 * Query key: ['soundcloud-credit-ledger', memberId]
 */
export const useMemberCreditLedger = (memberId?: string) => {
  return useQuery({
    queryKey: ['soundcloud-credit-ledger', memberId],
    queryFn: async () => {
      if (!memberId) throw new Error('Member ID is required');
      
      const { data, error } = await supabase
        .from('soundcloud_repost_credit_ledger')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!memberId,
    staleTime: 60000,
  });
};

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  // Members
  useMembers,
  useMember,
  useCreateMember,
  useUpdateMember,
  useDeleteMember,
  
  // Campaigns (NOTE: These query soundcloud_campaigns, which is currently empty)
  useCampaigns,
  useCampaign,
  useCreateCampaign,
  useUpdateCampaign,
  
  // Submissions (Your 2,083 imported "campaigns" are here!)
  useSubmissions,
  useCreateSubmission,
  useUpdateSubmission,
  useDeleteSubmission,
  
  // Genres
  useGenreFamilies,
  useSubgenres,
  
  // Queues
  useQueues,
  
  // Credits
  useMemberCreditWallet,
  useMemberCreditLedger,
};

