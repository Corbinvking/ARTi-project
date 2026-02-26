"use client"

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { APP_CAMPAIGN_SOURCE, APP_CAMPAIGN_SOURCE_INTAKE, APP_CAMPAIGN_TYPE } from '../lib/constants';
import { notifyOpsStatusChange } from '@/lib/status-notify';
import { notifySlack } from '@/lib/slack-notify';

interface CampaignSubmission {
  id: string;
  client_name: string;
  client_emails: string[];
  campaign_name: string;
  price_paid: number;
  stream_goal: number;
  start_date: string;
  duration_days?: number;
  track_url: string;
  notes?: string;
  salesperson: string;
  status: string;
  created_at: string;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  music_genres: string[];
  territory_preferences: string[];
  internal_notes?: string | null;
  client_notes?: string | null;
  source_invoice_id?: string | null;
  invoice_status?: string | null;
}

interface CreateSubmissionData {
  client_id?: string | null;
  client_name: string;
  client_emails: string[];
  campaign_name: string;
  price_paid: number;
  stream_goal: number;
  start_date: string;
  duration_days: number;
  track_url: string;
  sfa_url?: string | null;
  notes?: string;
  salesperson: string;
  music_genres: string[];
  territory_preferences: string[];
  internal_notes?: string | null;
  client_notes?: string | null;
  source_invoice_id?: string | null;
  invoice_status?: string | null;
  vendor_assignments?: Array<{
    vendor_id: string;
    vendor_name: string;
    allocated_streams: number;
    allocated_budget: number;
    playlist_ids?: string[];
  }>;
}

// Hook to fetch all submissions (for admin) - Only pending and rejected submissions for better performance
export function useCampaignSubmissions() {
  return useQuery({
    queryKey: ['campaign-submissions'],
    queryFn: async () => {
      console.log('🔍 Fetching campaign submissions...');
      const { data, error } = await supabase
        .from('campaign_submissions')
        .select('*')
        .in('status', ['pending', 'ready', 'on_hold'])
        .order('created_at', { ascending: false })
        .limit(50); // Add limit for better performance

      console.log('📦 Submissions query result:', { data: data?.length || 0, error });
      if (error) {
        console.error('❌ Submissions query error:', error);
        throw error;
      }
      return data as CampaignSubmission[];
    },
    staleTime: 30000, // Cache for 30 seconds
  });
}

// Interface for campaigns awaiting vendor response
export interface CampaignAwaitingVendor {
  id: string;
  name: string;
  client_name: string;
  track_url: string;
  stream_goal: number;
  budget: number;
  start_date: string;
  status: string;
  created_at: string;
  pending_vendors: Array<{
    vendor_id: string;
    vendor_name: string;
    requested_at: string;
  }>;
  total_vendors: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
}

