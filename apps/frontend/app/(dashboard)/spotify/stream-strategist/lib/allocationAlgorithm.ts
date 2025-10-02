// Enhanced ML-Driven Allocation Algorithm
// Integrates machine learning predictions with allocation logic

import type { Playlist, Vendor } from "../types";
import { mlEngine, type MLPrediction } from "./mlEngine";

export interface GenreMatch {
  playlist: Playlist;
  relevanceScore: number; // 0..1
}

export interface LearningInsights {
  confidenceScore: number; // 0..1
  expectedPerformance: {
    optimistic: number;
    realistic: number;
    conservative: number;
  };
  recommendations: string[];
  riskFactors: string[];
}

// Input shape used by AIRecommendations
interface AllocateStreamsInput {
  playlists: Playlist[];
  goal: number;
  vendorCaps: Record<string, number>; // total capacity over campaign window
  subGenre: string;
  durationDays: number;
  vendors?: Vendor[];
  campaignBudget?: number;
  campaignGenres?: string[];
}

// Output allocation item - supports both playlist and vendor-only allocations
interface AllocationItem {
  playlist_id?: string; // Optional for vendor-only allocations
  vendor_id: string;
  allocation: number;
  allocation_type?: 'playlist' | 'vendor'; // Track the allocation type
}

// Vendor allocation for direct vendor assignment
interface VendorAllocation {
  vendor_id: string;
  allocation: number;
}

// Helper: compute a basic relevance score using genres + stream volume
function computeRelevance(playlist: Playlist, subGenre: string, campaignGenres?: string[]): number {
  const hasExact = playlist.genres.includes(subGenre) ? 1 : 0;
  const overlap = (campaignGenres || []).filter(g => playlist.genres.includes(g)).length;
  const overlapScore = Math.min(overlap / Math.max((campaignGenres || []).length || 1, 1), 1);
  // Normalize stream influence (soft cap at 50k)
  const volumeScore = Math.min(playlist.avg_daily_streams / 50000, 1);
  // Weighted blend
  const score = 0.55 * hasExact + 0.25 * overlapScore + 0.20 * volumeScore;
  return Math.max(0, Math.min(score, 1));
}

