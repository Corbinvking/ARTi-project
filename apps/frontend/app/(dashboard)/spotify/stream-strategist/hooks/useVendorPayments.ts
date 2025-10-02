"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { useToast } from "../hooks/use-toast";
import { useMyVendor } from "../hooks/useVendors";

export interface VendorCampaignPayment {
  campaign_id: string;
  campaign_name: string;
  track_name?: string;
  allocated_streams: number;
  actual_streams: number;
  current_rate_per_1k: number;
  amount_owed: number;
  payment_status: 'paid' | 'unpaid' | 'pending';
  campaign_completion_date?: string;
  payment_date?: string;
  cost_per_stream: number;
}

export const useVendorPaymentData = () => {
  const { data: vendor } = useMyVendor();
  
  return useQuery({
    queryKey: ["vendor-payment-data", vendor?.id],
    queryFn: async () => {
      if (!vendor?.id) throw new Error("No vendor found");

      // Get campaign allocations for this vendor
      const { data: allocations, error: allocationsError } = await supabase
        .from("campaign_allocations_performance")
        .select(`
          campaign_id,
          allocated_streams,
          actual_streams,
          cost_per_stream
        `)
        .eq("vendor_id", vendor.id);

      if (allocationsError) throw allocationsError;

      // Get campaign details separately
      const campaignIds = allocations?.map(a => a.campaign_id) || [];
      let campaigns = [];
      if (campaignIds.length > 0) {
        const { data: campaignData, error: campaignError } = await supabase
          .from("campaigns")
          .select("id, name, track_name, start_date, duration_days")
          .in("id", campaignIds);
        
        if (campaignError) throw campaignError;
        campaigns = campaignData || [];
      }

      // Get campaign invoices for payment status
      let invoices = [];
      if (campaignIds.length > 0) {
        const { data: invoiceData } = await supabase
          .from("campaign_invoices")
          .select("campaign_id, status, paid_date")
          .in("campaign_id", campaignIds);
        invoices = invoiceData || [];
      }

      const invoiceMap = new Map(
        invoices.map(inv => [inv.campaign_id, inv])
      );
      const campaignMap = new Map(
        campaigns.map(c => [c.id, c])
      );

      // Process the data
      const payments: VendorCampaignPayment[] = (allocations || []).map(allocation => {
        const campaign = campaignMap.get(allocation.campaign_id);
        if (!campaign) return null;
        
        const invoice = invoiceMap.get(allocation.campaign_id);
        const costPerStream = allocation.cost_per_stream || (vendor.cost_per_1k_streams / 1000);
        const amountOwed = allocation.allocated_streams * costPerStream;

        // Calculate completion date
        const startDate = new Date(campaign.start_date);
        const completionDate = new Date(startDate);
        completionDate.setDate(completionDate.getDate() + (campaign.duration_days || 90));

        return {
          campaign_id: allocation.campaign_id,
          campaign_name: campaign.name,
          track_name: campaign.track_name,
          allocated_streams: allocation.allocated_streams,
          actual_streams: allocation.actual_streams,
          current_rate_per_1k: costPerStream * 1000,
          amount_owed: amountOwed,
          payment_status: (invoice?.status === 'paid' ? 'paid' : 'unpaid') as 'paid' | 'unpaid',
          campaign_completion_date: completionDate.toISOString().split('T')[0],
          payment_date: invoice?.paid_date,
          cost_per_stream: costPerStream,
        };
      }).filter(Boolean);

      return payments;
    },
    enabled: !!vendor?.id,
  });
};

export const useUpdateVendorCampaignRate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: vendor } = useMyVendor();

  return useMutation({
    mutationFn: async ({ 
      campaignId, 
      newRatePer1k 
    }: { 
      campaignId: string; 
      newRatePer1k: number; 
    }) => {
      if (!vendor?.id) throw new Error("No vendor found");
      
      const costPerStream = newRatePer1k / 1000;

      // Update the cost_per_stream in campaign_allocations_performance
      const { error } = await supabase
        .from("campaign_allocations_performance")
        .update({ 
          cost_per_stream: costPerStream,
          updated_at: new Date().toISOString()
        })
        .eq("campaign_id", campaignId)
        .eq("vendor_id", vendor.id);

      if (error) throw error;

      return { campaignId, newRatePer1k, costPerStream };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["vendor-payment-data"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-performance-data"] });
      toast({
        title: "Rate Updated",
        description: `Campaign rate updated to $${data.newRatePer1k.toFixed(2)} per 1k streams`,
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update campaign rate. Please try again.",
        variant: "destructive",
      });
    },
  });
};