// Hook to fetch campaigns awaiting vendor response (for admin view)
export function useCampaignsAwaitingVendor() {
  return useQuery({
    queryKey: ['campaigns-awaiting-vendor'],
    queryFn: async () => {
      console.log('🔍 Fetching campaigns awaiting vendor response...');
      
      // Fetch all vendor requests (not just pending, so we can show stats)
      const { data: pendingRequests, error: requestsError } = await supabase
        .from('campaign_vendor_requests')
        .select(`
          id,
          campaign_id,
          vendor_id,
          status,
          requested_at,
          responded_at,
          vendors (id, name)
        `)
        .order('requested_at', { ascending: false });
      
      console.log('📊 All vendor requests:', pendingRequests?.length || 0, 'Error:', requestsError);
      if (pendingRequests && pendingRequests.length > 0) {
        console.log('📊 Request breakdown:', {
          pending: pendingRequests.filter(r => r.status === 'pending').length,
          approved: pendingRequests.filter(r => r.status === 'ready').length,
          rejected: pendingRequests.filter(r => r.status === 'on_hold').length,
          vendors: pendingRequests.map(r => ({ vendor: (r.vendors as any)?.name, status: r.status }))
        });
      }

      if (requestsError) {
        console.error('❌ Error fetching vendor requests:', requestsError);
        throw requestsError;
      }

      if (!pendingRequests || pendingRequests.length === 0) {
        return [];
      }

      // Group requests by campaign_id
      const campaignRequestsMap = new Map<string, any[]>();
      for (const req of pendingRequests) {
        const existing = campaignRequestsMap.get(req.campaign_id) || [];
        existing.push(req);
        campaignRequestsMap.set(req.campaign_id, existing);
      }

      // Filter to only campaigns with at least one pending request
      const campaignsWithPending: string[] = [];
      campaignRequestsMap.forEach((requests, campaignId) => {
        if (requests.some(r => r.status === 'pending')) {
          campaignsWithPending.push(campaignId);
        }
      });

      if (campaignsWithPending.length === 0) {
        return [];
      }

      // Fetch campaign details from campaign_groups
      const { data: campaignGroups, error: campaignsError } = await supabase
        .from('campaign_groups')
        .select(`
          id,
          name,
          start_date,
          end_date,
          total_goal,
          total_budget,
          status,
          created_at,
          clients (name)
        `)
        .in('id', campaignsWithPending);

      if (campaignsError) {
        console.error('❌ Error fetching campaign groups:', campaignsError);
        throw campaignsError;
      }

      // Also fetch spotify_campaigns for track URL
      const { data: spotifyCampaigns } = await supabase
        .from('spotify_campaigns')
        .select('campaign_group_id, url, campaign')
        .in('campaign_group_id', campaignsWithPending);

      const spotifyCampaignsMap = (spotifyCampaigns || []).reduce((acc: any, sc: any) => {
        acc[sc.campaign_group_id] = sc;
        return acc;
      }, {});

      // Build result with vendor request stats
      const result: CampaignAwaitingVendor[] = (campaignGroups || []).map(cg => {
        const requests = campaignRequestsMap.get(cg.id) || [];
        const pendingVendors = requests
          .filter(r => r.status === 'pending')
          .map(r => ({
            vendor_id: r.vendor_id,
            vendor_name: (r.vendors as any)?.name || 'Unknown Vendor',
            requested_at: r.requested_at
          }));
        
        const spotifyCampaign = spotifyCampaignsMap[cg.id];
        
        return {
          id: cg.id,
          name: cg.name || spotifyCampaign?.campaign || 'Campaign',
          client_name: (cg.clients as any)?.name || 'Unknown Client',
          track_url: spotifyCampaign?.url || '',
          stream_goal: cg.total_goal || 0,
          budget: cg.total_budget || 0,
          start_date: cg.start_date,
          status: cg.status,
          created_at: cg.created_at,
          pending_vendors: pendingVendors,
          total_vendors: requests.length,
          pending_count: requests.filter(r => r.status === 'pending').length,
          approved_count: requests.filter(r => r.status === 'ready').length,
          rejected_count: requests.filter(r => r.status === 'on_hold').length
        };
      });

      console.log('📦 Campaigns awaiting vendor:', result.length);
      return result;
    },
    staleTime: 30000,
  });
}

// Hook to create a new submission (public)
export function useCreateCampaignSubmission() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (submissionData: CreateSubmissionData) => {
      console.log('📝 Creating submission with data:', submissionData);
      
      const insertPayload = {
        ...submissionData,
        client_id: submissionData.client_id || null,
        sfa_url: submissionData.sfa_url || null,
        vendor_assignments: submissionData.vendor_assignments || [],
        music_genres: submissionData.music_genres || [],
        territory_preferences: submissionData.territory_preferences || [],
        status: 'pending',
        org_id: '00000000-0000-0000-0000-000000000001' // Add default org_id for RLS
      };
      
      console.log('📦 Insert payload:', insertPayload);
      
      const { error, data } = await supabase
        .from('campaign_submissions')
        .insert(insertPayload)
        .select();

      console.log('📊 Insert result:', { error, data });

      if (error) {
        console.error('❌ Submission insert error:', error);
        console.error('📋 Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      return data?.[0] ?? null;
    },
    onSuccess: () => {
      // Don't show toast here - let the component handle the success UI
      queryClient.invalidateQueries({ queryKey: ['campaign-submissions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit campaign. Please try again.",
        variant: "destructive",
      });
    },
  });
}

