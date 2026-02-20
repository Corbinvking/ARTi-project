import { CampaignForm, CampaignTotals } from './types';
import { CreatorRow } from '../hooks/useCreatorsTable';

export interface CreatorWithPredictions extends CreatorRow {
  predicted_views_per_post: number;
  predicted_views_total: number;
  cp1k_predicted: number | null;
  ranking_score: number;
  posts_assigned: number;
  cost: number;
  selected: boolean;
}

export interface CampaignV2Result {
  selectedCreators: CreatorWithPredictions[];
  eligibleCreators: CreatorWithPredictions[];
  totals: CampaignTotals;
  allocationInsight: string;
}

const MAX_POSTS_PER_CREATOR = 2;

function clamp(min: number, max: number, v: number): number {
  return Math.min(max, Math.max(min, v));
}

function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function norm(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}

function normInv(value: number, min: number, max: number): number {
  return 1 - norm(value, min, max);
}

function territoryMatchScore(
  audienceTerritory: string,
  confidence: string,
  prefs: string[]
): number {
  if (prefs.length === 0) return 0.8;
  const matched = prefs.some(p => {
    const pNorm = p.replace(' Primary', '').replace(' Focus', '').replace(' Audience', '').trim();
    return audienceTerritory === pNorm || audienceTerritory.toLowerCase().includes(pNorm.toLowerCase());
  });
  if (matched) {
    if (confidence === 'High') return 1.0;
    if (confidence === 'Med') return 0.8;
    return 0.6;
  }
  if (audienceTerritory === 'Global' && (confidence === 'High' || confidence === 'Med')) return 0.5;
  return 0.3;
}

function computePredictedViews(
  mv: number,
  er: number,
  erBaseline: number,
  audienceTerritory: string,
  audienceConfidence: string,
  territoryPrefs: string[],
  contentTypes: string[],
  campaignType: string
): number {
  const mEr = clamp(0.85, 1.15, 1 + 0.5 * (er - erBaseline));

  let mTerr: number;
  if (audienceConfidence === 'High') mTerr = 1.05;
  else if (audienceConfidence === 'Med') mTerr = 1.0;
  else mTerr = 0.95;

  if (territoryPrefs.length > 0) {
    const matched = territoryPrefs.some(p => {
      const pNorm = p.replace(' Primary', '').replace(' Focus', '').replace(' Audience', '').trim();
      return audienceTerritory === pNorm || audienceTerritory.toLowerCase().includes(pNorm.toLowerCase());
    });
    if (matched) mTerr = Math.min(1.10, mTerr + 0.05);
  }

  const typeKey = campaignType === 'Audio Seeding' ? 'Audio Seeding' : 'Footage Seeding';
  const mType = contentTypes.includes(typeKey) ? 1.05 : 1.0;

  return Math.round(mv * mEr * mTerr * mType);
}

