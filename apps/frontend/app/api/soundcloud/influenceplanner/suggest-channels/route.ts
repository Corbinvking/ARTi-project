import { NextResponse } from "next/server";
import { getAuthorizedUser } from "../utils";
import { influencePlannerFetch } from "../../../../(dashboard)/soundcloud/soundcloud-app/integrations/influenceplannerClient";

export const dynamic = "force-dynamic";

interface NetworkMember {
  membership_id: number;
  status: string;
  user_id: string;
  name: string;
  image_url: string;
  profile_url: string;
  followers: number;
  updated_at: string;
}

interface ChannelSuggestion {
  user_id: string;
  name: string;
  followers: number;
  profile_url: string;
  image_url: string;
  score: number;
  suggested: boolean;
  reason: string;
}

/**
 * GET /api/soundcloud/influenceplanner/suggest-channels
 *
 * Fetches all LINKED members from the Influence Planner API, scores them,
 * and returns a ranked list of suggested channels for a campaign.
 *
 * Query params:
 *  - targetReach (optional) - desired total reach; system picks enough channels to hit it
 *  - maxChannels (optional) - maximum number of channels to suggest (default: 25)
 */
export async function GET(request: Request) {
  const auth = await getAuthorizedUser(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const targetReach = parseInt(url.searchParams.get("targetReach") || "0", 10);
  const maxChannels = Math.min(
    Math.max(parseInt(url.searchParams.get("maxChannels") || "25", 10), 1),
    100
  );

  try {
    // Fetch all members from Influence Planner API (paginate through all)
    const allMembers: NetworkMember[] = [];
    let offset = 0;
    const limit = 25;
    let hasMore = true;

    while (hasMore) {
      const { data, status } = await influencePlannerFetch<{
        results: NetworkMember[];
        totalElements: number;
        last: boolean;
      }>({
        method: "GET",
        path: "/network/members",
        query: {
          offset,
          limit,
          sortBy: "FOLLOWERS",
          sortDir: "DESC",
        },
        authToken: auth.token,
      });

      if (status !== 200 || !data?.results) {
        break;
      }

      allMembers.push(...data.results);
      hasMore = !data.last;
      offset += limit;

      // Safety: don't fetch more than 500 members
      if (allMembers.length >= 500) break;
    }

    // Filter to only LINKED members (valid connections)
    const linkedMembers = allMembers.filter((m) => m.status === "LINKED");

    // Score each member
    // Higher followers = higher score, with diminishing returns
    const scoredMembers: ChannelSuggestion[] = linkedMembers.map((member) => {
      // Score based on follower count (log scale for fairness)
      const followerScore = Math.log10(Math.max(member.followers, 1)) * 25;

      // Recency bonus: recently updated members are more active
      const daysSinceUpdate = member.updated_at
        ? (Date.now() - new Date(member.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        : 365;
      const recencyScore = Math.max(0, 20 - daysSinceUpdate * 0.1);

      const totalScore = Math.round((followerScore + recencyScore) * 10) / 10;

      return {
        user_id: member.user_id,
        name: member.name,
        followers: member.followers,
        profile_url: member.profile_url,
        image_url: member.image_url,
        score: totalScore,
        suggested: false, // Will be set below
        reason: "",
      };
    });

    // Sort by score descending
    scoredMembers.sort((a, b) => b.score - a.score);

    // Mark top channels as suggested
    let accumulatedReach = 0;
    const reachFactor = 0.06; // Default 6% reach factor
    let suggestedCount = 0;

    for (const member of scoredMembers) {
      if (suggestedCount >= maxChannels) break;

      // If we have a target reach, stop suggesting once we'd hit it
      if (targetReach > 0 && accumulatedReach >= targetReach) break;

      member.suggested = true;
      member.reason = suggestedCount < 5
        ? "Top-ranked channel by followers and activity"
        : "Recommended to increase campaign reach";
      suggestedCount++;
      accumulatedReach += Math.round(member.followers * reachFactor);
    }

    // Mark non-suggested members with reason
    for (const member of scoredMembers) {
      if (!member.suggested) {
        member.reason = targetReach > 0 && accumulatedReach >= targetReach
          ? "Target reach already met by higher-ranked channels"
          : "Lower priority based on follower count and activity";
      }
    }

    return NextResponse.json({
      channels: scoredMembers,
      meta: {
        totalLinked: linkedMembers.length,
        totalAll: allMembers.length,
        suggestedCount,
        estimatedReach: accumulatedReach,
        targetReach: targetReach || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch channel suggestions" },
      { status: 502 }
    );
  }
}
