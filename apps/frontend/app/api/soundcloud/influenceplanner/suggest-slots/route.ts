import { NextResponse } from "next/server";
import { createAdminClient, getAuthorizedUser } from "../utils";
import { addDays, format, startOfDay, eachDayOfInterval } from "date-fns";

export const dynamic = "force-dynamic";

interface SlotSuggestion {
  date: string;
  quality: "ideal" | "acceptable" | "not_ideal";
  existingCampaigns: number;
  reason: string;
}

/**
 * GET /api/soundcloud/influenceplanner/suggest-slots
 *
 * Analyzes the campaign calendar and returns ranked date suggestions.
 *
 * Query params:
 *  - startDate (optional) - ISO date to start looking from (default: tomorrow)
 *  - days (optional) - Number of days to analyze (default: 14)
 */
export async function GET(request: Request) {
  const auth = await getAuthorizedUser(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const startDateParam = url.searchParams.get("startDate");
  const daysParam = url.searchParams.get("days");

  const startDate = startDateParam
    ? startOfDay(new Date(startDateParam))
    : startOfDay(addDays(new Date(), 1)); // Default to tomorrow
  const days = Math.min(Math.max(parseInt(daysParam || "14", 10), 1), 60); // 1-60 days
  const endDate = addDays(startDate, days - 1);

  try {
    const supabaseAdmin = createAdminClient(auth.token);

    // Fetch existing campaigns and submissions in the date range
    const [campaignsResult, submissionsResult] = await Promise.all([
      supabaseAdmin
        .from("campaigns")
        .select("id, start_date, status")
        .gte("start_date", format(startDate, "yyyy-MM-dd"))
        .lte("start_date", format(endDate, "yyyy-MM-dd")),
      supabaseAdmin
        .from("soundcloud_submissions")
        .select("id, support_date, status, campaign_type")
        .not("support_date", "is", null)
        .gte("support_date", format(startDate, "yyyy-MM-dd"))
        .lte("support_date", format(endDate, "yyyy-MM-dd")),
    ]);

    // Build day-by-day density map
    const densityMap: Record<string, { paid: number; free: number; total: number }> = {};

    // Initialize all days
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    for (const day of allDays) {
      const key = format(day, "yyyy-MM-dd");
      densityMap[key] = { paid: 0, free: 0, total: 0 };
    }

    // Count campaigns per day
    for (const campaign of campaignsResult.data || []) {
      const key = campaign.start_date;
      if (key && densityMap[key]) {
        densityMap[key].paid += 1;
        densityMap[key].total += 1;
      }
    }

    // Count submissions per day
    for (const sub of submissionsResult.data || []) {
      const key = sub.support_date;
      if (key && densityMap[key]) {
        if (sub.campaign_type === "paid") {
          densityMap[key].paid += 1;
        } else {
          densityMap[key].free += 1;
        }
        densityMap[key].total += 1;
      }
    }

    // Determine thresholds for quality ratings
    const totals = Object.values(densityMap).map((d) => d.total);
    const avgDensity = totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;

    // Generate ranked slot suggestions
    const suggestions: SlotSuggestion[] = allDays.map((day) => {
      const key = format(day, "yyyy-MM-dd");
      const density = densityMap[key];
      const dayOfWeek = day.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      let quality: SlotSuggestion["quality"];
      let reason: string;

      if (density.total === 0) {
        quality = "ideal";
        reason = "No existing campaigns scheduled";
      } else if (density.total <= Math.max(1, Math.floor(avgDensity))) {
        quality = "acceptable";
        reason = `${density.total} campaign(s) already scheduled`;
      } else {
        quality = "not_ideal";
        reason = `High density: ${density.total} campaigns already scheduled`;
      }

      // Weekends are less ideal (fewer ops staff)
      if (isWeekend && quality === "ideal") {
        quality = "acceptable";
        reason += " (weekend)";
      }

      return {
        date: key,
        quality,
        existingCampaigns: density.total,
        reason,
      };
    });

    // Sort: ideal first, then acceptable, then not_ideal; within each tier, fewest existing campaigns first
    const qualityOrder = { ideal: 0, acceptable: 1, not_ideal: 2 };
    suggestions.sort((a, b) => {
      const qa = qualityOrder[a.quality];
      const qb = qualityOrder[b.quality];
      if (qa !== qb) return qa - qb;
      return a.existingCampaigns - b.existingCampaigns;
    });

    return NextResponse.json({
      suggestions,
      meta: {
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        totalDays: days,
        averageDensity: Math.round(avgDensity * 100) / 100,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate slot suggestions" },
      { status: 500 }
    );
  }
}
