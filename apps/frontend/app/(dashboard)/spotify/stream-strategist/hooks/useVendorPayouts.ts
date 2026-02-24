"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';

export interface VendorPayout {
  vendor_id: string;
  vendor_name: string;
  campaign_id: string;
  campaign_name: string;
  amount_owed: number;
  payment_status: 'paid' | 'unpaid';
  campaign_completion_date?: string;
  invoice_id?: string;
  payment_date?: string;
  allocated_streams: number;
  actual_streams: number;
  cost_per_stream: number;
}

export interface VendorPayoutSummary {
  vendor_id: string;
  vendor_name: string;
  total_owed: number;
  amount_paid: number;
  unpaid_campaigns: number;
  paid_campaigns: number;
  campaigns: VendorPayout[];
}

export const useVendorPayouts = () => {
  return useQuery({
    queryKey: ['vendor-payouts'],
    queryFn: async (): Promise<VendorPayoutSummary[]> => {
      console.log('💰 [VendorPayouts] Starting to fetch vendor payouts...');
      
      // Fetch campaign allocations with vendor and campaign data
      const { data: allocations, error: allocationsError } = await supabase
        .from('campaign_allocations_performance')
        .select(
          `id, campaign_id, vendor_id, allocated_streams, predicted_streams, actual_streams, cost_per_stream, actual_cost_per_stream, performance_score, completed_at`
        );
      
      console.log('💰 [VendorPayouts] Allocations:', allocations?.length || 0, allocationsError?.message);

      // Also fetch active/completed campaigns 
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaign_groups')
        .select(`
          id,
          name,
          status,
          start_date
        `)
        .in('status', ['Active', 'Complete', 'Completed']);

      // Fetch all vendors to get cost_per_1k_streams rates
      const { data: vendors, error: vendorsError } = await supabase
        .from('vendors')
        .select('id, name, cost_per_1k_streams');

      // Fetch spotify_campaigns for direct payment tracking (paid_vendor, sale_price)
      const { data: spotifyCampaigns, error: spotifyCampaignsError } = await supabase
        .from('spotify_campaigns')
        .select('id, campaign_group_id, vendor, paid_vendor, sale_price');
      
      console.log('💰 [VendorPayouts] Campaigns:', campaigns?.length || 0, campaignsError?.message);
      console.log('💰 [VendorPayouts] SpotifyCampaigns:', spotifyCampaigns?.length || 0, spotifyCampaignsError?.message);
      console.log('💰 [VendorPayouts] Vendors:', vendors?.length || 0, vendorsError?.message);
      
      // Log sample spotify campaigns
      if (spotifyCampaigns && spotifyCampaigns.length > 0) {
        console.log('💰 [VendorPayouts] Sample SpotifyCampaign:', spotifyCampaigns[0]);
      }

      if (allocationsError && campaignsError && vendorsError && spotifyCampaignsError) {
        throw allocationsError || campaignsError || vendorsError || spotifyCampaignsError;
      }

      const vendorMap = new Map((vendors || []).map((v: any) => [v.id, v]));
      const campaignsMap = new Map((campaigns || []).map((c: any) => [c.id, c]));
      
      // Create a lookup map of vendor name -> vendor ID
      const vendorNameToIdMap = new Map<string, string>();
      (vendors || []).forEach((v: any) => {
        vendorNameToIdMap.set(v.name.toLowerCase(), v.id);
      });
      
      // Create a map of campaign_group_id -> vendor payment info from spotify_campaigns
      const spotifyCampaignPayments = new Map<string, { vendor_id: string; vendor_name: string; sale_price: number; paid_vendor: boolean }>();
      (spotifyCampaigns || []).forEach((sc: any) => {
        if (sc.campaign_group_id && sc.vendor && sc.sale_price) {
          const vendorId = vendorNameToIdMap.get(sc.vendor.toLowerCase());
          if (vendorId) {
            // Parse sale_price, handling string format like "$400.00" or numeric
            const salePriceStr = String(sc.sale_price).replace(/[$,]/g, '');
            const salePrice = parseFloat(salePriceStr) || 0;
            
            spotifyCampaignPayments.set(sc.campaign_group_id, {
              vendor_id: vendorId,
              vendor_name: sc.vendor,
              sale_price: salePrice,
              paid_vendor: sc.paid_vendor === 'true' || sc.paid_vendor === true
            });
          } else {
            // Silently skip unknown vendors to reduce noise
          }
        }
      });
      
      console.log('💰 [VendorPayouts] SpotifyCampaignPayments map size:', spotifyCampaignPayments.size);

      // Fetch campaign_playlists for cost_per_1k_override and vendor_paid (per-vendor payment tracking)
      // Include is_organic so we can exclude organic playlists from payment calculations
      const { data: campaignPlaylists, error: playlistsError } = await supabase
        .from('campaign_playlists')
        .select('campaign_id, vendor_id, cost_per_1k_override, streams_12m, streams_7d, vendor_paid, vendor_payment_date, vendor_payment_amount, is_organic')
        .not('vendor_id', 'is', null);
      
      console.log('💰 [VendorPayouts] CampaignPlaylists with overrides:', campaignPlaylists?.filter((p: any) => p.cost_per_1k_override)?.length || 0);
      console.log('💰 [VendorPayouts] CampaignPlaylists paid:', campaignPlaylists?.filter((p: any) => p.vendor_paid)?.length || 0);

      // Create a map for campaign-vendor cost overrides AND payment status
      // Exclude organic playlists — they should never count toward vendor payments
      const costOverrideMap = new Map<string, { override: number; streams: number; vendor_paid: boolean; payment_date: string | null }>();
      (campaignPlaylists || []).filter((cp: any) => !cp.is_organic).forEach((cp: any) => {
        const key = `${cp.campaign_id}-${cp.vendor_id}`;
        const existing = costOverrideMap.get(key);
        const streams = cp.streams_12m || cp.streams_7d || 0;
        
        if (existing) {
          // Aggregate streams and prefer override if set
          existing.streams += streams;
          if (cp.cost_per_1k_override && (!existing.override || cp.cost_per_1k_override > existing.override)) {
            existing.override = cp.cost_per_1k_override;
          }
          // If any playlist for this vendor is paid, consider the vendor paid
          if (cp.vendor_paid) {
            existing.vendor_paid = true;
            existing.payment_date = cp.vendor_payment_date || existing.payment_date;
          }
        } else {
          costOverrideMap.set(key, {
            override: cp.cost_per_1k_override || 0,
            streams: streams,
            vendor_paid: cp.vendor_paid === true,
            payment_date: cp.vendor_payment_date || null
          });
        }
      });

      type RawAllocation = {
        campaign_id: string;
        vendor_id: string;
        allocated_streams: number;
        predicted_streams?: number;
        actual_streams: number;
        cost_per_stream?: number;
        actual_cost_per_stream?: number;
        performance_score?: number;
        completed_at?: string | null;
      };

      const allPayoutData: RawAllocation[] = [];

      // Existing allocations from performance table
      if (allocations) {
        allPayoutData.push(...(allocations as RawAllocation[]));
      }

      // Also add Spotify campaign direct payment data to allPayoutData
      spotifyCampaignPayments.forEach((payment, campaignId) => {
        // Check if already exists in allPayoutData
        const exists = allPayoutData.some(
          (a: any) => a.campaign_id === campaignId && a.vendor_id === payment.vendor_id
        );
        if (exists) return;
        
        const vendor = vendorMap.get(payment.vendor_id);
        const costPer1k = vendor?.cost_per_1k_streams || 0;
        const costPerStream = costPer1k / 1000;
        
        // Use sale_price to estimate allocated_streams if needed
        const estimatedStreams = payment.sale_price / costPerStream;
        
        allPayoutData.push({
          campaign_id: campaignId,
          vendor_id: payment.vendor_id,
          allocated_streams: estimatedStreams,
          predicted_streams: estimatedStreams,
          actual_streams: estimatedStreams,
          cost_per_stream: costPerStream,
          actual_cost_per_stream: costPerStream,
          performance_score: 0,
          completed_at: null,
        });
      });

      // Fetch campaign invoices separately and map by campaign_id
      const campaignIds = Array.from(
        new Set([
          ...((allocations || []).map((a: any) => a.campaign_id)),
          ...((campaigns || []).map((c: any) => c.id)),
        ])
      );

      let invoicesByCampaign = new Map<string, any[]>();
      if (campaignIds.length > 0) {
        const { data: invoices } = await supabase
          .from('campaign_invoices')
          .select('id,campaign_id,status,paid_date,amount')
          .in('campaign_id', campaignIds);

        invoicesByCampaign = new Map();
        (invoices || []).forEach((inv: any) => {
          const arr = invoicesByCampaign.get(inv.campaign_id) || [];
          arr.push(inv);
          invoicesByCampaign.set(inv.campaign_id, arr);
        });
      }

      // Group allocations by vendor+campaign to aggregate duplicates
      const campaignVendorMap = new Map<string, {
        vendor_id: string;
        campaign_id: string;
        allocated_streams: number;
        actual_streams: number;
        cost_per_stream: number;
      }>();

      // Aggregate allocations per vendor per campaign
      (allPayoutData || []).forEach((allocation: any) => {
        const key = `${allocation.campaign_id}-${allocation.vendor_id}`;
        const vendor = vendorMap.get(allocation.vendor_id);
        if (!vendor) return;

        // Check for campaign-specific cost override first!
        const overrideData = costOverrideMap.get(key);
        let costPerStream: number;
        
        if (overrideData?.override && overrideData.override > 0) {
          // Use campaign-specific override (convert from per 1k to per stream)
          costPerStream = overrideData.override / 1000;
          console.log(`💰 [VendorPayouts] Using override for ${key}: $${overrideData.override}/1k`);
        } else {
          // Fall back to allocation cost or vendor default
          costPerStream = (allocation.actual_cost_per_stream ?? allocation.cost_per_stream ?? ((vendor.cost_per_1k_streams || 0) / 1000)) as number;
        }
        
        // Use actual streams from campaign_playlists if available (more accurate), otherwise use allocation
        let actualStreams = overrideData?.streams || 0;
        if (actualStreams === 0) {
          actualStreams = typeof allocation.actual_streams === 'number' ? allocation.actual_streams : (allocation.allocated_streams || 0);
        }

        if (campaignVendorMap.has(key)) {
          // Aggregate with existing entry
          const existing = campaignVendorMap.get(key)!;
          existing.allocated_streams += allocation.allocated_streams || 0;
          existing.actual_streams += actualStreams || 0;
          // Use the higher cost per stream (prefer override)
          if (overrideData?.override && overrideData.override > 0) {
            existing.cost_per_stream = costPerStream; // Override takes precedence
          } else {
            existing.cost_per_stream = Math.max(existing.cost_per_stream, costPerStream);
          }
        } else {
          // Create new aggregated entry
          campaignVendorMap.set(key, {
            vendor_id: allocation.vendor_id,
            campaign_id: allocation.campaign_id,
            allocated_streams: allocation.allocated_streams || 0,
            actual_streams: actualStreams || 0,
            cost_per_stream: costPerStream,
          });
        }
      });

      // Group by vendor and calculate totals
      const vendorPayouts = new Map<string, VendorPayoutSummary>();

      campaignVendorMap.forEach((aggregatedAllocation, key) => {
        const vendor = vendorMap.get(aggregatedAllocation.vendor_id);
        const campaign = campaignsMap.get(aggregatedAllocation.campaign_id);
        if (!vendor || !campaign) return;

        const invoiceArr = (invoicesByCampaign.get(campaign.id) || []) as any[];
        const invoice = invoiceArr[0];
        
        // Check for per-vendor payment status from campaign_playlists (primary source)
        const playlistKey = `${aggregatedAllocation.campaign_id}-${aggregatedAllocation.vendor_id}`;
        const playlistPaymentInfo = costOverrideMap.get(playlistKey);
        const isPaidFromPlaylist = playlistPaymentInfo?.vendor_paid === true;
        
        // Check for Spotify campaign payment data (legacy fallback)
        const spotifyPayment = spotifyCampaignPayments.get(campaign.id);
        const isPaidFromSpotify = spotifyPayment?.paid_vendor === true || spotifyPayment?.paid_vendor === 'true';

        const amountOwed = spotifyPayment?.sale_price || 
          ((aggregatedAllocation.allocated_streams || 0) * (aggregatedAllocation.cost_per_stream || 0));
        
        // Payment status: check campaign_playlists first (per-vendor), then invoice, then spotify paid_vendor
        const paymentStatus: 'paid' | 'unpaid' = 
          isPaidFromPlaylist || invoice?.status === 'paid' || isPaidFromSpotify ? 'paid' : 'unpaid';

        const startDate = new Date(campaign.start_date);
        const completionDate = new Date(startDate);
        // Default to 30 days if duration not specified
        completionDate.setDate(completionDate.getDate() + 30);

        const payoutData: VendorPayout = {
          vendor_id: vendor.id,
          vendor_name: vendor.name,
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          amount_owed: amountOwed,
          payment_status: paymentStatus,
          campaign_completion_date: isNaN(completionDate.getTime()) ? undefined : completionDate.toISOString().split('T')[0],
          invoice_id: invoice?.id,
          payment_date: playlistPaymentInfo?.payment_date || invoice?.paid_date,
          allocated_streams: aggregatedAllocation.allocated_streams,
          actual_streams: aggregatedAllocation.actual_streams,
          cost_per_stream: aggregatedAllocation.cost_per_stream,
        };

        if (!vendorPayouts.has(vendor.id)) {
          vendorPayouts.set(vendor.id, {
            vendor_id: vendor.id,
            vendor_name: vendor.name,
            total_owed: 0,
            amount_paid: 0,
            unpaid_campaigns: 0,
            paid_campaigns: 0,
            campaigns: [],
          });
        }

        const summary = vendorPayouts.get(vendor.id)!;
        summary.campaigns.push(payoutData);
        summary.total_owed += amountOwed;
        if (paymentStatus === 'paid') {
          summary.paid_campaigns += 1;
          summary.amount_paid += amountOwed;
        } else {
          summary.unpaid_campaigns += 1;
        }
      });

      const result = Array.from(vendorPayouts.values());
      console.log('💰 [VendorPayouts] Final result:', result.length, 'vendors with payout data');
      result.forEach(v => console.log(`   - ${v.vendor_name}: ${v.campaigns.length} campaigns, $${v.total_owed} total, $${v.amount_paid} paid`));
      
      return result;
    }
  });
};