export function generateCampaignV2(
  formData: CampaignForm,
  allCreators: CreatorRow[]
): CampaignV2Result {
  const budget = formData.total_budget;
  const selectedGenres = formData.selected_genres;
  const campaignType = formData.campaign_type;
  const contentTypePrefs = formData.content_type_preferences || [];
  const territoryPrefs = formData.territory_preferences || [];
  const minMedianViews = formData.min_median_views || 0;
  const maxCp1k = formData.max_cp1k || 0;
  const minEngagement = formData.min_engagement_rate || 0;

  // --- Phase 0: Eligibility ---
  const eligible = allCreators.filter(c => {
    if (selectedGenres.length > 0) {
      const hasGenre = c.music_genres.some(g =>
        selectedGenres.some(sg => g.toLowerCase().includes(sg.toLowerCase()) || sg.toLowerCase().includes(g.toLowerCase()))
      );
      if (!hasGenre) return false;
    }

    const hasStandardTypes = c.content_types.some(t => t.toLowerCase().includes('audio') || t.toLowerCase().includes('footage'));
    if (hasStandardTypes) {
      if (campaignType === 'Audio Seeding' && !c.content_types.some(t => t.toLowerCase().includes('audio'))) return false;
      if (campaignType === 'Footage Seeding' && !c.content_types.some(t => t.toLowerCase().includes('footage'))) return false;
    }

    if (contentTypePrefs.length > 0) {
      const hasType = c.content_types.some(t => contentTypePrefs.some(cp => t.toLowerCase().includes(cp.toLowerCase())));
      if (!hasType) return false;
    }

    if (territoryPrefs.length > 0) {
      const tMatch = territoryPrefs.some(p => {
        const pNorm = p.replace(' Primary', '').replace(' Focus', '').replace(' Audience', '').trim();
        return c.audience_territory === pNorm || c.audience_territory.toLowerCase().includes(pNorm.toLowerCase());
      });
      const isGlobalOk = c.audience_territory === 'Global' && (c.audience_territory_confidence === 'High' || c.audience_territory_confidence === 'Med');
      if (!tMatch && !isGlobalOk) return false;
    }

    if (minMedianViews > 0 && (c.median_views == null || c.median_views < minMedianViews)) return false;
    if (minEngagement > 0 && c.engagement_rate < minEngagement / 100) return false;

    if (c.followers <= 0 || c.engagement_rate <= 0) return false;
    if (c.median_views == null || c.median_views <= 0) return false;
    if (c.reel_rate <= 0) return false;

    return true;
  });

  // --- Phase 1: Predicted Views ---
  const allEngagementRates = allCreators.filter(c => c.engagement_rate > 0).map(c => c.engagement_rate);
  const erBaseline = medianOf(allEngagementRates);

  const withPredictions: CreatorWithPredictions[] = eligible.map(c => {
    const pv = computePredictedViews(
      c.median_views!,
      c.engagement_rate,
      erBaseline,
      c.audience_territory,
      c.audience_territory_confidence,
      territoryPrefs,
      c.content_types,
      campaignType
    );
    const cp1k = pv > 0 ? (c.reel_rate / (pv / 1000)) : null;
    return {
      ...c,
      predicted_views_per_post: pv,
      predicted_views_total: pv,
      cp1k_predicted: cp1k,
      ranking_score: 0,
      posts_assigned: 0,
      cost: 0,
      selected: false,
    };
  });

  // Apply max_cp1k guardrail
  const afterCp1kFilter = maxCp1k > 0
    ? withPredictions.filter(c => c.cp1k_predicted != null && c.cp1k_predicted <= maxCp1k)
    : withPredictions;

  // --- Phase 2: Ranking ---
  const cp1kValues = afterCp1kFilter.filter(c => c.cp1k_predicted != null).map(c => c.cp1k_predicted!);
  const pvValues = afterCp1kFilter.map(c => c.predicted_views_per_post);
  const erValues = afterCp1kFilter.map(c => c.engagement_rate);

  const cp1kMin = Math.min(...cp1kValues, 0);
  const cp1kMax = Math.max(...cp1kValues, 1);
  const pvMin = Math.min(...pvValues, 0);
  const pvMax = Math.max(...pvValues, 1);
  const erMin = Math.min(...erValues, 0);
  const erMax = Math.max(...erValues, 0.01);

  for (const c of afterCp1kFilter) {
    const sTerrVal = territoryMatchScore(c.audience_territory, c.audience_territory_confidence, territoryPrefs);
    const cp1kNorm = c.cp1k_predicted != null ? normInv(c.cp1k_predicted, cp1kMin, cp1kMax) : 0;
    const pvNorm = norm(c.predicted_views_per_post, pvMin, pvMax);
    const erNorm = norm(c.engagement_rate, erMin, erMax);

    c.ranking_score = Math.round(100 * (
      0.55 * cp1kNorm +
      0.25 * pvNorm +
      0.10 * erNorm +
      0.10 * sTerrVal
    ) * 10) / 10;
  }

  afterCp1kFilter.sort((a, b) => b.ranking_score - a.ranking_score);

  // --- Phase 3: Budget Allocation ---
  let remaining = budget;

  // Phase 3a: Coverage pass (1 post each)
  for (const c of afterCp1kFilter) {
    if (remaining < c.reel_rate) continue;
    c.posts_assigned = 1;
    c.cost = c.reel_rate;
    c.predicted_views_total = c.predicted_views_per_post;
    c.selected = true;
    remaining -= c.reel_rate;
  }

  // Phase 3b: Efficiency pass (extra posts for selected)
  const selected = afterCp1kFilter.filter(c => c.selected);
  let changed = true;
  while (changed) {
    changed = false;
    let bestIdx = -1;
    let bestMarginal = -1;
    for (let i = 0; i < selected.length; i++) {
      const c = selected[i];
      if (c.posts_assigned >= MAX_POSTS_PER_CREATOR) continue;
      if (remaining < c.reel_rate) continue;
      const marginal = c.predicted_views_per_post / c.reel_rate;
      if (marginal > bestMarginal) {
        bestMarginal = marginal;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      const c = selected[bestIdx];
      c.posts_assigned += 1;
      c.cost = c.reel_rate * c.posts_assigned;
      c.predicted_views_total = c.predicted_views_per_post * c.posts_assigned;
      remaining -= c.reel_rate;
      changed = true;
    }
  }

  // Phase 3c: Budget closeout (add more creators if enough left)
  const cheapestRate = Math.min(...afterCp1kFilter.filter(c => !c.selected).map(c => c.reel_rate), Infinity);
  if (remaining >= cheapestRate * 1.5) {
    for (const c of afterCp1kFilter) {
      if (c.selected) continue;
      if (remaining < c.reel_rate) continue;
      c.posts_assigned = 1;
      c.cost = c.reel_rate;
      c.predicted_views_total = c.predicted_views_per_post;
      c.selected = true;
      remaining -= c.reel_rate;
    }
  }

  // --- Totals ---
  const finalSelected = afterCp1kFilter.filter(c => c.selected);
  const totalCost = finalSelected.reduce((s, c) => s + c.cost, 0);
  const totalPosts = finalSelected.reduce((s, c) => s + c.posts_assigned, 0);
  const totalFollowers = finalSelected.reduce((s, c) => s + c.followers, 0);
  const medianViewsArr = finalSelected.map(c => c.median_views || 0).filter(v => v > 0);
  const totalMedianViews = medianViewsArr.length > 0 ? medianOf(medianViewsArr) : 0;
  const projectedTotalViews = finalSelected.reduce((s, c) => s + c.predicted_views_total, 0);
  const avgCp1k = projectedTotalViews > 0 ? (totalCost / projectedTotalViews) * 1000 : 0;

  const totals: CampaignTotals = {
    total_creators: finalSelected.length,
    total_posts: totalPosts,
    total_cost: totalCost,
    total_followers: totalFollowers,
    total_median_views: totalMedianViews,
    projected_total_views: projectedTotalViews,
    avg_cp1k: Math.round(avgCp1k * 100) / 100,
    average_cpv: avgCp1k > 0 ? Math.round((avgCp1k / 1000) * 100) / 100 : 0,
    budget_remaining: budget - totalCost,
    budget_utilization: budget > 0 ? Math.round((totalCost / budget) * 1000) / 10 : 0,
  };

  const insight = finalSelected.length > 0
    ? `Optimized for lowest CP1K while meeting niche + territory filters. ${finalSelected.length} creators selected, ${totalPosts} posts, $${avgCp1k.toFixed(2)} avg CP1K.`
    : 'No eligible creators matched the campaign criteria. Try broadening niche, territory, or guardrail filters.';

  return {
    selectedCreators: finalSelected,
    eligibleCreators: afterCp1kFilter,
    totals,
    allocationInsight: insight,
  };
}

export function reoptimizeAllocation(
  eligibleCreators: CreatorWithPredictions[],
  budget: number
): CampaignV2Result {
  const creators = eligibleCreators.map(c => ({
    ...c,
    posts_assigned: 0,
    cost: 0,
    predicted_views_total: 0,
    selected: false,
  }));

  creators.sort((a, b) => b.ranking_score - a.ranking_score);

  let remaining = budget;

  for (const c of creators) {
    if (remaining < c.reel_rate) continue;
    c.posts_assigned = 1;
    c.cost = c.reel_rate;
    c.predicted_views_total = c.predicted_views_per_post;
    c.selected = true;
    remaining -= c.reel_rate;
  }

  const selected = creators.filter(c => c.selected);
  let changed = true;
  while (changed) {
    changed = false;
    let bestIdx = -1;
    let bestMarginal = -1;
    for (let i = 0; i < selected.length; i++) {
      const c = selected[i];
      if (c.posts_assigned >= MAX_POSTS_PER_CREATOR) continue;
      if (remaining < c.reel_rate) continue;
      const marginal = c.predicted_views_per_post / c.reel_rate;
      if (marginal > bestMarginal) {
        bestMarginal = marginal;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      const c = selected[bestIdx];
      c.posts_assigned += 1;
      c.cost = c.reel_rate * c.posts_assigned;
      c.predicted_views_total = c.predicted_views_per_post * c.posts_assigned;
      remaining -= c.reel_rate;
      changed = true;
    }
  }

  const cheapestRate = Math.min(...creators.filter(c => !c.selected).map(c => c.reel_rate), Infinity);
  if (remaining >= cheapestRate * 1.5) {
    for (const c of creators) {
      if (c.selected) continue;
      if (remaining < c.reel_rate) continue;
      c.posts_assigned = 1;
      c.cost = c.reel_rate;
      c.predicted_views_total = c.predicted_views_per_post;
      c.selected = true;
      remaining -= c.reel_rate;
    }
  }

  const finalSelected = creators.filter(c => c.selected);
  const totals = recalcTotals(creators, budget);

  return {
    selectedCreators: finalSelected,
    eligibleCreators: creators,
    totals,
    allocationInsight: finalSelected.length > 0
      ? `Re-optimized allocation: ${finalSelected.length} creators, ${totals.total_posts} posts, $${(totals.avg_cp1k || 0).toFixed(2)} avg CP1K.`
      : 'No creators could be allocated within budget.',
  };
}

export function recalcTotals(
  creators: CreatorWithPredictions[],
  budget: number
): CampaignTotals {
  const sel = creators.filter(c => c.selected);
  const totalCost = sel.reduce((s, c) => s + c.cost, 0);
  const totalPosts = sel.reduce((s, c) => s + c.posts_assigned, 0);
  const totalFollowers = sel.reduce((s, c) => s + c.followers, 0);
  const medianViewsArr = sel.map(c => c.median_views || 0).filter(v => v > 0);
  const totalMedianViews = medianViewsArr.length > 0 ? medianOf(medianViewsArr) : 0;
  const projectedTotalViews = sel.reduce((s, c) => s + c.predicted_views_total, 0);
  const avgCp1k = projectedTotalViews > 0 ? (totalCost / projectedTotalViews) * 1000 : 0;

  return {
    total_creators: sel.length,
    total_posts: totalPosts,
    total_cost: totalCost,
    total_followers: totalFollowers,
    total_median_views: totalMedianViews,
    projected_total_views: projectedTotalViews,
    avg_cp1k: Math.round(avgCp1k * 100) / 100,
    average_cpv: avgCp1k > 0 ? Math.round((avgCp1k / 1000) * 100) / 100 : 0,
    budget_remaining: budget - totalCost,
    budget_utilization: budget > 0 ? Math.round((totalCost / budget) * 1000) / 10 : 0,
  };
}
