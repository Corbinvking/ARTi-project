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
  email: string; // Email is now required for login
  phone?: string;
  password?: string; // Optional - will generate if not provided
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

// Hook to create a new salesperson with login credentials
export function useCreateSalesperson() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (salespersonData: CreateSalespersonData) => {
      // Generate a temporary password if not provided
      const password = salespersonData.password || generateTempPassword();
      
      // 1. Create user account via admin API
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.artistinfluence.com';
      
      const userResponse = await fetch(`${apiBaseUrl}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: salespersonData.email,
          password: password,
          name: salespersonData.name,
          role: 'sales' // Use 'sales' role for salespeople
        })
      });
      
      if (!userResponse.ok) {
        const errorData = await userResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create user account');
      }
      
      const userData = await userResponse.json();
      console.log('✅ User account created:', userData.user?.email);
      
      // 2. Also create entry in salespeople table for tracking
      const { data, error } = await supabase
        .from('salespeople')
        .insert([{
          name: salespersonData.name,
          email: salespersonData.email,
          phone: salespersonData.phone
        }])
        .select()
        .single();

      if (error) {
        console.warn('Could not create salespeople entry:', error);
        // Don't throw - user account was created successfully
      }
      
      return { 
        salesperson: data, 
        user: userData.user,
        tempPassword: password 
      };
    },
    onSuccess: (result) => {
      toast({
        title: "Salesperson Added",
        description: `${result.user?.email} can now log in. Temporary password: ${result.tempPassword}`,
        duration: 10000, // Show longer so they can copy the password
      });
      queryClient.invalidateQueries({ queryKey: ['salespeople'] });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles-and-vendors'] });
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

// Generate a temporary password
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
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