export async function allocateStreams(input: AllocateStreamsInput): Promise<{
  allocations: AllocationItem[];
  genreMatches: GenreMatch[];
  insights: LearningInsights;
  mlOptimized?: boolean;
  mlPredictions?: Array<{ playlistId: string; prediction: MLPrediction }>;
}> {
  const { playlists, goal, vendorCaps, subGenre, durationDays, campaignGenres, vendors, campaignBudget } = input;

  // Try ML-optimized allocation first
  const mlOptimizationEnabled = playlists.length > 5 && goal > 10000;
  let mlPredictions: Array<{ playlistId: string; prediction: MLPrediction }> = [];
  
  if (mlOptimizationEnabled && vendors) {
    try {
      const campaign = {
        genres: campaignGenres || [subGenre],
        budget: campaignBudget || goal * 0.01, // Estimate budget if not provided
        duration: durationDays,
        goal
      };

      const mlAllocations = mlEngine.optimizeAllocation(playlists, campaign, vendors);
      
      if (mlAllocations.length > 0) {
        // Convert ML allocations to our format
        const allocations: AllocationItem[] = mlAllocations.map(mla => ({
          playlist_id: mla.playlistId,
          vendor_id: mla.vendorId,
          allocation: mla.allocation
        }));

        // Store ML predictions for insights
        mlPredictions = mlAllocations.map(mla => ({
          playlistId: mla.playlistId,
          prediction: mla.prediction
        }));

        // Calculate insights from ML results
        const allocatedTotal = allocations.reduce((sum, a) => sum + a.allocation, 0);
        const coverage = goal > 0 ? allocatedTotal / goal : 0;
        const avgConfidence = mlAllocations.reduce((sum, a) => sum + a.prediction.confidence, 0) / mlAllocations.length;
        
        const insights: LearningInsights = {
          confidenceScore: avgConfidence,
          expectedPerformance: {
            optimistic: Math.round(allocatedTotal * 1.15),
            realistic: Math.round(allocatedTotal),
            conservative: Math.round(allocatedTotal * 0.85),
          },
          recommendations: [
            `ML optimization applied with ${(avgConfidence * 100).toFixed(1)}% confidence`,
            ...(coverage >= 1 ? ["Target goal achievable with current allocation"] : ["Consider increasing vendor capacity or campaign duration"]),
            ...mlAllocations.filter(a => a.prediction.performanceCategory === 'excellent').length > 0 ? 
              [`${mlAllocations.filter(a => a.prediction.performanceCategory === 'excellent').length} playlists predicted to exceed expectations`] : []
          ],
          riskFactors: [
            ...(mlAllocations.filter(a => a.prediction.riskScore > 0.7).length > 0 ? 
              [`${mlAllocations.filter(a => a.prediction.riskScore > 0.7).length} high-risk allocations detected`] : []),
            ...(coverage < 0.8 ? ["Goal coverage below 80% - campaign may underperform"] : [])
          ]
        };

        // Build genre matches for consistency
        const genreMatches: GenreMatch[] = playlists.map(p => ({
          playlist: p,
          relevanceScore: computeRelevance(p, subGenre, campaignGenres),
        }));

        return { allocations, genreMatches, insights, mlOptimized: true, mlPredictions };
      }
    } catch (error) {
      console.warn('ML optimization failed, falling back to heuristic allocation:', error);
    }
  }

  // Fallback to original heuristic allocation
  const genreMatches: GenreMatch[] = playlists.map(p => ({
    playlist: p,
    relevanceScore: computeRelevance(p, subGenre, campaignGenres),
  }));

  // Sort playlists by relevance then by avg_daily_streams desc
  const sorted = [...genreMatches].sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
    return (b.playlist.avg_daily_streams || 0) - (a.playlist.avg_daily_streams || 0);
  });

  // Greedy allocation respecting vendor caps and playlist capacity with fallbacks
  const remainingByVendor: Record<string, number> = { ...vendorCaps };
  let remainingGoal = Math.max(0, goal);
  const allocations: AllocationItem[] = [];

  for (const match of sorted) {
    if (remainingGoal <= 0) break;
    const p = match.playlist;
    const vendorId = p.vendor_id;

    const vendorRemaining = Math.max(0, remainingByVendor[vendorId] ?? Infinity);
    if (vendorRemaining <= 0) continue;

    // Enhanced playlist capacity calculation with fallbacks
    let playlistCapacity = Math.max(0, Math.floor((p.avg_daily_streams || 0) * durationDays));
    
    // Fallback capacity for playlists with 0 avg_daily_streams
    if (playlistCapacity === 0) {
      // Use follower count as basis for fallback capacity
      const followerBased = Math.floor((p.follower_count || 0) * 0.01 * durationDays); // 1% of followers
      const minimumCapacity = Math.floor(100 * durationDays); // Minimum 100 streams/day
      playlistCapacity = Math.max(followerBased, minimumCapacity);
    }
    
    if (playlistCapacity <= 0) continue;

    const allocationAmount = Math.min(remainingGoal, vendorRemaining, playlistCapacity);
    if (allocationAmount <= 0) continue;

    allocations.push({ playlist_id: p.id, vendor_id: vendorId, allocation: allocationAmount });
    remainingGoal -= allocationAmount;
    remainingByVendor[vendorId] = vendorRemaining - allocationAmount;
  }

  // Basic insights for the UI card
  const allocatedTotal = allocations.reduce((sum, a) => sum + a.allocation, 0);
  const coverage = goal > 0 ? allocatedTotal / goal : 0;
  const insights: LearningInsights = {
    confidenceScore: Math.max(0.4, Math.min(0.95, 0.6 + (coverage - 0.5) * 0.5)),
    expectedPerformance: {
      optimistic: Math.round(allocatedTotal * 1.15),
      realistic: Math.round(allocatedTotal * 0.95),
      conservative: Math.round(allocatedTotal * 0.8),
    },
    recommendations: coverage < 1
      ? [
          "Increase vendor caps or extend campaign duration to reach goal.",
          "Add more playlists in closely related sub-genres for better coverage.",
        ]
      : ["Allocations meet or exceed target — proceed to review and confirm."],
    riskFactors: [
      ...(coverage < 0.7 ? ["Low projected coverage vs stream goal."] : []),
      ...(sorted.length === 0 ? ["No playlists match the selected genre filters."] : []),
    ],
  };

  return { allocations, genreMatches, insights, mlOptimized: false };
}

