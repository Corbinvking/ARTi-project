"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { useMyMember } from "./useMyMember";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CampaignMetrics {
  plays: number;
  likes: number;
  reposts: number;
  comments: number;
  snapshots: {
    day_index: number;
    snapshot_date: string;
    plays: number;
    likes: number;
    reposts: number;
    comments: number;
  }[];
}

export interface MemberCampaign {
  id: string;
  artist_name: string;
  track_name: string;
  track_url: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  goal_reposts: number | null;
  // How the member is connected
  role: "submitter" | "supporter";
  // Link reference
  submission_id?: string;
  queue_assignment_id?: string;
  queue_assignment_status?: string;
  // Metrics (populated from attribution snapshots)
  metrics: CampaignMetrics | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetches all campaigns the currently logged-in member is connected to:
 *   - As a Submitter (via soundcloud_submissions.member_id)
 *   - As a Supporter (via soundcloud_queue_assignments.supporter_id)
 *
 * Also fetches attribution_snapshots for each campaign/submission to provide
 * day-over-day metric progression.
 */
export function useMemberCampaigns() {
  const { data: member } = useMyMember();

  return useQuery({
    queryKey: ["my-campaigns", member?.id],
    enabled: !!member?.id,
    queryFn: async (): Promise<MemberCampaign[]> => {
      if (!member?.id) return [];

      const campaigns: MemberCampaign[] = [];
      const seenIds = new Set<string>();

      // -----------------------------------------------------------------
      // 1. Submissions by this member that are tied to a campaign
      // -----------------------------------------------------------------
      const { data: submissions } = await supabase
        .from("soundcloud_submissions")
        .select(
          `
          id, track_url, artist_name, track_name, status,
          support_date, created_at,
          client_id
        `
        )
        .eq("member_id", member.id)
        .order("created_at", { ascending: false });

      if (submissions && submissions.length > 0) {
        // Collect client_ids to look up campaigns
        const clientIds = submissions
          .map((s) => s.client_id)
          .filter(Boolean) as string[];

        // Fetch campaigns linked via client_id
        let campaignMap: Record<string, any> = {};
        if (clientIds.length > 0) {
          const { data: linkedCampaigns } = await supabase
            .from("soundcloud_campaigns")
            .select(
              "id, artist_name, track_name, track_url, status, start_date, end_date, goal_reposts, client_id"
            )
            .in("client_id", clientIds);

          if (linkedCampaigns) {
            for (const c of linkedCampaigns) {
              campaignMap[c.client_id] = c;
            }
          }
        }

        // Fetch attribution snapshots for submissions
        const submissionIds = submissions.map((s) => s.id);
        const { data: submissionSnapshots } = await supabase
          .from("soundcloud_attribution_snapshots")
          .select("parent_id, day_index, snapshot_date, plays, likes, reposts, comments")
          .eq("parent_type", "submission")
          .in("parent_id", submissionIds)
          .order("day_index", { ascending: true });

        const snapshotsBySubmission: Record<string, CampaignMetrics["snapshots"]> = {};
        if (submissionSnapshots) {
          for (const snap of submissionSnapshots) {
            if (!snapshotsBySubmission[snap.parent_id]) {
              snapshotsBySubmission[snap.parent_id] = [];
            }
            snapshotsBySubmission[snap.parent_id].push({
              day_index: snap.day_index,
              snapshot_date: snap.snapshot_date,
              plays: snap.plays || 0,
              likes: snap.likes || 0,
              reposts: snap.reposts || 0,
              comments: snap.comments || 0,
            });
          }
        }

        for (const sub of submissions) {
          const campaign = sub.client_id ? campaignMap[sub.client_id] : null;
          const snapshots = snapshotsBySubmission[sub.id] || [];
          const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

          const entry: MemberCampaign = {
            id: campaign?.id || sub.id,
            artist_name: campaign?.artist_name || sub.artist_name || "Unknown",
            track_name: campaign?.track_name || sub.track_name || "Unknown",
            track_url: campaign?.track_url || sub.track_url || "",
            status: campaign?.status || sub.status || "unknown",
            start_date: campaign?.start_date || sub.support_date || null,
            end_date: campaign?.end_date || null,
            goal_reposts: campaign?.goal_reposts || null,
            role: "submitter",
            submission_id: sub.id,
            metrics: {
              plays: latest?.plays || 0,
              likes: latest?.likes || 0,
              reposts: latest?.reposts || 0,
              comments: latest?.comments || 0,
              snapshots,
            },
          };

          if (!seenIds.has(entry.id)) {
            seenIds.add(entry.id);
            campaigns.push(entry);
          }
        }
      }

      // -----------------------------------------------------------------
      // 2. Queue assignments where this member is a supporter
      // -----------------------------------------------------------------
      const { data: assignments } = await supabase
        .from("soundcloud_queue_assignments")
        .select(
          `
          id, status, credits_allocated, completed_at,
          submission:soundcloud_submissions(
            id, track_url, artist_name, track_name, status,
            support_date, client_id
          )
        `
        )
        .eq("supporter_id", member.id)
        .order("created_at", { ascending: false });

      if (assignments && assignments.length > 0) {
        // Collect client_ids from submissions
        const clientIdsFromAssignments = assignments
          .map((a: any) => a.submission?.client_id)
          .filter(Boolean) as string[];

        let campaignMap2: Record<string, any> = {};
        if (clientIdsFromAssignments.length > 0) {
          const { data: linkedCampaigns2 } = await supabase
            .from("soundcloud_campaigns")
            .select(
              "id, artist_name, track_name, track_url, status, start_date, end_date, goal_reposts, client_id"
            )
            .in("client_id", clientIdsFromAssignments);

          if (linkedCampaigns2) {
            for (const c of linkedCampaigns2) {
              campaignMap2[c.client_id] = c;
            }
          }
        }

        // Fetch attribution snapshots for these submissions
        const subIdsFromAssignments = assignments
          .map((a: any) => a.submission?.id)
          .filter(Boolean) as string[];

        const { data: assignmentSnapshots } = await supabase
          .from("soundcloud_attribution_snapshots")
          .select("parent_id, day_index, snapshot_date, plays, likes, reposts, comments")
          .eq("parent_type", "submission")
          .in("parent_id", subIdsFromAssignments)
          .order("day_index", { ascending: true });

        const snapshotsBySub2: Record<string, CampaignMetrics["snapshots"]> = {};
        if (assignmentSnapshots) {
          for (const snap of assignmentSnapshots) {
            if (!snapshotsBySub2[snap.parent_id]) {
              snapshotsBySub2[snap.parent_id] = [];
            }
            snapshotsBySub2[snap.parent_id].push({
              day_index: snap.day_index,
              snapshot_date: snap.snapshot_date,
              plays: snap.plays || 0,
              likes: snap.likes || 0,
              reposts: snap.reposts || 0,
              comments: snap.comments || 0,
            });
          }
        }

        for (const assignment of assignments) {
          const sub = assignment.submission as any;
          if (!sub) continue;

          const campaign = sub.client_id ? campaignMap2[sub.client_id] : null;
          const uniqueId = campaign?.id || sub.id;

          if (seenIds.has(uniqueId)) continue;
          seenIds.add(uniqueId);

          const snapshots = snapshotsBySub2[sub.id] || [];
          const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

          campaigns.push({
            id: uniqueId,
            artist_name: campaign?.artist_name || sub.artist_name || "Unknown",
            track_name: campaign?.track_name || sub.track_name || "Unknown",
            track_url: campaign?.track_url || sub.track_url || "",
            status: campaign?.status || sub.status || "unknown",
            start_date: campaign?.start_date || sub.support_date || null,
            end_date: campaign?.end_date || null,
            goal_reposts: campaign?.goal_reposts || null,
            role: "supporter",
            queue_assignment_id: assignment.id,
            queue_assignment_status: assignment.status || undefined,
            submission_id: sub.id,
            metrics: {
              plays: latest?.plays || 0,
              likes: latest?.likes || 0,
              reposts: latest?.reposts || 0,
              comments: latest?.comments || 0,
              snapshots,
            },
          });
        }
      }

      return campaigns;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });
}
