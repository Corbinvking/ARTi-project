"use client"

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/auth';
import { useToast } from './use-toast';

// ============================================================================
// Types
// ============================================================================

export interface Salesperson {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: string;
  notes?: string;
  auth_user_id?: string;
  total_submissions: number;
  total_approved: number;
  total_revenue: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSalespersonData {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  status?: string;
  notes?: string;
}

export interface UpdateSalespersonData {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
  notes?: string;
  is_active?: boolean;
}

export interface BulkImportRow {
  name: string;
  email: string;
  status?: string;
  notes?: string;
}

export interface BulkImportResult {
  total: number;
  created: number;
  skipped: number;
  errors: { name: string; email: string; error: string }[];
  credentials: { name: string; email: string; tempPassword: string }[];
}

// ============================================================================
// Password Generator
// ============================================================================

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch all salespeople - shared across all platforms
 */
export function useSalespeople(options?: { activeOnly?: boolean }) {
  return useQuery({
    queryKey: ['salespeople', options?.activeOnly],
    queryFn: async () => {
      let query = supabase
        .from('salespeople')
        .select('*')
        .order('name');

      if (options?.activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Salesperson[];
    },
  });
}

/**
 * Fetch active salespeople as options (for dropdowns/selectors)
 */
export function useSalespeopleOptions() {
  return useQuery({
    queryKey: ['salespeople-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salespeople')
        .select('id, name, email')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return (data || []).map(sp => ({
        value: sp.id,
        label: sp.name,
        email: sp.email,
      }));
    },
  });
}

/**
 * Create a new salesperson with login credentials
 */
export function useCreateSalesperson() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSalespersonData) => {
      const password = data.password || generateTempPassword();
      
      // 1. Create user account via admin API
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.artistinfluence.com';
      
      const userResponse = await fetch(`${apiBaseUrl}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: password,
          name: data.name,
          role: 'sales',
        }),
      });
      
      if (!userResponse.ok) {
        const errorData = await userResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create user account');
      }
      
      const userData = await userResponse.json();
      console.log('✅ User account created:', userData.user?.email);
      
      // 2. Create entry in salespeople table
      const { data: spRecord, error } = await supabase
        .from('salespeople')
        .insert([{
          name: data.name,
          email: data.email,
          phone: data.phone,
          auth_user_id: userData.user?.id,
          status: data.status || 'Active',
          notes: data.notes,
          is_active: (data.status || 'Active') === 'Active',
        }])
        .select()
        .single();

      if (error) {
        console.warn('Could not create salespeople entry:', error);
      }
      
      return { 
        salesperson: spRecord, 
        user: userData.user,
        tempPassword: password,
      };
    },
    onSuccess: (result) => {
      toast({
        title: "Salesperson Added",
        description: `${result.user?.email} can now log in. Temporary password: ${result.tempPassword}`,
        duration: 10000,
      });
      queryClient.invalidateQueries({ queryKey: ['salespeople'] });
      queryClient.invalidateQueries({ queryKey: ['salespeople-options'] });
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

/**
 * Update a salesperson
 */
export function useUpdateSalesperson() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateSalespersonData) => {
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
      queryClient.invalidateQueries({ queryKey: ['salespeople-options'] });
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

/**
 * Delete a salesperson
 */
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
      queryClient.invalidateQueries({ queryKey: ['salespeople-options'] });
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

/**
 * Bulk import salespeople from CSV data
 */
export function useBulkImportSalespeople() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rows: BulkImportRow[]): Promise<BulkImportResult> => {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.artistinfluence.com';
      
      const result: BulkImportResult = {
        total: rows.length,
        created: 0,
        skipped: 0,
        errors: [],
        credentials: [],
      };

      // Deduplicate by email
      const seen = new Set<string>();
      const uniqueRows = rows.filter(row => {
        if (!row.email) return false;
        const email = row.email.toLowerCase();
        if (seen.has(email)) return false;
        seen.add(email);
        return true;
      });

      for (const row of uniqueRows) {
        const tempPassword = generateTempPassword();
        
        try {
          // Create auth user
          const userResponse = await fetch(`${apiBaseUrl}/api/admin/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: row.email,
              password: tempPassword,
              name: row.name,
              role: 'sales',
            }),
          });

          if (!userResponse.ok) {
            const errorData = await userResponse.json().catch(() => ({}));
            if (errorData.error?.includes('already been registered') || 
                errorData.error?.includes('already exists')) {
              result.skipped++;
              continue;
            }
            throw new Error(errorData.error || 'Failed to create user');
          }

          const userData = await userResponse.json();

          // Create salespeople record
          await supabase
            .from('salespeople')
            .upsert({
              name: row.name,
              email: row.email.toLowerCase(),
              auth_user_id: userData.user?.id,
              status: row.status || 'Active',
              notes: row.notes,
              is_active: (row.status || 'Active') === 'Active',
            }, { onConflict: 'email' });

          result.created++;
          result.credentials.push({
            name: row.name,
            email: row.email,
            tempPassword,
          });

        } catch (error: any) {
          result.errors.push({
            name: row.name,
            email: row.email,
            error: error.message,
          });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      return result;
    },
    onSuccess: (result) => {
      toast({
        title: "Bulk Import Complete",
        description: `Created ${result.created} salespeople, skipped ${result.skipped}, ${result.errors.length} errors.`,
        duration: 8000,
      });
      queryClient.invalidateQueries({ queryKey: ['salespeople'] });
      queryClient.invalidateQueries({ queryKey: ['salespeople-options'] });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles-and-vendors'] });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import salespeople.",
        variant: "destructive",
      });
    },
  });
}
