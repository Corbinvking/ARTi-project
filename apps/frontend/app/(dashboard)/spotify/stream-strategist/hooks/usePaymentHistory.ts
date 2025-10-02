"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { useToast } from "../hooks/use-toast";

interface PaymentHistory {
  id: string;
  vendor_id: string;
  campaign_id: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  processed_by?: string;
  processed_at: string;
  notes?: string;
  created_at: string;
  vendor?: {
    name: string;
  } | null;
  campaign?: {
    name: string;
    track_name: string;
  } | null;
}

export const usePaymentHistory = () => {
  return useQuery({
    queryKey: ["payment-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_history")
        .select(`
          *,
          vendor:vendors(name),
          campaign:campaigns(name, track_name)
        `)
        .order("processed_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

export const useVendorPaymentHistory = (vendorId?: string) => {
  return useQuery({
    queryKey: ["vendor-payment-history", vendorId],
    queryFn: async () => {
      if (!vendorId) return [];
      
      const { data, error } = await supabase
        .from("payment_history")
        .select(`
          *,
          campaign:campaigns(name, track_name)
        `)
        .eq("vendor_id", vendorId)
        .order("processed_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!vendorId,
  });
};

export const useCreatePaymentRecord = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (paymentData: {
      vendor_id: string;
      campaign_id: string;
      amount: number;
      payment_method?: string;
      reference_number?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("payment_history")
        .insert([paymentData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-history"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-payment-history"] });
      toast({
        title: "Payment recorded",
        description: "Payment has been successfully recorded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to record payment.",
        variant: "destructive",
      });
    },
  });
};








