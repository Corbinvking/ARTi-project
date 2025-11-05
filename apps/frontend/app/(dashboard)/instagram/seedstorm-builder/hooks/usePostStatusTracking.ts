import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';

export interface PostStatusTrackingCreator {
  id: string;
  campaign_id: string;
  campaign_name: string;
  creator_id: string;
  instagram_handle: string;
  rate: number;
  posts_count: number;
  post_status: string;
  due_date: string;
  approval_notes?: string;
  created_at: string;
}

export interface PostStatusFilters {
  status: 'all' | 'not_posted' | 'scheduled' | 'posted';
  campaigns?: string[];
}

export const usePostStatusTracking = () => {
  const [creators, setCreators] = useState<PostStatusTrackingCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<PostStatusFilters>({ status: 'not_posted' });
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
          post_status,
          due_date,
          approval_notes,
          created_at,
          campaigns!inner(name)
        `);

      // Apply status filter
      if (filters.status === 'not_posted') {
        query = query.eq('post_status', 'not_posted');
      } else if (filters.status === 'scheduled') {
        query = query.eq('post_status', 'scheduled');
      } else if (filters.status === 'posted') {
        query = query.eq('post_status', 'posted');
      } else if (filters.status === 'all') {
        // Show all statuses
      } else {
        // Default: show not_posted and scheduled (exclude posted unless specifically requested)
        query = query.in('post_status', ['not_posted', 'scheduled']);
      }

      // Apply campaign filter
      if (filters.campaigns && filters.campaigns.length > 0) {
        query = query.in('campaign_id', filters.campaigns);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const formattedCreators = data?.map(creator => ({
        ...creator,
        campaign_name: creator.campaigns.name
      })) || [];

      setCreators(formattedCreators);
    } catch (error) {
      console.error('Error fetching post status tracking data:', error);
      toast({
        title: "Error",
        description: "Failed to load post status tracking data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePostStatus = async (creatorId: string, status: string, notes?: string) => {
    try {
      const updates: any = { post_status: status };
      if (notes !== undefined) updates.approval_notes = notes;
      
      // If marking as posted, set the actual post date to today
      if (status === 'posted') {
        updates.actual_post_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('campaign_creators')
        .update(updates)
        .eq('id', creatorId);

      if (error) throw error;

      // Update local state and remove posted creators if current filter excludes them
      setCreators(prev => {
        const updatedCreators = prev.map(creator => 
          creator.id === creatorId 
            ? { ...creator, ...updates }
            : creator
        );

        // If the creator was marked as posted and current filter excludes posted creators
        if (status === 'posted' && (filters.status === 'not_posted' || filters.status === 'scheduled')) {
          return updatedCreators.filter(creator => creator.id !== creatorId);
        }

        return updatedCreators;
      });

      toast({
        title: "Success",
        description: "Post status updated successfully",
      });
    } catch (error) {
      console.error('Error updating post status:', error);
      toast({
        title: "Error",
        description: "Failed to update post status",
        variant: "destructive",
      });
    }
  };


  const bulkUpdatePostStatus = async (creatorIds: string[], status: string) => {
    try {
      const updates: any = { post_status: status };
      
      // If marking as posted, set the actual post date to today
      if (status === 'posted') {
        updates.actual_post_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('campaign_creators')
        .update(updates)
        .in('id', creatorIds);

      if (error) throw error;

      // Update local state and remove posted creators if current filter excludes them
      setCreators(prev => {
        const updatedCreators = prev.map(creator => 
          creatorIds.includes(creator.id)
            ? { ...creator, ...updates }
            : creator
        );

        // If creators were marked as posted and current filter excludes posted creators
        if (status === 'posted' && (filters.status === 'not_posted' || filters.status === 'scheduled')) {
          return updatedCreators.filter(creator => !creatorIds.includes(creator.id));
        }

        return updatedCreators;
      });

      toast({
        title: "Success",
        description: `Updated ${creatorIds.length} creators to ${status}`,
      });
    } catch (error) {
      console.error('Error bulk updating post status:', error);
      toast({
        title: "Error",
        description: "Failed to bulk update post status",
        variant: "destructive",
      });
    }
  };

  const exportPostReport = () => {
    const csvHeaders = [
      'Campaign',
      'Creator',
      'Status',
      'Posts Count',
      'Rate',
      'Notes'
    ].join(',');

    const csvData = creators.map(creator => [
      creator.campaign_name,
      creator.instagram_handle,
      creator.post_status,
      creator.posts_count,
      `$${creator.rate}`,
      creator.approval_notes || ''
    ].join(',')).join('\n');

    const csv = `${csvHeaders}\n${csvData}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `post-status-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Post status report downloaded successfully",
    });
  };

  useEffect(() => {
    fetchAllCreators();
  }, [filters]);

  // Calculate completion statistics
  const getCompletionStats = async () => {
    try {
      const { data, error } = await supabase
        .from('campaign_creators')
        .select(`
          id,
          campaign_id,
          post_status,
          campaigns!inner(name)
        `);

      if (error) throw error;

      const totalPosts = data?.length || 0;
      const posted = data?.filter(c => c.post_status === 'posted').length || 0;
      const notPosted = data?.filter(c => c.post_status === 'not_posted').length || 0;
      const scheduled = data?.filter(c => c.post_status === 'scheduled').length || 0;

      // Calculate per-campaign completion rates
      const campaignStats = data?.reduce((acc, creator) => {
        const campaignName = creator.campaigns.name;
        if (!acc[campaignName]) {
          acc[campaignName] = { total: 0, posted: 0 };
        }
        acc[campaignName].total += 1;
        if (creator.post_status === 'posted') {
          acc[campaignName].posted += 1;
        }
        return acc;
      }, {} as Record<string, { total: number; posted: number }>);

      return {
        totalPosts,
        posted,
        notPosted,
        scheduled,
        completionRate: totalPosts > 0 ? Math.round((posted / totalPosts) * 100) : 0,
        campaignStats: campaignStats || {}
      };
    } catch (error) {
      console.error('Error calculating completion stats:', error);
      return {
        totalPosts: 0,
        posted: 0,
        notPosted: 0,
        scheduled: 0,
        completionRate: 0,
        campaignStats: {}
      };
    }
  };

  return {
    creators,
    loading,
    filters,
    setFilters,
    updatePostStatus,
    bulkUpdatePostStatus,
    exportPostReport,
    getCompletionStats,
    refetch: fetchAllCreators
  };
};