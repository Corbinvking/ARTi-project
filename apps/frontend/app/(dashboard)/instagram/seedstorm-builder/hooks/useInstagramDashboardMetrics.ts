'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '../integrations/supabase/client';

const OVERDUE_DAYS = 7;
const NO_POSTS_DAYS = 14;
const VELOCITY_DAYS = 30;

export interface OperationalAlert {
  id: string;
  campaign_id: string;
  campaign_name: string;
  type: 'critical' | 'warning';
  title: string;
  description: string;
  count: number;
}

export interface VelocityDay {
  date: string;
  count: number;
}

export interface InstagramDashboardMetrics {
  activeCampaigns: number;
  postsLive30d: number;
  pendingPosts: number;
  vendorPaymentsOutstanding: number;
  avgCostPer1kViews: number | null;
  needsAttention: number;
  avgTimeToPostDays: number | null;
  velocity: VelocityDay[];
  alerts: OperationalAlert[];
  campaigns: { id: string; name: string; status: string; tracker: string | null }[];
  isLoading: boolean;
  refetch: () => void;
}

function parseCurrency(value: string | number | null): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

function isActiveStatus(s: string | null): boolean {
  if (!s) return false;
  const n = s.toLowerCase().trim();
  return n === 'active' || n === 'ongoing';
}

