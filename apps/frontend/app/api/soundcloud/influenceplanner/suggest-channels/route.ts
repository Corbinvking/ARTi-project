import { NextResponse } from "next/server";
import { createAdminClient, getAuthorizedUser } from "../utils";
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
  genre_family_id?: string | null;
  genre_family_name?: string | null;
}

async function enrichChannelsWithGenres(
  channels: ChannelSuggestion[],
  _authToken: string
): Promise<ChannelSuggestion[]> {
  try {
    // Use service-role client so genre data is returned for all roles (admin and operator)
    const supabase = createAdminClient();
    const { data: genreRows } = await supabase
      .from("soundcloud_repost_channel_genres")
      .select("ip_user_id, genre_family_id");
    const familyMap = new Map<string, string>();
    const scFamilies = await supabase.from("soundcloud_genre_families").select("id, name");
    (scFamilies.data || []).forEach((f: { id: string; name: string }) => familyMap.set(f.id, f.name));
    const genFamilies = await supabase.from("genre_families").select("id, name");
    if (!genFamilies.error && genFamilies.data) {
      (genFamilies.data || []).forEach((f: { id: string; name: string }) => familyMap.set(f.id, f.name));
    }
    const genreByUser = new Map<string, { id: string; name: string }>();
    (genreRows || []).forEach((r: { ip_user_id: string; genre_family_id: string }) => {
      genreByUser.set(r.ip_user_id, { id: r.genre_family_id, name: familyMap.get(r.genre_family_id) || "" });
    });

    return channels.map((ch) => {
      const g =
        genreByUser.get(ch.user_id) ??
        genreByUser.get("SOUNDCLOUD-USER-" + ch.user_id);
      return {
        ...ch,
        genre_family_id: g?.id ?? null,
        genre_family_name: g?.name ?? null,
      };
    });
  } catch {
    return channels;
  }
}

/**
 * GET /api/soundcloud/influenceplanner/suggest-channels
 *
 * Streams progress events (NDJSON) while fetching members from the
 * Influence Planner API, then sends the final scored channel list.
 *
 * Each line is a JSON object with a `type` field:
 *   { type: "progress", membersLoaded, totalMembers, page, totalPages, phase }
 *   { type: "result", channels, meta }
 *   { type: "error", error }
 *
 * Query params:
 *  - targetReach (optional) - desired total reach; system picks enough channels to hit it
 *  - maxChannels (optional) - maximum number of channels to suggest (default: 25)
 *  - stream (optional) - set to "true" for streaming NDJSON; otherwise returns classic JSON
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
  const useStream = url.searchParams.get("stream") === "true";

  // --- Helper: score and rank members ---
  function scoreAndRank(allMembers: NetworkMember[]) {
    const linkedMembers = allMembers.filter((m) => m.status === "LINKED");

    const scoredMembers: ChannelSuggestion[] = linkedMembers.map((member) => {
      const followerScore = Math.log10(Math.max(member.followers, 1)) * 25;
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
        suggested: false,
        reason: "",
      };
    });

    scoredMembers.sort((a, b) => b.score - a.score);

    let accumulatedReach = 0;
    const reachFactor = 0.06;
    let suggestedCount = 0;

    for (const member of scoredMembers) {
      if (suggestedCount >= maxChannels) break;
      if (targetReach > 0 && accumulatedReach >= targetReach) break;
      member.suggested = true;
      member.reason =
        suggestedCount < 5
          ? "Top-ranked channel by followers and activity"
          : "Recommended to increase campaign reach";
      suggestedCount++;
      accumulatedReach += Math.round(member.followers * reachFactor);
    }

    for (const member of scoredMembers) {
      if (!member.suggested) {
        member.reason =
          targetReach > 0 && accumulatedReach >= targetReach
            ? "Target reach already met by higher-ranked channels"
            : "Lower priority based on follower count and activity";
      }
    }

    return {
      channels: scoredMembers,
      meta: {
        totalLinked: linkedMembers.length,
        totalAll: allMembers.length,
        suggestedCount,
        estimatedReach: accumulatedReach,
        targetReach: targetReach || null,
      },
    };
  }

  // ===== STREAMING MODE =====
  if (useStream) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        };

        try {
          const allMembers: NetworkMember[] = [];
          let offset = 0;
          const limit = 25;
          let hasMore = true;
          let totalMembers: number | null = null;
          let page = 0;

          // Send initial progress
          send({ type: "progress", phase: "connecting", membersLoaded: 0, totalMembers: null, page: 0, totalPages: null });

          while (hasMore) {
            const { data, status } = await influencePlannerFetch<{
              results: NetworkMember[];
              totalElements: number;
              last: boolean;
            }>({
              method: "GET",
              path: "/network/members",
              query: { offset, limit, sortBy: "FOLLOWERS", sortDir: "DESC" },
              authToken: auth.token,
            });

            if (status !== 200 || !data?.results) break;

            allMembers.push(...data.results);
            hasMore = !data.last;
            offset += limit;
            page++;

            if (totalMembers === null && data.totalElements) {
              totalMembers = Math.min(data.totalElements, 500);
            }

            const totalPages = totalMembers ? Math.ceil(totalMembers / limit) : null;

            send({
              type: "progress",
              phase: "fetching",
              membersLoaded: allMembers.length,
              totalMembers,
              page,
              totalPages,
            });

            if (allMembers.length >= 500) break;
          }

          // Scoring phase
          send({ type: "progress", phase: "scoring", membersLoaded: allMembers.length, totalMembers: allMembers.length, page, totalPages: page });

          const result = scoreAndRank(allMembers);
          result.channels = await enrichChannelsWithGenres(result.channels, auth.token);
          send({ type: "result", ...result });
        } catch (error: any) {
          send({ type: "error", error: error.message || "Failed to fetch channel suggestions" });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    });
  }

  // ===== CLASSIC (non-streaming) MODE =====
  try {
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
        query: { offset, limit, sortBy: "FOLLOWERS", sortDir: "DESC" },
        authToken: auth.token,
      });

      if (status !== 200 || !data?.results) break;

      allMembers.push(...data.results);
      hasMore = !data.last;
      offset += limit;
      if (allMembers.length >= 500) break;
    }

    const result = scoreAndRank(allMembers);
    result.channels = await enrichChannelsWithGenres(result.channels, auth.token);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch channel suggestions" },
      { status: 502 }
    );
  }
}
