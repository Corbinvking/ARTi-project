"use client"

import { useState, useEffect } from 'react';
import { useParams } from "next/navigation";
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface CampaignData {
  name: string;
  client: string;
  client_id?: string;
  brand_name?: string;
  track_url: string;
  track_name?: string;
  stream_goal: number;
  budget: number;
  sub_genre: string;
  start_date: string;
  duration_days: number;
}

export function useCampaignBuilder() {
  const { campaignId, submissionId } = useParams();
  const [isEditing, setIsEditing] = useState(!!campaignId);
  const [isReviewing, setIsReviewing] = useState(!!submissionId);
  const [isLoading, setIsLoading] = useState(false);
  const [campaignData, setCampaignData] = useState<Partial<CampaignData>>({});
  const [submissionData, setSubmissionData] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load existing campaign data if editing or submission data if reviewing
  useEffect(() => {
    if (campaignId) {
      loadCampaignData(campaignId);
    } else if (submissionId) {
      loadSubmissionData(submissionId);
    }
  }, [campaignId, submissionId]);

  const loadCampaignData = async (id: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setCampaignData({
        name: data.name,
        client: data.client,
        client_id: data.client_id,
        track_url: data.track_url,
        track_name: data.track_name,
        stream_goal: data.stream_goal,
        budget: data.budget,
        sub_genre: data.sub_genre,
        start_date: data.start_date,
        duration_days: data.duration_days,
      });
    } catch (error) {
      console.error('Error loading campaign:', error);
      toast({
        title: "Error",
        description: "Failed to load campaign data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSubmissionData = async (id: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaign_submissions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setSubmissionData(data);
      
      // Resolve client_id from client_name if needed (case-insensitive), prefer provided client_id
      let clientId = (data as any).client_id || '';
      const incomingClientName = (data as any).client_name || (data as any).brand_name || '';
      if (!clientId && incomingClientName) {
        try {
          // Try case-insensitive exact match
          let { data: client } = await supabase
            .from('clients')
            .select('id')
            .ilike('name', incomingClientName.trim())
            .maybeSingle();

          // Fallback to prefix match
          if (!client) {
            const { data: candidates } = await supabase
              .from('clients')
              .select('id, name')
              .ilike('name', `${incomingClientName.trim()}%`)
              .limit(1);
            client = candidates?.[0];
          }

          if (client) {
            clientId = client.id as string;
          }
        } catch (error) {
          console.log('Could not resolve client_id:', error);
        }
      }
      
      // Convert submission data to campaign data format with proper field mapping
      setCampaignData({
        name: data.campaign_name,
        client: data.client_name,
        client_id: clientId, // Use resolved client_id
        brand_name: data.client_name,
        track_url: data.track_url,
        stream_goal: data.stream_goal,
        budget: data.price_paid, // Map price_paid to budget
        sub_genre: Array.isArray(data.music_genres) ? data.music_genres.join(', ') : data.music_genres || '',
        start_date: data.start_date,
        duration_days: data.duration_days,
      });
      setIsReviewing(true);
    } catch (error) {
      console.error('Error loading submission:', error);
      toast({
        title: "Error",
        description: "Failed to load submission data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveCampaign = async (data: CampaignData, allocationsData: any, status: 'built' | 'unreleased' | 'active' = 'built') => {
    try {
      console.log('💾 Saving campaign with new schema...');
      console.log('Data:', data);
      console.log('Allocations:', allocationsData);
      
      // Extract artist name from campaign name (format: "Artist Name - Track Title")
      const artistName = data.name.includes(' - ') 
        ? data.name.split(' - ')[0].trim()
        : data.name;
      
      // Calculate end_date from start_date + duration_days
      const startDate = new Date(data.start_date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (data.duration_days || 90));
      
      // 1. Create campaign_group
      const campaignGroupPayload = {
        name: data.name,
        artist_name: artistName,
        client_id: data.client_id || null,
        total_goal: data.stream_goal,
        total_budget: data.budget,
        start_date: data.start_date,
        end_date: endDate.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
        status: status === 'active' ? 'Active' : status === 'unreleased' ? 'Unreleased' : 'Draft',
        salesperson: (data as any).salesperson || null,
        notes: null
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
      
      // 1.5. Deduct client credits if any were allocated
      const creditsAllocated = (data as any).credits_allocated || 0;
      if (creditsAllocated > 0 && data.client_id) {
        console.log(`💳 Deducting $${creditsAllocated} credits from client ${data.client_id}`);
        
        // Get current credit balance
        const { data: clientData, error: clientFetchError } = await supabase
          .from('clients')
          .select('credit_balance')
          .eq('id', data.client_id)
          .single();
        
        if (clientFetchError) {
          console.error('❌ Error fetching client credit balance:', clientFetchError);
        } else {
          const currentBalance = clientData.credit_balance || 0;
          const newBalance = Math.max(0, currentBalance - creditsAllocated);
          
          // Update client credit balance
          const { error: creditUpdateError } = await supabase
            .from('clients')
            .update({ credit_balance: newBalance })
            .eq('id', data.client_id);
          
          if (creditUpdateError) {
            console.error('❌ Error updating client credit balance:', creditUpdateError);
            // Don't throw - we still want the campaign to be created even if credit deduction fails
            toast({
              title: "Warning",
              description: "Campaign created but credits may not have been deducted. Please verify in Client Manager.",
              variant: "destructive",
            });
          } else {
            console.log(`✅ Client credit balance updated: $${currentBalance} → $${newBalance}`);
          }
        }
      }
      
      // 2. Create stream_strategist_campaigns entry (for vendor payments & main UI)
      const streamStrategistPayload = {
        org_id: '00000000-0000-0000-0000-000000000001',
        name: data.name,
        client: data.client_name || null,
        client_id: data.client_id || null,
        client_name: data.client_name || null,
        track_name: data.track_name || data.name,
        track_url: data.track_url || '',
        stream_goal: data.stream_goal || 0,
        remaining_streams: data.stream_goal || 0,
        budget: data.budget || 0,
        sub_genre: data.sub_genre || null,
        music_genres: data.music_genres || [],
        duration_days: data.duration_days || 90,
        start_date: data.start_date,
        status: status === 'active' ? 'active' : status === 'unreleased' ? 'unreleased' : 'draft',
        salesperson: (data as any).salesperson || null,
        selected_playlists: allocationsData?.selectedPlaylists || [],
        vendor_allocations: allocationsData?.vendorAllocations || {},
        source: 'campaign_builder',
        campaign_type: 'spotify_promotion'
      };
      
      console.log('Creating stream_strategist_campaigns:', streamStrategistPayload);
      
      const { data: createdStreamStrategistCampaign, error: streamStrategistError } = await supabase
        .from('stream_strategist_campaigns')
        .insert(streamStrategistPayload)
        .select()
        .single();
      
      if (streamStrategistError) {
        console.error('❌ Stream strategist campaign error:', streamStrategistError);
        throw streamStrategistError;
      }
      
      console.log('✅ Stream strategist campaign created:', createdStreamStrategistCampaign.id);
      
      // 3. Create spotify_campaigns entry (for scraper compatibility)
      const spotifyCampaignPayload = {
        campaign_group_id: createdCampaignGroup.id,
        campaign: data.track_name || data.name,
        vendor: 'Multiple',
        goal: data.stream_goal,
        remaining: data.stream_goal,
        daily: 0,
        weekly: 0,
        url: data.track_url,
        status: 'Active',
        curator_status: 'Pending',
        playlists: allocationsData?.selectedPlaylists || [],
        notes: `Created from campaign builder. ${data.sub_genre ? `Genre: ${data.sub_genre}` : ''}`,
        sfa: (data as any).sfa_url || null
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
      
      // 4. Create playlist associations
      const playlistIds = allocationsData?.playlistIds || [];
      
      if (playlistIds.length > 0) {
        console.log('Creating playlist associations for campaign:', createdSpotifyCampaign.id);
        console.log('Playlist IDs:', playlistIds);
        
        const { data: playlistDetails, error: playlistFetchError } = await supabase
          .from('playlists')
          .select('id, name, vendor_id, vendor:vendors(id, name, cost_per_1k_streams)')
          .in('id', playlistIds);
        
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
          
          // ALSO create campaign_allocations_performance entries for vendor payments
          const performanceEntries = playlistDetails
            .filter(p => p.vendor_id) // Only for vendor playlists (not algorithmic)
            .map(playlist => ({
              campaign_id: createdStreamStrategistCampaign.id, // UUID from stream_strategist_campaigns (required by FK constraint)
              vendor_id: playlist.vendor_id,
              playlist_id: playlist.id,
              allocated_streams: Math.round((data.stream_goal || 0) / playlistDetails.length), // Distribute goal evenly
              predicted_streams: 0,
              actual_streams: 0,
              cost_per_stream: (playlist as any).vendor?.cost_per_1k_streams ? ((playlist as any).vendor.cost_per_1k_streams / 1000) : 0.01,
              payment_status: 'unpaid',
              org_id: '00000000-0000-0000-0000-000000000001'
            }));
          
          if (performanceEntries.length > 0) {
            console.log('Creating campaign_allocations_performance entries:', performanceEntries);
            const { error: perfError } = await supabase
              .from('campaign_allocations_performance')
              .insert(performanceEntries);
            
            if (perfError) {
              console.error('❌ Error creating campaign_allocations_performance entries:', perfError);
            } else {
              console.log(`✅ Created ${performanceEntries.length} campaign_allocations_performance entries for vendor payments`);
            }
          }
        } else {
          console.log('⚠️ No playlist details found');
        }
      } else {
        console.log('⚠️ No playlist IDs to associate');
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns-enhanced'] }); // FIX: Campaign History uses this key
      queryClient.invalidateQueries({ queryKey: ['campaign-groups'] });

      const action = isEditing ? 'updated' : 'created';
      const statusMessage = status === 'active' ? 'and activated' : 
                           status === 'unreleased' ? 'as unreleased' : 
                           'and ready for launch';

      toast({
        title: `Campaign ${action}`,
        description: `Campaign successfully ${action} ${statusMessage}.`,
      });

      return { ...createdCampaignGroup, spotify_campaign: createdSpotifyCampaign };
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} campaign.`,
        variant: "destructive",
      });
      throw error;
    }
  };

  const approveSubmission = async (data: CampaignData, allocationsData: any) => {
    if (!submissionData) {
      throw new Error('No submission data available');
    }

    try {
      // Create campaign from submission
      const campaignPayload = {
        name: data.name,
        client: data.client,
        client_id: data.client_id,
        track_url: data.track_url,
        track_name: data.track_name,
        stream_goal: data.stream_goal,
        budget: data.budget,
        sub_genre: data.sub_genre,
        start_date: data.start_date,
        duration_days: data.duration_days,
        status: 'active',
        selected_playlists: allocationsData?.selectedPlaylists || allocationsData?.allocations?.map((a: any) => a.playlistId) || [],
        vendor_allocations: {
          // Create vendor allocations object from both playlist and direct vendor allocations
          ...allocationsData?.allocations?.reduce((acc: any, allocation: any) => {
            if (allocation.vendor_id && allocation.playlist_id) {
              // Playlist-based allocation
              if (!acc[allocation.vendor_id]) {
                acc[allocation.vendor_id] = { playlists: {} };
              }
              acc[allocation.vendor_id].playlists[allocation.playlist_id] = allocation.allocation;
            }
            return acc;
          }, {}),
          // Add direct vendor allocations
          ...allocationsData?.vendorAllocations?.reduce((acc: any, va: any) => {
            if (!acc[va.vendor_id]) {
              acc[va.vendor_id] = { playlists: {} };
            }
            acc[va.vendor_id].direct_allocation = va.allocation;
            return acc;
          }, {})
        },
        totals: {
          projected_streams: allocationsData.totalProjectedStreams || 0
        },
        brand_name: data.client || submissionData.client_name || 'Unknown Client',
        submission_id: submissionData.id,
        source: 'artist_influence_spotify_campaigns',
        campaign_type: 'artist_influence_spotify_promotion'
      };

      const result = await supabase
        .from('campaigns')
        .insert(campaignPayload)
        .select()
        .single();

      if (result.error) throw result.error;

      // Create vendor requests for selected playlists
      const selectedPlaylists = allocationsData?.selectedPlaylists || allocationsData?.allocations?.map((a: any) => a.playlistId) || [];
      if (selectedPlaylists && selectedPlaylists.length > 0) {
        // Group playlists by vendor
        const { data: playlists } = await supabase
          .from('playlists')
          .select('*, vendor:vendors(*)')
          .in('id', selectedPlaylists);

        if (playlists) {
          const vendorGroups = playlists.reduce((groups, playlist) => {
            const vendorId = playlist.vendor_id;
            if (!groups[vendorId]) {
              groups[vendorId] = [];
            }
            groups[vendorId].push(playlist.id);
            return groups;
          }, {} as Record<string, string[]>);

          // Create vendor requests
          const vendorRequests = Object.entries(vendorGroups).map(([vendorId, playlistIds]) => ({
            campaign_id: result.data.id,
            vendor_id: vendorId,
            playlist_ids: playlistIds,
            status: 'pending'
          }));

          await supabase
            .from('campaign_vendor_requests')
            .insert(vendorRequests);
        }
      }

      // Update submission status
      await supabase
        .from('campaign_submissions')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: 'System'
        })
        .eq('id', submissionData.id);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns-enhanced'] }); // FIX: Campaign History uses this key
      queryClient.invalidateQueries({ queryKey: ['campaign-submissions'] });

      toast({
        title: "Submission Approved",
        description: "Campaign has been created successfully.",
      });

      return result.data;
    } catch (error) {
      console.error('Error approving submission:', error);
      toast({
        title: "Error",
        description: "Failed to approve submission.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const rejectSubmission = async (reason: string) => {
    if (!submissionData) {
      throw new Error('No submission data available');
    }

    try {
      await supabase
        .from('campaign_submissions')
        .update({
          status: 'rejected',
          rejection_reason: reason
        })
        .eq('id', submissionData.id);

      queryClient.invalidateQueries({ queryKey: ['campaign-submissions'] });

      toast({
        title: "Submission Rejected",
        description: "Submission has been rejected.",
      });
    } catch (error) {
      console.error('Error rejecting submission:', error);
      toast({
        title: "Error",
        description: "Failed to reject submission.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    isEditing,
    isReviewing,
    isLoading,
    campaignData,
    submissionData,
    setCampaignData,
    saveCampaign,
    approveSubmission,
    rejectSubmission,
    campaignId,
    submissionId
  };
}








