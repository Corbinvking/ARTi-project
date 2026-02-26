import { CampaignForm, CampaignTotals } from './types';
import { CreatorRow } from '../hooks/useCreatorsTable';

export interface CreatorWithPredictions extends CreatorRow {
  predicted_views_per_post: number;
  predicted_views_total: number;
  cp1k_predicted: number | null;
  ranking_score: number;
  genre_match_score: number;
  matched_genres: string[];
  posts_assigned: number;
  cost: number;
  selected: boolean;
  has_estimated_data: boolean;
}

export interface FilterBreakdown {
  totalCreators: number;
  passedNiche: number;
  passedContentType: number;
  passedTerritory: number;
  passedGuardrails: number;
  passedDataQuality: number;
  passedCp1k: number;
  finalEligible: number;
}

export interface CampaignV2Result {
  selectedCreators: CreatorWithPredictions[];
  eligibleCreators: CreatorWithPredictions[];
  totals: CampaignTotals;
  allocationInsight: string;
  filterBreakdown: FilterBreakdown;
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

function genreMatchScore(
  creatorGenres: string[],
  campaignGenres: string[]
): { score: number; matched: string[] } {
  if (campaignGenres.length === 0) return { score: 0.8, matched: [] };
  if (creatorGenres.length === 0) return { score: 0, matched: [] };

  const matched: string[] = [];
  for (const cg of campaignGenres) {
    const cgLower = cg.toLowerCase();
    for (const mg of creatorGenres) {
      const mgLower = mg.toLowerCase();
      if (mgLower === cgLower || mgLower.includes(cgLower) || cgLower.includes(mgLower)) {
        if (!matched.includes(cg)) matched.push(cg);
      }
    }
  }

  if (matched.length === 0) return { score: 0.2, matched: [] };

  const overlapRatio = matched.length / campaignGenres.length;
  const score = 0.6 + 0.4 * overlapRatio;
  return { score: Math.min(1.0, score), matched };
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

  const breakdown: FilterBreakdown = {
    totalCreators: allCreators.length,
    passedNiche: 0,
    passedContentType: 0,
    passedTerritory: 0,
    passedGuardrails: 0,
    passedDataQuality: 0,
    passedCp1k: 0,
    finalEligible: 0,
  };

  // Build ALL creators with genre match scoring
  const withPredictions: CreatorWithPredictions[] = allCreators.map(c => {
    const gMatch = genreMatchScore(c.music_genres, selectedGenres);
    const mv = (c.median_views != null && c.median_views > 0) ? c.median_views : 0;
    const rate = c.reel_rate > 0 ? c.reel_rate : 0;
    const cp1k = (mv > 0 && rate > 0) ? (rate / (mv / 1000)) : null;

    return {
      ...c,
      predicted_views_per_post: mv,
      predicted_views_total: mv,
      cp1k_predicted: cp1k,
      ranking_score: 0,
      genre_match_score: gMatch.score,
      matched_genres: gMatch.matched,
      posts_assigned: 0,
      cost: 0,
      selected: false,
      has_estimated_data: false,
    };
  });

  const nicheMatched = withPredictions.filter(c => c.matched_genres.length > 0);
  breakdown.passedNiche = nicheMatched.length;
  breakdown.passedContentType = nicheMatched.length;
  breakdown.passedTerritory = nicheMatched.length;
  breakdown.passedGuardrails = nicheMatched.length;
  breakdown.passedDataQuality = nicheMatched.length;
  breakdown.passedCp1k = nicheMatched.length;
  breakdown.finalEligible = nicheMatched.length;

  // Rank by genre match + followers
  for (const c of withPredictions) {
    const followerScore = c.followers > 0 ? Math.min(1.0, Math.log10(c.followers) / 7) : 0;
    c.ranking_score = Math.round(100 * (
      0.70 * c.genre_match_score +
      0.30 * followerScore
    ) * 10) / 10;
  }

  // Sort: niche-matched first (by score), then non-matched (by score)
  withPredictions.sort((a, b) => {
    const aMatched = a.matched_genres.length > 0 ? 1 : 0;
    const bMatched = b.matched_genres.length > 0 ? 1 : 0;
    if (aMatched !== bMatched) return bMatched - aMatched;
    return b.ranking_score - a.ranking_score;
  });

  // Auto-select only niche-matched creators
  let remaining = budget;
  for (const c of withPredictions) {
    if (c.matched_genres.length === 0) continue;
    if (c.reel_rate > 0 && remaining >= c.reel_rate) {
      c.posts_assigned = 1;
      c.cost = c.reel_rate;
      c.predicted_views_total = c.predicted_views_per_post;
      c.selected = true;
      remaining -= c.reel_rate;
    } else {
      c.selected = true;
      c.posts_assigned = 1;
      c.cost = 0;
    }
  }

  const finalSelected = withPredictions.filter(c => c.selected);
  const totalCost = finalSelected.reduce((s, c) => s + c.cost, 0);
  const totalPosts = finalSelected.reduce((s, c) => s + c.posts_assigned, 0);
  const totalFollowers = finalSelected.reduce((s, c) => s + c.followers, 0);

  const totals: CampaignTotals = {
    total_creators: finalSelected.length,
    total_posts: totalPosts,
    total_cost: totalCost,
    total_followers: totalFollowers,
    total_median_views: 0,
    projected_total_views: 0,
    avg_cp1k: 0,
    average_cpv: 0,
    budget_remaining: budget - totalCost,
    budget_utilization: budget > 0 ? Math.round((totalCost / budget) * 1000) / 10 : 0,
  };

  const nonMatched = allCreators.length - nicheMatched.length;
  const insight = finalSelected.length > 0
    ? `${finalSelected.length} creators matched the selected niche(s), ${nonMatched} others shown below. Sorted by best genre fit.`
    : `No creators matched the selected niche(s). All ${allCreators.length} creators shown below.`;

  return {
    selectedCreators: finalSelected,
    eligibleCreators: withPredictions,
    totals,
    allocationInsight: insight,
    filterBreakdown: breakdown,
  };
}

export function reoptimizeAllocation(
  eligibleCreators: CreatorWithPredictions[],
  budget: number
): CampaignV2Result {
  const creators = eligibleCreators.map(c => ({
    ...c,
    posts_assigned: 1,
    cost: 0,
    predicted_views_total: c.predicted_views_per_post,
    selected: true,
  }));

  creators.sort((a, b) => b.ranking_score - a.ranking_score);

  let remaining = budget;
  for (const c of creators) {
    if (c.reel_rate > 0 && remaining >= c.reel_rate) {
      c.cost = c.reel_rate;
      remaining -= c.reel_rate;
    }
  }

  const totals = recalcTotals(creators, budget);

  return {
    selectedCreators: creators.filter(c => c.selected),
    eligibleCreators: creators,
    totals,
    allocationInsight: `Re-optimized: ${creators.length} creators sorted by genre fit.`,
    filterBreakdown: {
      totalCreators: creators.length,
      passedNiche: creators.length,
      passedContentType: creators.length,
      passedTerritory: creators.length,
      passedGuardrails: creators.length,
      passedDataQuality: creators.length,
      passedCp1k: creators.length,
      finalEligible: creators.length,
    },
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