export const useMarkPayoutPaid = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      campaignId, 
      vendorId, 
      amount,
      markAsPaid = true
    }: { 
      campaignId: string; 
      vendorId: string; 
      amount: number;
      markAsPaid?: boolean;
    }) => {
      console.log('💰 [MarkPaid] Starting mutation:', { campaignId, vendorId, amount, markAsPaid });
      
      let updateSucceeded = false;
      
      // First, try to update campaign_playlists (per-vendor payment tracking)
      // This is the correct way to track payment per vendor per campaign
      const { data: playlistRows, error: playlistError } = await supabase
        .from('campaign_playlists')
        .update({ 
          vendor_paid: markAsPaid,
          vendor_payment_date: markAsPaid ? new Date().toISOString().split('T')[0] : null,
          vendor_payment_amount: markAsPaid ? amount : null
        })
        .eq('vendor_id', vendorId)
        .eq('campaign_id', parseInt(campaignId))
        .select('id, playlist_name, vendor_id, vendor_paid');

      console.log('💰 [MarkPaid] campaign_playlists update result:', { 
        updatedRows: playlistRows?.length || 0, 
        rowsData: playlistRows,
        error: playlistError 
      });

      if (!playlistError && playlistRows && playlistRows.length > 0) {
        updateSucceeded = true;
        console.log('💰 [MarkPaid] Successfully updated campaign_playlists');
      } else {
        // Fallback: Try using campaign_group_id (for campaigns linked via campaign_groups)
        console.log('💰 [MarkPaid] Trying campaign_group_id approach...');
        
        // First get the spotify_campaign IDs for this campaign_group
        const { data: spotifyCampaigns } = await supabase
          .from('spotify_campaigns')
          .select('id')
          .eq('campaign_group_id', campaignId);
        
        if (spotifyCampaigns && spotifyCampaigns.length > 0) {
          const campaignIds = spotifyCampaigns.map(sc => sc.id);
          
          const { data: playlistRows2, error: playlistError2 } = await supabase
            .from('campaign_playlists')
            .update({ 
              vendor_paid: markAsPaid,
              vendor_payment_date: markAsPaid ? new Date().toISOString().split('T')[0] : null,
              vendor_payment_amount: markAsPaid ? amount : null
            })
            .eq('vendor_id', vendorId)
            .in('campaign_id', campaignIds)
            .select('id, playlist_name, vendor_id, vendor_paid');

          if (!playlistError2 && playlistRows2 && playlistRows2.length > 0) {
            updateSucceeded = true;
            console.log('💰 [MarkPaid] Successfully updated via campaign_group_id');
          }
        }
      }

      // Also try to update/create invoice (for invoice tracking)
      try {
        const { data: existingInvoice } = await supabase
          .from('campaign_invoices')
          .select('id')
          .eq('campaign_id', campaignId)
          .eq('vendor_id', vendorId)
          .maybeSingle();

        console.log('💰 [MarkPaid] Existing invoice:', existingInvoice);

        if (existingInvoice) {
          const { error: invoiceUpdateError } = await supabase
            .from('campaign_invoices')
            .update({
              status: markAsPaid ? 'paid' : 'pending',
              paid_date: markAsPaid ? new Date().toISOString().split('T')[0] : null,
              amount: amount
            })
            .eq('id', existingInvoice.id);
          
          if (!invoiceUpdateError) {
            updateSucceeded = true;
            console.log('💰 [MarkPaid] Invoice updated successfully');
          } else {
            console.error('💰 [MarkPaid] Invoice update error:', invoiceUpdateError);
          }
        } else if (markAsPaid) {
          const { error: invoiceInsertError } = await supabase
            .from('campaign_invoices')
            .insert({
              campaign_id: campaignId,
              vendor_id: vendorId,
              amount: amount,
              status: 'paid',
              paid_date: new Date().toISOString().split('T')[0],
              invoice_number: `INV-${campaignId.substring(0, 8)}-${vendorId.substring(0, 4)}-${Date.now()}`
            });
          
          if (!invoiceInsertError) {
            updateSucceeded = true;
            console.log('💰 [MarkPaid] Invoice created successfully');
          } else {
            console.error('💰 [MarkPaid] Invoice insert error:', invoiceInsertError);
          }
        }
      } catch (invoiceError) {
        console.error('💰 [MarkPaid] Invoice operation failed:', invoiceError);
      }

      if (!updateSucceeded) {
        throw new Error(`No matching campaign/vendor combination found for campaignId: ${campaignId}, vendorId: ${vendorId}.`);
      }

      return { campaignId, vendorId, markAsPaid };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns-enhanced'] });
      toast({
        title: data.markAsPaid ? "Marked as Paid" : "Marked as Unpaid",
        description: data.markAsPaid 
          ? "Vendor payout has been successfully processed."
          : "Payment status has been reset to unpaid.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update payment status. Please try again.",
        variant: "destructive",
      });
    }
  });
};

