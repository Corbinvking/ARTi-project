"use client"

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';

export const useIsVendorManager = () => {
  return useQuery({
    queryKey: ['is-vendor-manager'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_vendor_manager');
      if (error) throw error;
      return data as boolean;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};








