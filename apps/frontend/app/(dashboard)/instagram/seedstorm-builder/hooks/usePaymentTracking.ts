import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';

export interface PaymentTrackingCreator {
  id: string;
  campaign_id: string;
  campaign_name: string;
  creator_id: string;
  instagram_handle: string;
  rate: number;
  posts_count: number;
  payment_status: string;
  due_date: string;
  payment_notes?: string;
  created_at: string;
}

export interface PaymentFilters {
  status: 'all' | 'unpaid' | 'pending' | 'paid';
  dateRange?: { from: Date; to: Date };
  amountRange?: { min: number; max: number };
}

export const usePaymentTracking = () => {
  const [creators, setCreators] = useState<PaymentTrackingCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<PaymentFilters>({ status: 'all' });
  const { toast } = useToast();

  const fetchAllCreators = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('campaign_creators')
        .select(`
          id,
          campaign_id,
          creator_id,
          instagram_handle,
          rate,
          posts_count,
          payment_status,
          due_date,
          payment_notes,
          created_at,
          campaigns!inner(name)
        `);

      // Apply status filter - exclude paid creators by default unless specifically requested
      if (filters.status === 'paid') {
        query = query.eq('payment_status', 'paid');
      } else if (filters.status === 'unpaid') {
        query = query.eq('payment_status', 'unpaid');
      } else if (filters.status === 'pending') {
        query = query.eq('payment_status', 'pending');
      } else {
        // Default: show unpaid and pending (exclude paid)
        query = query.in('payment_status', ['unpaid', 'pending']);
      }

      // Apply date range filter
      if (filters.dateRange) {
        query = query
          .gte('due_date', filters.dateRange.from.toISOString().split('T')[0])
          .lte('due_date', filters.dateRange.to.toISOString().split('T')[0]);
      }

      // Apply amount range filter
      if (filters.amountRange) {
        query = query
          .gte('rate', filters.amountRange.min)
          .lte('rate', filters.amountRange.max);
      }

      const { data, error } = await query.order('due_date', { ascending: true });

      if (error) throw error;

      const formattedCreators = data?.map(creator => ({
        ...creator,
        campaign_name: creator.campaigns.name
      })) || [];

      setCreators(formattedCreators);
    } catch (error) {
      console.error('Error fetching payment tracking data:', error);
      toast({
        title: "Error",
        description: "Failed to load payment tracking data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatus = async (creatorId: string, status: string, notes?: string) => {
    try {
      const updates: any = { payment_status: status };
      if (notes !== undefined) updates.payment_notes = notes;

      const { error } = await supabase
        .from('campaign_creators')
        .update(updates)
        .eq('id', creatorId);

      if (error) throw error;

      // Update local state and remove paid creators if current filter excludes them
      setCreators(prev => {
        const updatedCreators = prev.map(creator => 
          creator.id === creatorId 
            ? { ...creator, ...updates }
            : creator
        );

        // If the creator was marked as paid and current filter excludes paid creators
        if (status === 'paid' && (filters.status === 'all' || filters.status === 'unpaid' || filters.status === 'pending')) {
          return updatedCreators.filter(creator => creator.id !== creatorId);
        }

        return updatedCreators;
      });

      toast({
        title: "Success",
        description: "Payment status updated successfully",
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      });
    }
  };

  const bulkUpdatePaymentStatus = async (creatorIds: string[], status: string) => {
    try {
      const { error } = await supabase
        .from('campaign_creators')
        .update({ payment_status: status })
        .in('id', creatorIds);

      if (error) throw error;

      // Update local state and remove paid creators if current filter excludes them
      setCreators(prev => {
        const updatedCreators = prev.map(creator => 
          creatorIds.includes(creator.id)
            ? { ...creator, payment_status: status }
            : creator
        );

        // If creators were marked as paid and current filter excludes paid creators
        if (status === 'paid' && (filters.status === 'all' || filters.status === 'unpaid' || filters.status === 'pending')) {
          return updatedCreators.filter(creator => !creatorIds.includes(creator.id));
        }

        return updatedCreators;
      });

      toast({
        title: "Success",
        description: `Updated ${creatorIds.length} creators to ${status}`,
      });
    } catch (error) {
      console.error('Error bulk updating payment status:', error);
      toast({
        title: "Error",
        description: "Failed to bulk update payment status",
        variant: "destructive",
      });
    }
  };

  const exportPaymentReport = () => {
    const csvHeaders = [
      'Campaign',
      'Creator',
      'Amount',
      'Status',
      'Due Date',
      'Posts Count',
      'Notes'
    ].join(',');

    const csvData = creators.map(creator => [
      creator.campaign_name,
      creator.instagram_handle,
      `$${creator.rate}`,
      creator.payment_status,
      creator.due_date,
      creator.posts_count,
      creator.payment_notes || ''
    ].join(',')).join('\n');

    const csv = `${csvHeaders}\n${csvData}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payment-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Payment report downloaded successfully",
    });
  };

  useEffect(() => {
    fetchAllCreators();
  }, [filters]);

  const totals = {
    totalAmount: creators.reduce((sum, creator) => sum + creator.rate, 0),
    unpaidAmount: creators
      .filter(creator => creator.payment_status === 'unpaid')
      .reduce((sum, creator) => sum + creator.rate, 0),
    pendingAmount: creators
      .filter(creator => creator.payment_status === 'pending')
      .reduce((sum, creator) => sum + creator.rate, 0),
    overdue: creators.filter(creator => 
      creator.payment_status !== 'paid' && 
      new Date(creator.due_date) < new Date()
    ).length
  };

  return {
    creators,
    loading,
    filters,
    setFilters,
    updatePaymentStatus,
    bulkUpdatePaymentStatus,
    exportPaymentReport,
    totals,
    refetch: fetchAllCreators
  };
};