export function calculateProjections(
  selectedAllocations: AllocationItem[],
  playlists: Playlist[],
  vendorAllocations: VendorAllocation[] = []
): { totalStreams: number; byPlaylist: Record<string, number>; byVendor: Record<string, number> } {
  // Calculate playlist-based projections
  const byPlaylist: Record<string, number> = {};
  for (const a of selectedAllocations) {
    if (a.playlist_id) {
      byPlaylist[a.playlist_id] = (byPlaylist[a.playlist_id] || 0) + a.allocation;
    }
  }
  
  // Calculate vendor-based projections
  const byVendor: Record<string, number> = {};
  for (const a of selectedAllocations) {
    byVendor[a.vendor_id] = (byVendor[a.vendor_id] || 0) + a.allocation;
  }
  
  // Add direct vendor allocations
  for (const va of vendorAllocations) {
    byVendor[va.vendor_id] = (byVendor[va.vendor_id] || 0) + va.allocation;
  }
  
  const playlistStreams = Object.values(byPlaylist).reduce((s, n) => s + n, 0);
  const vendorStreams = vendorAllocations.reduce((s, va) => s + va.allocation, 0);
  const totalStreams = playlistStreams + vendorStreams;
  
  return { totalStreams, byPlaylist, byVendor };
}

export function validateAllocations(
  selectedAllocations: AllocationItem[],
  vendorCaps: Record<string, number>,
  playlists: Playlist[],
  durationDays: number,
  vendors: Vendor[] = [],
  vendorAllocations: VendorAllocation[] = []
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Map playlist -> vendor and compute per-playlist cap
  const playlistMap = new Map<string, Playlist>();
  playlists.forEach(p => playlistMap.set(p.id, p));
  
  // Map vendor ID to vendor name
  const vendorMap = new Map<string, string>();
  vendors.forEach(v => vendorMap.set(v.id, v.name));

  // Per-vendor totals
  const byVendor: Record<string, number> = {};
  
  // Process playlist allocations
  for (const a of selectedAllocations) {
    if (a.playlist_id) {
      const playlist = playlistMap.get(a.playlist_id);
      if (!playlist) {
        errors.push(`Unknown playlist in allocation: ${a.playlist_id}`);
        continue;
      }

      if (a.allocation < 0 || !Number.isFinite(a.allocation)) {
        errors.push(`Invalid allocation amount for playlist "${playlist.name}"`);
      }

      // Check per-playlist capacity with same fallback logic
      let cap = Math.max(0, Math.floor((playlist.avg_daily_streams || 0) * durationDays));
      if (cap === 0) {
        const followerBased = Math.floor((playlist.follower_count || 0) * 0.01 * durationDays);
        const minimumCapacity = Math.floor(100 * durationDays);
        cap = Math.max(followerBased, minimumCapacity);
      }
      if (a.allocation > cap) {
        errors.push(`Allocation for playlist "${playlist.name}" exceeds its capacity (${cap.toLocaleString()} streams over campaign duration).`);
      }

      const vendorId = playlist.vendor_id;
      byVendor[vendorId] = (byVendor[vendorId] || 0) + a.allocation;
    } else {
      // Vendor-only allocation
      byVendor[a.vendor_id] = (byVendor[a.vendor_id] || 0) + a.allocation;
    }
  }
  
  // Add direct vendor allocations
  for (const va of vendorAllocations) {
    if (va.allocation < 0 || !Number.isFinite(va.allocation)) {
      const vendorName = vendorMap.get(va.vendor_id) || `Vendor ${va.vendor_id}`;
      errors.push(`Invalid allocation amount for vendor "${vendorName}"`);
    }
    byVendor[va.vendor_id] = (byVendor[va.vendor_id] || 0) + va.allocation;
  }

  // Check vendor caps - treat zero or missing caps as unlimited
  for (const [vendorId, total] of Object.entries(byVendor)) {
    const cap = (vendorCaps[vendorId] && vendorCaps[vendorId] > 0) ? vendorCaps[vendorId] : Infinity;
    if (total > cap && cap !== Infinity) {
      const vendorName = vendorMap.get(vendorId) || `Vendor ${vendorId}`;
      errors.push(`${vendorName} has exceeded its capacity (${total.toLocaleString()} > ${cap.toLocaleString()} streams over campaign duration).`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

// Export the VendorAllocation type for use in components
export type { VendorAllocation };








