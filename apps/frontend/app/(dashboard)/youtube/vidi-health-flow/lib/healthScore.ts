/**
 * Unified campaign health score calculation.
 *
 * Scoring breakdown (0–100):
 *  - Pacing vs plan:        up to 70 pts  (actual views / expected views by today)
 *  - Ratio Fixer active:    +15 pts       (campaign is active AND in_fixer is true)
 *  - Stalling penalty:      −25 pts       (views_stalled or stalling_detected_at set)
 *
 * Manual overrides replace YouTube API views when > 0.
 * When goal_views is missing the pacing component cannot be calculated and
 * defaults to 0, signalling that the campaign needs a goal configured.
 */

interface HealthScoreCampaign {
  status?: string | null;
  goal_views?: number | null;
  current_views?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  views_stalled?: boolean | null;
  stalling_detected_at?: string | null;
  in_fixer?: boolean | null;
  service_types?: any;
  service_type?: string | null;
  manual_progress?: number | null;
  desired_daily?: number | null;
  ratio_fixer_status?: string | null;
  [key: string]: any;
}

function parseTotalGoalViews(campaign: HealthScoreCampaign): number {
  const raw = campaign.service_types;
  const serviceTypes = raw
    ? (typeof raw === 'string' ? JSON.parse(raw) : raw)
    : [{ goal_views: campaign.goal_views || 0 }];

  return (serviceTypes as any[]).reduce(
    (sum: number, st: any) => sum + (st.goal_views || 0),
    0,
  );
}

export function calculateHealthScore(
  campaign: HealthScoreCampaign,
  manualOverride?: number,
): number {
  const totalGoalViews = parseTotalGoalViews(campaign);

  const effectiveManual = manualOverride ?? (campaign.manual_progress || 0);
  const effectiveViews =
    effectiveManual > 0 ? effectiveManual : (campaign.current_views || 0);

  // Timeline
  const today = new Date();
  const startDate = campaign.start_date ? new Date(campaign.start_date) : null;
  const endDate = campaign.end_date ? new Date(campaign.end_date) : null;

  let totalDays = 30;
  if (
    startDate &&
    endDate &&
    !isNaN(startDate.getTime()) &&
    !isNaN(endDate.getTime()) &&
    endDate >= startDate
  ) {
    totalDays = Math.max(
      1,
      Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1,
    );
  } else if (campaign.desired_daily && campaign.desired_daily > 0 && totalGoalViews > 0) {
    totalDays = Math.ceil(totalGoalViews / campaign.desired_daily);
  }

  let daysElapsed = 1;
  if (startDate && !isNaN(startDate.getTime())) {
    daysElapsed = Math.max(
      1,
      Math.ceil((today.getTime() - startDate.getTime()) / 86_400_000) + 1,
    );
  }
  daysElapsed = Math.min(daysElapsed, totalDays);

  const expectedByNow =
    totalGoalViews > 0 ? (totalGoalViews / totalDays) * daysElapsed : 0;

  // --- Pacing (up to 70 pts) ---
  let paceScore = 0;
  if (expectedByNow > 0) {
    const paceRatio = effectiveViews / expectedByNow;
    paceScore = Math.max(0, Math.min(70, Math.round(70 * Math.min(paceRatio, 1))));
  }

  // --- Fixer bonus (+15 pts) ---
  const fixerScore = campaign.in_fixer && campaign.status === 'active' ? 15 : 0;

  // --- Stalling penalty (−25 pts) ---
  const isStalling = !!campaign.views_stalled || !!campaign.stalling_detected_at;
  const stallingPenalty = isStalling ? -25 : 0;

  const total = paceScore + fixerScore + stallingPenalty;
  return Math.min(100, Math.max(0, Math.round(total)));
}

export function getHealthBadgeColor(score: number): string {
  if (score >= 90) return 'bg-green-500/10 text-green-400 border border-green-500/30';
  if (score >= 75) return 'bg-blue-500/10 text-blue-400 border border-blue-500/30';
  if (score >= 60) return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30';
  return 'bg-red-500/10 text-red-400 border border-red-500/30';
}

export function getHealthTextColor(score: number): string {
  if (score >= 90) return 'text-green-400';
  if (score >= 75) return 'text-blue-400';
  if (score >= 60) return 'text-yellow-400';
  return 'text-red-400';
}