export function useInstagramDashboardMetrics(): InstagramDashboardMetrics {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const overdueThreshold = new Date(now.getTime() - OVERDUE_DAYS * 24 * 60 * 60 * 1000);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['instagram-dashboard-metrics'],
    queryFn: async () => {
      const [campaignsRes, creatorsRes, postsRes] = await Promise.all([
        supabase.from('instagram_campaigns').select('id, campaign, status, tracker, price').order('created_at', { ascending: false }),
        supabase.from('instagram_campaign_creators').select('*'),
        (async () => {
          const { data: posts, error } = await (supabase as any)
            .from('instagram_posts')
            .select('campaign_id, timestamp, video_view_count, likes_count')
            .not('timestamp', 'is', null);
          if (error) return [];
          return Array.isArray(posts) ? posts : [];
        })(),
      ]);

      if (campaignsRes.error) throw campaignsRes.error;
      if (creatorsRes.error) throw creatorsRes.error;

      const campaigns = (campaignsRes.data || []).map((c: any) => ({
        id: String(c.id),
        name: c.campaign || 'Untitled',
        status: c.status || '',
        tracker: c.tracker ? String(c.tracker).trim() : null,
        price: parseCurrency(c.price),
      }));

      const creators = Array.isArray(creatorsRes.data) ? creatorsRes.data : [];
      const posts = Array.isArray(postsRes) ? postsRes : [];

      const activeCampaignIds = new Set(campaigns.filter((c) => isActiveStatus(c.status)).map((c) => c.id));
      const campaignById = new Map(campaigns.map((c) => [c.id, c]));

      let postsLive30d = 0;
      const velocityByDay: Record<string, number> = {};

      if (posts.length > 0) {
        for (const p of posts) {
          const ts = p.timestamp ? new Date(p.timestamp) : null;
          if (!ts || isNaN(ts.getTime())) continue;
          if (ts >= thirtyDaysAgo) {
            postsLive30d += 1;
            const dayKey = ts.toISOString().slice(0, 10);
            velocityByDay[dayKey] = (velocityByDay[dayKey] || 0) + 1;
          }
        }
      } else {
        for (const c of creators) {
          const postedAt = c.posted_at ? new Date(c.posted_at) : null;
          if (c.post_status === 'posted' && postedAt && !isNaN(postedAt.getTime()) && postedAt >= thirtyDaysAgo) {
            postsLive30d += 1;
            const dayKey = postedAt.toISOString().slice(0, 10);
            velocityByDay[dayKey] = (velocityByDay[dayKey] || 0) + 1;
          }
        }
      }

      const pendingPosts = creators.filter(
        (c) => (c.approval_status === 'approved' || c.approval_status === 'Approved') && c.post_status !== 'posted'
      ).length;

      let vendorPaymentsOutstanding = 0;
      let unpaidPostedCount = 0;
      let overduePostsCount = 0;
      const campaignOverduePosts: Record<string, number> = {};
      const campaignUnpaidPosted: Record<string, number> = {};
      const campaignMissingPosts: Record<string, number> = {};
      const campaignApprovalBottlenecks: Record<string, number> = {};
      const campaignMissingTracker = new Set<string>();
      const campaignNoPostsDays: Record<string, boolean> = {};
      const campaignBudgetAllocatedIncomplete: Record<string, boolean> = {};

      for (const c of creators) {
        const cid = String(c.campaign_id);
        const rate = Number(c.rate) || 0;

        if (c.payment_status === 'unpaid' || c.payment_status === 'pending') {
          vendorPaymentsOutstanding += rate * (c.posts_count || 1);
        }
        if (c.post_status === 'posted' && (c.payment_status === 'unpaid' || c.payment_status === 'pending')) {
          unpaidPostedCount += 1;
          campaignUnpaidPosted[cid] = (campaignUnpaidPosted[cid] || 0) + 1;
        }

        const expectedPost = c.expected_post_date ? new Date(c.expected_post_date) : null;
        if (
          c.post_status !== 'posted' &&
          expectedPost &&
          !isNaN(expectedPost.getTime()) &&
          expectedPost < now
        ) {
          overduePostsCount += 1;
          campaignOverduePosts[cid] = (campaignOverduePosts[cid] || 0) + 1;
        }

        if (
          c.approval_status === 'pending' &&
          c.created_at &&
          new Date(c.created_at) < overdueThreshold
        ) {
          campaignApprovalBottlenecks[cid] = (campaignApprovalBottlenecks[cid] || 0) + 1;
        }

        if (
          c.post_status === 'not_posted' &&
          c.expected_post_date &&
          new Date(c.expected_post_date) < now
        ) {
          campaignMissingPosts[cid] = (campaignMissingPosts[cid] || 0) + 1;
        }
      }

      for (const camp of campaigns) {
        if (!isActiveStatus(camp.status)) continue;
        const campCreators = creators.filter((c) => String(c.campaign_id) === camp.id);
        const hasPosts = campCreators.some((c) => c.post_status === 'posted');
        const hasPlacements = campCreators.length > 0;
        if (hasPlacements && !camp.tracker) {
          campaignMissingTracker.add(camp.id);
        }
        if (hasPlacements && !hasPosts) {
          const oldestCreated = campCreators.reduce((acc, c) => {
            const t = c.created_at ? new Date(c.created_at).getTime() : 0;
            return acc ? Math.min(acc, t) : t;
          }, 0);
          if (oldestCreated && now.getTime() - oldestCreated > NO_POSTS_DAYS * 24 * 60 * 60 * 1000) {
            campaignNoPostsDays[camp.id] = true;
          }
        }
        const totalCommitted = campCreators.reduce((s, c) => s + (Number(c.rate) || 0) * (c.posts_count || 1), 0);
        const budget = camp.price ?? 0;
        const allPosted = campCreators.length > 0 && campCreators.every((c) => c.post_status === 'posted');
        if (budget > 0 && totalCommitted >= budget * 0.99 && !allPosted) {
          campaignBudgetAllocatedIncomplete[camp.id] = true;
        }
      }

      const needsAttention = overduePostsCount + unpaidPostedCount + campaignMissingTracker.size;

      let totalSpend = 0;
      let totalViews = 0;
      for (const camp of campaigns) {
        const campCreators = creators.filter((c) => String(c.campaign_id) === camp.id);
        totalSpend += campCreators
          .filter((c) => c.payment_status === 'paid')
          .reduce((s, c) => s + (Number(c.rate) || 0) * (c.posts_count || 1), 0);
      }
      if (posts.length > 0) {
        for (const p of posts) {
          const v = (p as any).video_view_count ?? ((p as any).likes_count ? (p as any).likes_count * 10 : 0);
          totalViews += Number(v) || 0;
        }
      }
      const avgCostPer1kViews = totalViews > 0 ? (totalSpend / totalViews) * 1000 : null;

      const postedWithDate = creators.filter(
        (c) => c.post_status === 'posted' && c.posted_at && c.updated_at
      );
      let avgTimeToPostDays: number | null = null;
      if (postedWithDate.length > 0) {
        const thirtyDaysAgoTime = thirtyDaysAgo.getTime();
        const diffs = postedWithDate
          .filter((c) => new Date(c.posted_at).getTime() >= thirtyDaysAgoTime)
          .map((c) => {
            const posted = new Date(c.posted_at).getTime();
            const updated = new Date(c.updated_at).getTime();
            return (posted - updated) / (24 * 60 * 60 * 1000);
          })
          .filter((d) => d >= 0 && d < 365);
        if (diffs.length > 0) {
          avgTimeToPostDays = diffs.reduce((a, b) => a + b, 0) / diffs.length;
        }
      }

      const velocity: VelocityDay[] = [];
      const startVel = new Date(thirtyDaysAgo);
      for (let d = new Date(startVel); d <= now; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        velocity.push({ date: key, count: velocityByDay[key] || 0 });
      }

      const alerts: OperationalAlert[] = [];
      const seen = new Set<string>();

      function addAlert(
        campaignId: string,
        type: 'critical' | 'warning',
        title: string,
        description: string,
        count: number,
        key: string
      ) {
        const camp = campaignById.get(campaignId);
        const name = camp?.name || 'Unknown';
        const id = `${key}-${campaignId}`;
        if (seen.has(id)) return;
        seen.add(id);
        alerts.push({
          id,
          campaign_id: campaignId,
          campaign_name: name,
          type,
          title,
          description,
          count,
        });
      }

      for (const cid of Object.keys(campaignOverduePosts)) {
        if (campaignOverduePosts[cid] > 0) {
          addAlert(
            cid,
            'critical',
            'Confirmed placements with no post (overdue)',
            'Expected post date passed',
            campaignOverduePosts[cid],
            'overdue'
          );
        }
      }
      for (const cid of campaignMissingTracker) {
        addAlert(
          cid,
          'warning',
          'Post added without tracking link',
          'Campaign has placements but no tracker URL',
          1,
          'tracker'
        );
      }
      for (const cid of Object.keys(campaignBudgetAllocatedIncomplete)) {
        if (campaignBudgetAllocatedIncomplete[cid]) {
          addAlert(
            cid,
            'warning',
            'Budget fully allocated but posts incomplete',
            'Spend at budget but not all posts live',
            1,
            'budget'
          );
        }
      }
      for (const cid of Object.keys(campaignUnpaidPosted)) {
        if (campaignUnpaidPosted[cid] > 0) {
          addAlert(
            cid,
            'critical',
            'Vendor marked posted but unpaid',
            'Creators posted and awaiting payment',
            campaignUnpaidPosted[cid],
            'unpaid'
          );
        }
      }
      for (const cid of Object.keys(campaignNoPostsDays)) {
        if (campaignNoPostsDays[cid]) {
          addAlert(
            cid,
            'warning',
            'No posts in campaign for 14+ days (active)',
            'Campaign active but no posts yet',
            1,
            'noposts'
          );
        }
      }
      for (const cid of Object.keys(campaignApprovalBottlenecks)) {
        if (campaignApprovalBottlenecks[cid] > 0) {
          addAlert(
            cid,
            'warning',
            'Approval bottlenecks',
            'Pending approvals over 7 days',
            campaignApprovalBottlenecks[cid],
            'approval'
          );
        }
      }
      for (const cid of Object.keys(campaignMissingPosts)) {
        if (campaignMissingPosts[cid] > 0) {
          addAlert(
            cid,
            'warning',
            'Missing posts (past expected date)',
            'Expected posts past scheduled date',
            campaignMissingPosts[cid],
            'missing'
          );
        }
      }

      return {
        campaigns,
        activeCampaigns: activeCampaignIds.size,
        postsLive30d,
        pendingPosts,
        vendorPaymentsOutstanding,
        avgCostPer1kViews,
        needsAttention,
        avgTimeToPostDays,
        velocity,
        alerts,
      };
    },
  });

  const defaultMetrics = useMemo(
    (): InstagramDashboardMetrics => ({
      activeCampaigns: 0,
      postsLive30d: 0,
      pendingPosts: 0,
      vendorPaymentsOutstanding: 0,
      avgCostPer1kViews: null,
      needsAttention: 0,
      avgTimeToPostDays: null,
      velocity: [],
      alerts: [],
      campaigns: [],
      isLoading: true,
      refetch: () => {},
    }),
    []
  );

  if (!data) {
    return { ...defaultMetrics, isLoading, refetch };
  }
  return {
    ...data,
    isLoading,
    refetch,
  };
}
