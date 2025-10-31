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

      // Also fetch active/completed campaigns with vendor allocations that may not be in allocations table yet
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaign_groups')
        .select(`
          id,
          name,
          status,
          start_date,
          vendor_allocations
        `)
        .in('status', ['Active', 'Completed'])
        .not('vendor_allocations', 'is', null);

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
            spotifyCampaignPayments.set(sc.campaign_group_id, {
              vendor_id: vendorId,
              vendor_name: sc.vendor,
              sale_price: parseFloat(sc.sale_price) || 0,
              paid_vendor: sc.paid_vendor === true
            });
          }
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

      // Also derive allocations from campaigns.vendor_allocations
      if (campaigns) {
        for (const campaign of campaigns) {
          const vendorAllocations = (campaign as any).vendor_allocations || [];

          // Backward compatibility: allow object map or array
          const allocationsArray = Array.isArray(vendorAllocations)
            ? vendorAllocations
            : Object.entries(vendorAllocations).map(([vendorId, allocation]) => ({
                vendor_id: vendorId,
                ...(allocation as any),
              }));

          for (const allocation of allocationsArray) {
            if (!allocation || typeof allocation !== 'object') continue;
            const vendorId = (allocation as any).vendor_id;
            if (!vendorId) continue;

            const exists = allocations?.some(
              (a: any) => a.campaign_id === campaign.id && a.vendor_id === vendorId
            );
            if (exists) continue;

            const vendor = vendorMap.get(vendorId);
            const allocatedStreams = (allocation as any).allocation || (allocation as any).allocatedStreams || 0;
            const costPer1k = vendor?.cost_per_1k_streams || 0;
            const costPerStream = costPer1k / 1000;

            allPayoutData.push({
              campaign_id: campaign.id,
              vendor_id: vendorId,
              allocated_streams: allocatedStreams,
              predicted_streams: allocatedStreams,
              actual_streams: allocatedStreams, // Until performance data arrives
              cost_per_stream: costPerStream,
              actual_cost_per_stream: costPerStream,
              performance_score: 0,
              completed_at: null,
            });
          }
        }
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

        const costPerStream = (allocation.actual_cost_per_stream ?? allocation.cost_per_stream ?? ((vendor.cost_per_1k_streams || 0) / 1000)) as number;
        const actualStreams = typeof allocation.actual_streams === 'number' ? allocation.actual_streams : (allocation.allocated_streams || 0);

        if (campaignVendorMap.has(key)) {
          // Aggregate with existing entry
          const existing = campaignVendorMap.get(key)!;
          existing.allocated_streams += allocation.allocated_streams || 0;
          existing.actual_streams += actualStreams || 0;
          // Use the higher cost per stream (or keep existing if same)
          existing.cost_per_stream = Math.max(existing.cost_per_stream, costPerStream);
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
        
        // Check for Spotify campaign payment data
        const spotifyPayment = spotifyCampaignPayments.get(campaign.id);
        const isPaidFromSpotify = spotifyPayment?.paid_vendor === true;

        // Use sale_price from spotify_campaigns if available, otherwise calculate
        const amountOwed = spotifyPayment?.sale_price || 
          ((aggregatedAllocation.actual_streams || 0) * (aggregatedAllocation.cost_per_stream || 0));
        
        // Payment status: check invoice first, then spotify paid_vendor, otherwise unpaid
        const paymentStatus: 'paid' | 'unpaid' = 
          invoice?.status === 'paid' || isPaidFromSpotify ? 'paid' : 'unpaid';

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
          payment_date: invoice?.paid_date,
          allocated_streams: aggregatedAllocation.allocated_streams,
          actual_streams: aggregatedAllocation.actual_streams,
          cost_per_stream: aggregatedAllocation.cost_per_stream,
        };

        if (!vendorPayouts.has(vendor.id)) {
          vendorPayouts.set(vendor.id, {
            vendor_id: vendor.id,
            vendor_name: vendor.name,
            total_owed: 0,
            unpaid_campaigns: 0,
            paid_campaigns: 0,
            campaigns: [],
          });
        }

        const summary = vendorPayouts.get(vendor.id)!;
        summary.campaigns.push(payoutData);
        summary.total_owed += amountOwed;
        if (paymentStatus === 'paid') summary.paid_campaigns += 1;
        else summary.unpaid_campaigns += 1;
      });

      const result = Array.from(vendorPayouts.values());
      console.log('💰 [VendorPayouts] Final result:', result.length, 'vendors with payout data');
      result.forEach(v => console.log(`   - ${v.vendor_name}: ${v.campaigns.length} campaigns, $${v.total_owed}`));
      
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
      amount 
    }: { 
      campaignId: string; 
      vendorId: string; 
      amount: number; 
    }) => {
      // First check if invoice exists
      const { data: existingInvoice } = await supabase
        .from('campaign_invoices')
        .select('id')
        .eq('campaign_id', campaignId)
        .maybeSingle();

      if (existingInvoice) {
        // Update existing invoice
        const { error } = await supabase
          .from('campaign_invoices')
          .update({
            status: 'paid',
            paid_date: new Date().toISOString().split('T')[0],
            amount: amount
          })
          .eq('id', existingInvoice.id);

        if (error) throw error;
        return existingInvoice.id;
      } else {
        // Create new invoice
        const { data, error } = await supabase
          .from('campaign_invoices')
          .insert({
            campaign_id: campaignId,
            amount: amount,
            status: 'paid',
            paid_date: new Date().toISOString().split('T')[0],
            invoice_number: `INV-${campaignId.substring(0, 8)}-${Date.now()}`
          })
          .select('id')
          .single();

        if (error) throw error;
        return data.id;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns-enhanced'] });
      toast({
        title: "Payment Marked as Paid",
        description: "Vendor payout has been successfully processed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Payment Failed",
        description: "Failed to mark payment as paid. Please try again.",
        variant: "destructive",
      });
    }
  });
};

export const useBulkMarkPayoutsPaid = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payouts: Array<{ campaignId: string; vendorId: string; amount: number }>) => {
      const results = [];
      
      for (const payout of payouts) {
        // Check if invoice exists
        const { data: existingInvoice } = await supabase
          .from('campaign_invoices')
          .select('id')
          .eq('campaign_id', payout.campaignId)
          .maybeSingle();

        if (existingInvoice) {
          // Update existing invoice
          const { error } = await supabase
            .from('campaign_invoices')
            .update({
              status: 'paid',
              paid_date: new Date().toISOString().split('T')[0],
              amount: payout.amount
            })
            .eq('id', existingInvoice.id);

          if (error) throw error;
          results.push(existingInvoice.id);
        } else {
          // Create new invoice
          const { data, error } = await supabase
            .from('campaign_invoices')
            .insert({
              campaign_id: payout.campaignId,
              amount: payout.amount,
              status: 'paid',
              paid_date: new Date().toISOString().split('T')[0],
              invoice_number: `INV-${payout.campaignId.substring(0, 8)}-${Date.now()}`
            })
            .select('id')
            .single();

          if (error) throw error;
          results.push(data.id);
        }
      }
      
      return results;
    },
    onSuccess: (_, payouts) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns-enhanced'] });
      toast({
        title: "Bulk Payment Processed",
        description: `${payouts.length} vendor payouts have been marked as paid.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Bulk Payment Failed",
        description: "Failed to process bulk payments. Please try again.",
        variant: "destructive",
      });
    }
  });
};








