"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';

export interface Vendor {
  id: string;
  name: string;
  max_daily_streams: number;
  cost_per_1k_streams: number | null;
  max_concurrent_campaigns: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  vendor_users?: Array<{
    user_id: string;
    vendor_id: string;
  }>;
}

export interface CreateVendorData {
  name: string;
  max_daily_streams: number;
  cost_per_1k_streams?: number;
  max_concurrent_campaigns: number;
  is_active: boolean;
}

// Fetch all vendors (admin/manager only)
export function useVendors() {
  return useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select(`
          *,
          vendor_users(user_id, vendor_id)
        `)
        .order('name');

      if (error) throw error;
      return data as Vendor[];
    },
  });
}

// Fetch vendor for current user (vendor role only)
export function useMyVendor() {
  const { user, loading } = useAuth();
  return useQuery({
    queryKey: ['my-vendor', user?.id ?? 'anon'],
    enabled: !!user && !loading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_users')
        .select(`
          vendor_id,
          vendors (
            id,
            name,
            max_daily_streams,
            cost_per_1k_streams,
            max_concurrent_campaigns,
            is_active,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user!.id);

      if (error) throw error;
      const rows = (data as any[]) || [];
      if (rows.length === 0) return null;

      const club = rows.find((r: any) => r.vendors?.name === 'Club Restricted');
      return (club?.vendors || rows[0].vendors) as Vendor;
    },
  });
}

// Create vendor
export function useCreateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vendorData: CreateVendorData) => {
      const { data, error } = await supabase
        .from('vendors')
        .insert(vendorData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create vendor: ${error.message}`);
    },
  });
}

// Update vendor
export function useUpdateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: { id: string } & Partial<CreateVendorData>) => {
      const { data, error } = await supabase
        .from('vendors')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['my-vendor'] });
      toast.success('Vendor updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update vendor: ${error.message}`);
    },
  });
}

// Delete vendor
export function useDeleteVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vendorId: string) => {
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', vendorId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete vendor: ${error.message}`);
    },
  });
}