// Hook to approve a submission (admin only)
export function useApproveCampaignSubmission() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (submissionId: string) => {
      console.log('🚀 Starting approval process for submission:', submissionId);
      
      // First, get the submission data
      const { data: submission, error: fetchError } = await supabase
        .from('campaign_submissions')
        .select('*')
        .eq('id', submissionId)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching submission:', fetchError);
        throw new Error(`Failed to fetch submission: ${fetchError.message}`);
      }
      
      console.log('✅ Submission data fetched:', submission.campaign_name);

      // Store rejection reason in algorithm_recommendations and update submission
      // Use the indexed lookup for better performance
      console.log('🔍 Looking for existing client:', submission.client_name);
      const { data: existingClient, error: clientFindError } = await supabase
        .from('clients')
        .select('id')
        .ilike('name', submission.client_name)
        .maybeSingle(); // Use maybeSingle to avoid errors when no client found

      let clientId = existingClient?.id;

      // If client doesn't exist, create them
      if (!clientId) {
        console.log('👤 Creating new client:', submission.client_name);
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert([{
            name: submission.client_name,
            emails: submission.client_emails
          }])
          .select('id')
          .single();

        if (clientError) {
          console.error('❌ Error creating client:', clientError);
          throw new Error(`Failed to create client: ${clientError.message}`);
        }
        clientId = newClient.id;
        console.log('✅ Client created with ID:', clientId);
      } else {
        console.log('✅ Found existing client with ID:', clientId);
      }

      // Create campaign using NEW schema (campaign_groups + spotify_campaigns + campaign_playlists)
      console.log('📝 Creating campaign with new schema...');
      
      // Extract artist name from campaign name (format: "Artist Name - Track Title")
      const artistName = submission.campaign_name.includes(' - ') 
        ? submission.campaign_name.split(' - ')[0].trim()
        : submission.campaign_name;
      
      // Calculate end_date from start_date + duration_days
      const startDate = new Date(submission.start_date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (submission.duration_days || 90));
      
      // 1. Create campaign_group
      const campaignGroupPayload = {
        name: submission.campaign_name,
        artist_name: artistName,
        client_id: clientId || null,
        total_goal: submission.stream_goal,
        total_budget: submission.price_paid,
        start_date: submission.start_date,
        end_date: endDate.toISOString().split('T')[0],
        status: 'ready',
        salesperson: submission.salesperson || null,
        notes: submission.notes || null
      };
      
      console.log('Creating campaign_group:', campaignGroupPayload);
      
      const { data: createdCampaignGroup, error: campaignGroupError } = await supabase
        .from('campaign_groups')
        .insert(campaignGroupPayload)
        .select()
        .single();
      
      if (campaignGroupError) {
        console.error('❌ Campaign group error:', campaignGroupError);
        throw campaignGroupError;
      }
      
      console.log('✅ Campaign group created:', createdCampaignGroup.id);
      
      // 2. Create spotify_campaigns entry
      const spotifyCampaignPayload = {
        campaign_group_id: createdCampaignGroup.id,
        campaign: submission.campaign_name,
        vendor: 'Multiple',
        goal: submission.stream_goal,
        remaining: submission.stream_goal,
        daily: 0,
        weekly: 0,
        url: submission.track_url,
        status: 'ready',
        curator_status: 'Pending',
        playlists: (submission as any).vendor_assignments?.flatMap((va: any) => va.playlist_ids || []) || [],
        notes: `Created from submission approval. ${submission.music_genres ? `Genres: ${submission.music_genres.join(', ')}` : ''}`,
        sfa: (submission as any).sfa_url || null
      };
      
      console.log('Creating spotify_campaign:', spotifyCampaignPayload);
      
      const { data: createdSpotifyCampaign, error: spotifyCampaignError } = await supabase
        .from('spotify_campaigns')
        .insert(spotifyCampaignPayload)
        .select()
        .single();
      
      if (spotifyCampaignError) {
        console.error('❌ Spotify campaign error:', spotifyCampaignError);
        throw spotifyCampaignError;
      }
      
      console.log('✅ Spotify campaign created:', createdSpotifyCampaign.id);
      
      // 3. Create campaign_playlists entries from vendor_assignments
      const vendorAssignments = (submission as any).vendor_assignments || [];
      console.log('Processing vendor assignments:', vendorAssignments.length);
      
      if (vendorAssignments.length > 0) {
        // Get all playlist IDs from vendor assignments
        const allPlaylistIds = vendorAssignments.flatMap((va: any) => va.playlist_ids || []);
        
        if (allPlaylistIds.length > 0) {
          console.log('Fetching playlist details for', allPlaylistIds.length, 'playlists...');
          
          const { data: playlistDetails, error: playlistFetchError } = await supabase
            .from('playlists')
            .select('id, name, vendor_id, vendor:vendors(id, name)')
            .in('id', allPlaylistIds);
          
          if (playlistFetchError) {
            console.error('❌ Error fetching playlist details:', playlistFetchError);
          } else if (playlistDetails && playlistDetails.length > 0) {
            console.log('Fetched playlist details:', playlistDetails.length);
            
            // Create campaign_playlists entries
            const campaignPlaylistsEntries = playlistDetails.map(playlist => ({
              campaign_id: createdSpotifyCampaign.id,
              playlist_name: playlist.name,
              vendor_id: playlist.vendor_id,
              playlist_curator: (playlist as any).vendor?.name || null, // Set vendor name as curator
              is_algorithmic: false, // These are vendor playlists
              org_id: '00000000-0000-0000-0000-000000000001'
            }));
            
            console.log('Creating campaign_playlists entries:', campaignPlaylistsEntries);
            
            const { error: insertError } = await supabase
              .from('campaign_playlists')
              .insert(campaignPlaylistsEntries);
            
            if (insertError) {
              console.error('❌ Error creating campaign_playlists entries:', insertError);
            } else {
              console.log(`✅ Created ${campaignPlaylistsEntries.length} campaign_playlists entries`);
            }
          }
        }
      }

      // 4. Create campaign_vendor_requests for each vendor so they can accept/reject
      console.log('📨 Creating vendor campaign requests...');
      const uniqueVendors = new Map<string, string[]>();
      vendorAssignments.forEach((va: any) => {
        // Include vendors even without specific playlist_ids - they can choose later
        if (va.vendor_id) {
          const existing = uniqueVendors.get(va.vendor_id) || [];
          const playlistIds = va.playlist_ids || [];
          uniqueVendors.set(va.vendor_id, [...existing, ...playlistIds]);
        }
      });

      if (uniqueVendors.size > 0) {
        const vendorRequests = Array.from(uniqueVendors.entries()).map(([vendorId, playlistIds]) => ({
          campaign_id: createdCampaignGroup.id, // Use campaign_group_id as the linking ID
          vendor_id: vendorId,
          playlist_ids: playlistIds, // May be empty - vendor will select playlists when accepting
          status: 'pending',
          requested_at: new Date().toISOString(),
          org_id: '00000000-0000-0000-0000-000000000001'
        }));
        
        console.log('Creating vendor requests:', vendorRequests.length);
        
        const { error: requestError } = await supabase
          .from('campaign_vendor_requests')
          .insert(vendorRequests);
        
        if (requestError) {
          console.error('❌ Error creating vendor requests:', requestError);
          console.error('📋 Vendor request error details:', {
            message: requestError.message,
            code: requestError.code,
            details: requestError.details,
            hint: requestError.hint
          });
          // Log the payload for debugging
          console.error('📋 Vendor request payload:', vendorRequests);
          // Don't throw - vendor requests are secondary to campaign creation
          // But log a warning that can be seen
          console.warn('⚠️ Campaign created but vendor requests failed - campaign may not appear in "Awaiting Vendor" section');
        } else {
          console.log(`✅ Created ${vendorRequests.length} vendor campaign requests`);
        }
      } else {
        console.log('⚠️ No vendor assignments found, skipping vendor requests');
      }

      // Update submission status to ready
      console.log('✅ Updating submission status to ready...');
      const { error: updateError } = await supabase
        .from('campaign_submissions')
        .update({ 
          status: 'ready',
          approved_at: new Date().toISOString()
          // Note: approved_by requires a UUID, would need user context to set properly
        })
        .eq('id', submissionId);

      if (updateError) {
        console.error('❌ Error updating submission status:', updateError);
        throw new Error(`Failed to update submission status: ${updateError.message}`);
      }
      
      console.log('🎉 Approval process completed successfully');
      await notifyOpsStatusChange({
        service: 'spotify',
        campaignId: submissionId,
        status: 'ready',
      });
      notifySlack("spotify", "submission_status_change", {
        submissionId,
        status: 'ready',
      });
      return submission;
    },
    onSuccess: () => {
      toast({
        title: "Campaign Approved",
        description: "Campaign is ready. Vendor requests have been sent.",
      });
      queryClient.invalidateQueries({ queryKey: ['campaign-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-groups'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-campaign-requests'] });
    },
    onError: (error: any) => {
      console.error('💥 Campaign approval failed:', error);
      // Extract detailed error message
      let errorMessage = "Failed to approve campaign.";
      if (error?.message) {
        errorMessage = error.message;
      }
      if (error?.details) {
        errorMessage += ` Details: ${error.details}`;
      }
      if (error?.hint) {
        errorMessage += ` Hint: ${error.hint}`;
      }
      // Handle RLS policy errors specifically
      if (errorMessage.includes('row-level security policy') || errorMessage.includes('RLS')) {
        errorMessage = "Permission error: The campaign was partially created but vendor requests could not be added. Please contact an administrator to check database permissions.";
      }
      toast({
        title: "Approval Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
}

// Hook to reject a submission (admin only)
export function useRejectCampaignSubmission() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ submissionId, reason }: { submissionId: string; reason: string }) => {
      const { error } = await supabase
        .from('campaign_submissions')
        .update({ 
          status: 'on_hold',
          rejection_reason: reason
        })
        .eq('id', submissionId);

      if (error) throw error;
      await notifyOpsStatusChange({
        service: 'spotify',
        campaignId: submissionId,
        status: 'on_hold',
      });
      notifySlack("spotify", "submission_status_change", {
        submissionId,
        status: 'on_hold',
      });
    },
    onSuccess: () => {
      toast({
        title: "Campaign Rejected",
        description: "Submission has been rejected and client will be notified.",
      });
      queryClient.invalidateQueries({ queryKey: ['campaign-submissions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject campaign.",
        variant: "destructive",
      });
    },
  });
}

// Hook to update vendor assignments on a submission
export function useUpdateSubmissionVendors() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      submissionId, 
      vendorAssignments 
    }: { 
      submissionId: string; 
      vendorAssignments: Array<{
        vendor_id: string;
        vendor_name: string;
        allocated_streams: number;
        allocated_budget: number;
        playlist_ids?: string[];
      }>;
    }) => {
      console.log('📝 Updating vendor assignments for submission:', submissionId, vendorAssignments);
      
      const { error } = await supabase
        .from('campaign_submissions')
        .update({ 
          vendor_assignments: vendorAssignments
        })
        .eq('id', submissionId);

      if (error) {
        console.error('❌ Error updating vendor assignments:', error);
        throw error;
      }
      
      console.log('✅ Vendor assignments updated successfully');
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Vendor Assignments Updated",
        description: "Vendor allocations have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ['campaign-submissions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update vendor assignments.",
        variant: "destructive",
      });
    },
  });
}








