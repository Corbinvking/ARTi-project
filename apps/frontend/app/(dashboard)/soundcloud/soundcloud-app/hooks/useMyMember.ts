"use client";

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

export interface SoundCloudMember {
  id: string;
  name: string;
  primary_email: string;
  emails: string[];
  status: string;
  size_tier: string;
  followers: number;
  soundcloud_followers: number;
  soundcloud_url?: string;
  spotify_url?: string;
  families: string[];
  subgenres: string[];
  groups: string[];
  monthly_repost_limit: number;
  monthly_submission_limit: number;
  submissions_this_month: number;
  monthly_credit_limit: number;
  credits_given: number;
  credits_used: number;
  net_credits: number;
  reach_factor: number;
  last_submission_at?: string;
  last_login_at?: string;
  influence_planner_status: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

/**
 * Hook to fetch the currently logged-in user's SoundCloud member profile
 * Similar to Spotify's useMyVendor hook
 */
export function useMyMember() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-soundcloud-member', user?.id || 'anon'],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      
      // Try to get member via the linking table first
      const { data: linkData, error: linkError } = await supabase
        .from('soundcloud_member_users')
        .select(`
          member_id,
          member:soundcloud_members(*)
        `)
        .eq('user_id', user.id)
        .single();
      
      if (!linkError && linkData?.member) {
        return linkData.member as SoundCloudMember;
      }
      
      // Fallback: Try direct user_id lookup on soundcloud_members
      const { data: directData, error: directError } = await supabase
        .from('soundcloud_members')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (!directError && directData) {
        return directData as SoundCloudMember;
      }
      
      // Last fallback: Try matching by email
      if (user.email) {
        const { data: emailData, error: emailError } = await supabase
          .from('soundcloud_members')
          .select('*')
          .eq('primary_email', user.email)
          .single();
        
        if (!emailError && emailData) {
          return emailData as SoundCloudMember;
        }
        
        // Try emails array
        const { data: emailsData, error: emailsError } = await supabase
          .from('soundcloud_members')
          .select('*')
          .contains('emails', [user.email])
          .single();
        
        if (!emailsError && emailsData) {
          return emailsData as SoundCloudMember;
        }
      }
      
      console.log('No member found for user:', user.id, user.email);
      return null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });
}

/**
 * Hook to check if current user is a SoundCloud member
 */
export function useIsSoundCloudMember() {
  const { data: member, isLoading } = useMyMember();
  
  return {
    isMember: !!member,
    isLoading,
    member
  };
}

/**
 * Hook to get member's submissions
 */
export function useMySubmissions() {
  const { data: member } = useMyMember();
  
  return useQuery({
    queryKey: ['my-submissions', member?.id],
    enabled: !!member?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('soundcloud_submissions')
        .select('*')
        .eq('member_id', member!.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching submissions:', error);
        throw error;
      }
      
      return data || [];
    },
    staleTime: 60 * 1000 // 1 minute
  });
}

/**
 * Hook to get member's credit history
 */
export function useMyCreditHistory() {
  const { data: member } = useMyMember();
  
  return useQuery({
    queryKey: ['my-credit-history', member?.id],
    enabled: !!member?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('soundcloud_repost_credit_ledger')
        .select('*')
        .eq('member_id', member!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error('Error fetching credit history:', error);
        // Return empty array if table doesn't exist
        return [];
      }
      
      return data || [];
    },
    staleTime: 60 * 1000
  });
}

/**
 * Hook to get member's queue assignments
 */
export function useMyQueueAssignments() {
  const { data: member } = useMyMember();
  
  return useQuery({
    queryKey: ['my-queue-assignments', member?.id],
    enabled: !!member?.id,
    queryFn: async () => {
      // Get submissions where this member is a suggested supporter
      const { data, error } = await supabase
        .from('soundcloud_submissions')
        .select(`
          *,
          submitter:soundcloud_members!member_id(name, soundcloud_url)
        `)
        .contains('suggested_supporters', [member!.id])
        .eq('status', 'approved')
        .gte('support_date', new Date().toISOString().split('T')[0])
        .order('support_date', { ascending: true });
      
      if (error) {
        console.error('Error fetching queue:', error);
        return [];
      }
      
      return data || [];
    },
    staleTime: 60 * 1000
  });
}

