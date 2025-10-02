"use client"

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';

interface Salesperson {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  total_submissions: number;
  total_approved: number;
  total_revenue: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateSalespersonData {
  name: string;
  email?: string;
  phone?: string;
}

// Hook to fetch all salespeople
export function useSalespeople() {
  return useQuery({
    queryKey: ['salespeople'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salespeople')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Salesperson[];
    },
  });
}

// Hook to create a new salesperson
export function useCreateSalesperson() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (salespersonData: CreateSalespersonData) => {
      const { data, error } = await supabase
        .from('salespeople')
        .insert([salespersonData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Salesperson Added",
        description: "New salesperson has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['salespeople'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add salesperson.",
        variant: "destructive",
      });
    },
  });
}

// Hook to update a salesperson
export function useUpdateSalesperson() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CreateSalespersonData>) => {
      const { data, error } = await supabase
        .from('salespeople')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Salesperson Updated",
        description: "Salesperson information has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['salespeople'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update salesperson.",
        variant: "destructive",
      });
    },
  });
}

// Hook to delete a salesperson
export function useDeleteSalesperson() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (salespersonId: string) => {
      const { error } = await supabase
        .from('salespeople')
        .delete()
        .eq('id', salespersonId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Salesperson Deleted",
        description: "Salesperson has been removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['salespeople'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete salesperson.",
        variant: "destructive",
      });
    },
  });
}