export const useBulkMarkPayoutsPaid = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payouts: Array<{ campaignId: string; vendorId: string; amount: number; markAsPaid?: boolean }>) => {
      const results: string[] = [];
      const markAsPaid = payouts[0]?.markAsPaid ?? true; // Use first payout's markAsPaid value
      
      for (const payout of payouts) {
        // Update campaign_playlists per-vendor (correct approach)
        const { error: playlistError } = await supabase
          .from('campaign_playlists')
          .update({ 
            vendor_paid: markAsPaid,
            vendor_payment_date: markAsPaid ? new Date().toISOString().split('T')[0] : null,
            vendor_payment_amount: markAsPaid ? payout.amount : null
          })
          .eq('vendor_id', payout.vendorId)
          .eq('campaign_id', parseInt(payout.campaignId));

        if (playlistError) {
          // Try fallback with campaign_group_id
          const { data: spotifyCampaigns } = await supabase
            .from('spotify_campaigns')
            .select('id')
            .eq('campaign_group_id', payout.campaignId);
          
          if (spotifyCampaigns && spotifyCampaigns.length > 0) {
            const campaignIds = spotifyCampaigns.map(sc => sc.id);
            
            await supabase
              .from('campaign_playlists')
              .update({ 
                vendor_paid: markAsPaid,
                vendor_payment_date: markAsPaid ? new Date().toISOString().split('T')[0] : null,
                vendor_payment_amount: markAsPaid ? payout.amount : null
              })
              .eq('vendor_id', payout.vendorId)
              .in('campaign_id', campaignIds);
          }
        }

        // Also try to update/create invoice (but don't fail if RLS blocks it)
        try {
          const { data: existingInvoice } = await supabase
            .from('campaign_invoices')
            .select('id')
            .eq('campaign_id', payout.campaignId)
            .eq('vendor_id', payout.vendorId)
            .maybeSingle();

          if (existingInvoice) {
            await supabase
              .from('campaign_invoices')
              .update({
                status: markAsPaid ? 'paid' : 'pending',
                paid_date: markAsPaid ? new Date().toISOString().split('T')[0] : null,
                amount: payout.amount
              })
              .eq('id', existingInvoice.id);
          } else if (markAsPaid) {
            await supabase
              .from('campaign_invoices')
              .insert({
                campaign_id: payout.campaignId,
                vendor_id: payout.vendorId,
                amount: payout.amount,
                status: 'paid',
                paid_date: new Date().toISOString().split('T')[0],
                invoice_number: `INV-${payout.campaignId.substring(0, 8)}-${payout.vendorId.substring(0, 4)}-${Date.now()}`
              });
          }
        } catch (invoiceError) {
          console.warn(`Invoice update failed for ${payout.campaignId} (this is okay):`, invoiceError);
        }

        results.push(payout.campaignId);
      }
      
      return { results, markAsPaid };
    },
    onSuccess: (data, payouts) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns-enhanced'] });
      toast({
        title: data.markAsPaid ? "Marked as Paid" : "Marked as Unpaid",
        description: `${payouts.length} campaigns have been updated.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Bulk Update Failed",
        description: "Failed to update campaigns. Please try again.",
        variant: "destructive",
      });
    }
  });
};








