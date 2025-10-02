// Core Machine Learning Engine for Performance Prediction and Optimization

import type { Playlist, Vendor } from "../types";

export interface MLFeatures {
  // Playlist features
  avgDailyStreams: number;
  followerCount: number;
  genreRelevanceScore: number;
  genreVectorEmbedding: number[];
  historicalPerformance: number;
  seasonalFactor: number;
  playlistAge: number;
  
  // Vendor features
  vendorReliabilityScore: number;
  vendorCapacityUtilization: number;
  vendorHistoricalAccuracy: number;
  vendorResponseTime: number;
  
  // Campaign features
  campaignBudget: number;
  campaignDuration: number;
  targetStreamGoal: number;
  campaignGenres: string[];
  competitiveness: number;
}

export interface MLPrediction {
  predictedStreams: number;
  confidence: number;
  riskScore: number;
  performanceCategory: 'excellent' | 'good' | 'average' | 'poor';
  contributingFactors: Array<{
    feature: string;
    impact: number;
    explanation: string;
  }>;
}

export interface MLModelMetrics {
  accuracy: number;
  mae: number; // Mean Absolute Error
  rmse: number; // Root Mean Square Error
  r2Score: number;
  predictionCount: number;
  lastTrained: Date;
  modelVersion: string;
}

export class MLEngine {
  private static instance: MLEngine;
  private models: Map<string, any> = new Map();
  private featureMaps: Map<string, string[]> = new Map();
  private modelMetrics: Map<string, MLModelMetrics> = new Map();

  static getInstance(): MLEngine {
    if (!MLEngine.instance) {
      MLEngine.instance = new MLEngine();
    }
    return MLEngine.instance;
  }

  // Extract features from playlist and campaign data
  extractFeatures(
    playlist: Playlist, 
    campaign: {
      genres: string[];
      budget: number;
      duration: number;
      goal: number;
    },
    vendor?: Vendor,
    historicalData?: any[]
  ): MLFeatures {
    // Calculate genre relevance using advanced matching
    const genreRelevanceScore = this.calculateAdvancedGenreRelevance(
      playlist.genres, 
      campaign.genres
    );

    // Create genre vector embedding (simplified version)
    const genreVectorEmbedding = this.createGenreEmbedding(playlist.genres);

    // Calculate historical performance score
    const historicalPerformance = this.calculateHistoricalPerformance(
      playlist.id, 
      historicalData || []
    );

    // Calculate seasonal factor
    const seasonalFactor = this.calculateSeasonalFactor(new Date(), playlist.genres);

    // Calculate playlist age impact
    const playlistAge = playlist.created_at ? 
      (Date.now() - new Date(playlist.created_at).getTime()) / (1000 * 60 * 60 * 24) : 365;

    return {
      avgDailyStreams: playlist.avg_daily_streams || 0,
      followerCount: playlist.follower_count || 0,
      genreRelevanceScore,
      genreVectorEmbedding,
      historicalPerformance,
      seasonalFactor,
      playlistAge: Math.min(playlistAge, 1095), // Cap at 3 years
      
      vendorReliabilityScore: vendor ? this.getVendorReliability(vendor.id) : 0.8,
      vendorCapacityUtilization: vendor ? this.calculateVendorUtilization(vendor.id) : 0.5,
      vendorHistoricalAccuracy: vendor ? this.getVendorAccuracy(vendor.id) : 0.85,
      vendorResponseTime: vendor ? this.getVendorResponseTime(vendor.id) : 24,
      
      campaignBudget: campaign.budget,
      campaignDuration: campaign.duration,
      targetStreamGoal: campaign.goal,
      campaignGenres: campaign.genres,
      competitiveness: this.calculateMarketCompetitiveness(campaign.genres)
    };
  }

  // Advanced ML-based performance prediction
  predictPerformance(features: MLFeatures): MLPrediction {
    // Simplified ML model - in production this would use trained models
    const basePerformance = this.calculateBasePerformance(features);
    const adjustmentFactors = this.calculateAdjustmentFactors(features);
    
    let predictedStreams = basePerformance;
    const contributingFactors: Array<{
      feature: string;
      impact: number;
      explanation: string;
    }> = [];

    // Apply genre relevance boost
    const genreBoost = features.genreRelevanceScore * 0.3;
    predictedStreams *= (1 + genreBoost);
    contributingFactors.push({
      feature: 'Genre Relevance',
      impact: genreBoost,
      explanation: `${(genreBoost * 100).toFixed(1)}% boost from genre matching`
    });

    // Apply vendor reliability factor
    const vendorFactor = (features.vendorReliabilityScore - 0.5) * 0.4;
    predictedStreams *= (1 + vendorFactor);
    contributingFactors.push({
      feature: 'Vendor Reliability',
      impact: vendorFactor,
      explanation: `${(vendorFactor * 100).toFixed(1)}% ${vendorFactor > 0 ? 'boost' : 'reduction'} from vendor performance`
    });

    // Apply historical performance factor
    const historicalFactor = (features.historicalPerformance - 0.5) * 0.25;
    predictedStreams *= (1 + historicalFactor);
    contributingFactors.push({
      feature: 'Historical Performance',
      impact: historicalFactor,
      explanation: `${(historicalFactor * 100).toFixed(1)}% ${historicalFactor > 0 ? 'boost' : 'reduction'} from past performance`
    });

    // Apply seasonal factor
    predictedStreams *= features.seasonalFactor;
    const seasonalImpact = features.seasonalFactor - 1;
    contributingFactors.push({
      feature: 'Seasonal Trends',
      impact: seasonalImpact,
      explanation: `${(seasonalImpact * 100).toFixed(1)}% ${seasonalImpact > 0 ? 'boost' : 'reduction'} from seasonal patterns`
    });

    // Calculate confidence based on data quality and historical accuracy
    const confidence = this.calculatePredictionConfidence(features);
    
    // Calculate risk score
    const riskScore = this.calculateRiskScore(features, predictedStreams);

    // Determine performance category
    const performanceCategory = this.categorizePerformance(predictedStreams, features.targetStreamGoal);

    return {
      predictedStreams: Math.round(predictedStreams),
      confidence,
      riskScore,
      performanceCategory,
      contributingFactors: contributingFactors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    };
  }

  // Optimize allocation using ML predictions
  optimizeAllocation(
    playlists: Playlist[],
    campaign: {
      genres: string[];
      budget: number;
      duration: number;
      goal: number;
    },
    vendors: Vendor[],
    historicalData: any[] = []
  ): Array<{
    playlistId: string;
    vendorId: string;
    allocation: number;
    prediction: MLPrediction;
    score: number;
  }> {
    const vendorMap = new Map(vendors.map(v => [v.id, v]));
    
    // Generate predictions for all playlists
    const playlistPredictions = playlists.map(playlist => {
      const vendor = vendorMap.get(playlist.vendor_id);
      const features = this.extractFeatures(playlist, campaign, vendor, historicalData);
      const prediction = this.predictPerformance(features);
      
      // Calculate optimization score
      const efficiencyScore = prediction.predictedStreams / Math.max(features.avgDailyStreams, 1);
      const confidenceScore = prediction.confidence;
      const riskPenalty = 1 - (prediction.riskScore * 0.3);
      const genreMatchBonus = features.genreRelevanceScore;
      
      const score = (efficiencyScore * 0.4 + confidenceScore * 0.3 + genreMatchBonus * 0.2) * riskPenalty;
      
      return {
        playlistId: playlist.id,
        vendorId: playlist.vendor_id,
        allocation: 0, // To be calculated
        prediction,
        score,
        playlist
      };
    });

    // Sort by optimization score
    playlistPredictions.sort((a, b) => b.score - a.score);

    // Allocate streams using ML-optimized approach
    let remainingGoal = campaign.goal;
    const vendorCapacities = new Map(vendors.map(v => [v.id, v.max_daily_streams * campaign.duration]));
    
    for (const item of playlistPredictions) {
      if (remainingGoal <= 0) break;
      
      const vendorCapacity = vendorCapacities.get(item.vendorId) || 0;
      const playlistCapacity = Math.floor((item.playlist.avg_daily_streams || 0) * campaign.duration);
      
      if (vendorCapacity <= 0 || playlistCapacity <= 0) continue;
      
      const maxAllocation = Math.min(remainingGoal, vendorCapacity, playlistCapacity);
      
      // Use ML prediction to determine optimal allocation size
      const optimalAllocation = Math.min(
        maxAllocation,
        Math.round(item.prediction.predictedStreams * item.prediction.confidence)
      );
      
      if (optimalAllocation > 0) {
        item.allocation = optimalAllocation;
        remainingGoal -= optimalAllocation;
        vendorCapacities.set(item.vendorId, vendorCapacity - optimalAllocation);
      }
    }

    return playlistPredictions.filter(item => item.allocation > 0);
  }

  // Private helper methods
  private calculateAdvancedGenreRelevance(playlistGenres: string[], campaignGenres: string[]): number {
    if (!playlistGenres.length || !campaignGenres.length) return 0;
    
    // Exact matches get highest score
    const exactMatches = playlistGenres.filter(g => campaignGenres.includes(g)).length;
    const exactScore = exactMatches / campaignGenres.length;
    
    // Semantic similarity (simplified - would use embeddings in production)
    const semanticScore = this.calculateSemanticSimilarity(playlistGenres, campaignGenres);
    
    return Math.min(1, exactScore * 0.7 + semanticScore * 0.3);
  }

  private calculateSemanticSimilarity(genres1: string[], genres2: string[]): number {
    // Simplified semantic similarity - would use word embeddings in production
    const relatedGenres: Record<string, string[]> = {
      'pop': ['dance', 'electronic', 'indie'],
      'rock': ['alternative', 'indie', 'punk'],
      'hip-hop': ['rap', 'trap', 'r&b'],
      'electronic': ['dance', 'techno', 'house'],
      'indie': ['alternative', 'rock', 'pop']
    };
    
    let similarityScore = 0;
    for (const genre1 of genres1) {
      for (const genre2 of genres2) {
        if (relatedGenres[genre1]?.includes(genre2) || relatedGenres[genre2]?.includes(genre1)) {
          similarityScore += 0.5;
        }
      }
    }
    
    return Math.min(1, similarityScore / Math.max(genres1.length, genres2.length));
  }

  private createGenreEmbedding(genres: string[]): number[] {
    // Simplified genre embedding - would use trained embeddings in production
    const genreMap: Record<string, number[]> = {
      'pop': [1, 0, 0, 0.5],
      'rock': [0, 1, 0, 0.3],
      'hip-hop': [0, 0, 1, 0.8],
      'electronic': [0.5, 0, 0.5, 1],
      'indie': [0.3, 0.7, 0, 0.2]
    };
    
    const embedding = [0, 0, 0, 0];
    genres.forEach(genre => {
      const vector = genreMap[genre] || [0, 0, 0, 0];
      vector.forEach((val, idx) => embedding[idx] += val);
    });
    
    return embedding.map(val => val / genres.length);
  }

  private calculateHistoricalPerformance(playlistId: string, historicalData: any[]): number {
    const playlistHistory = historicalData.filter(d => d.playlist_id === playlistId);
    if (!playlistHistory.length) return 0.5; // Default neutral score
    
    const avgPerformance = playlistHistory.reduce((sum, d) => sum + (d.performance_score || 0.5), 0) / playlistHistory.length;
    return Math.max(0, Math.min(1, avgPerformance));
  }

  private calculateSeasonalFactor(date: Date, genres: string[]): number {
    const month = date.getMonth();
    const seasonalBoosts: Record<string, Record<number, number>> = {
      'pop': { 11: 1.2, 0: 1.1, 5: 1.15 }, // Holiday and summer boosts
      'electronic': { 5: 1.3, 6: 1.25, 7: 1.2 }, // Summer festival season
      'rock': { 4: 1.1, 5: 1.15, 6: 1.1 }, // Spring/summer touring
    };
    
    let factor = 1.0;
    genres.forEach(genre => {
      const boosts = seasonalBoosts[genre];
      if (boosts && boosts[month]) {
        factor *= boosts[month];
      }
    });
    
    return Math.min(1.5, factor); // Cap seasonal boost
  }

  private calculateBasePerformance(features: MLFeatures): number {
    // Simplified base performance calculation
    return Math.max(100, features.avgDailyStreams * Math.pow(features.genreRelevanceScore + 0.5, 2));
  }

  private calculateAdjustmentFactors(features: MLFeatures): Record<string, number> {
    return {
      vendor: features.vendorReliabilityScore,
      historical: features.historicalPerformance,
      seasonal: features.seasonalFactor,
      competition: 1 - (features.competitiveness * 0.2)
    };
  }

  private calculatePredictionConfidence(features: MLFeatures): number {
    let confidence = 0.7; // Base confidence
    
    // Boost confidence with more historical data
    if (features.historicalPerformance > 0.5) confidence += 0.1;
    
    // Boost confidence with reliable vendor
    if (features.vendorReliabilityScore > 0.8) confidence += 0.1;
    
    // Boost confidence with good genre match
    if (features.genreRelevanceScore > 0.7) confidence += 0.05;
    
    // Reduce confidence with high competition
    confidence -= features.competitiveness * 0.1;
    
    return Math.max(0.4, Math.min(0.95, confidence));
  }

  private calculateRiskScore(features: MLFeatures, predictedStreams: number): number {
    let risk = 0.2; // Base risk
    
    // Increase risk with low vendor reliability
    if (features.vendorReliabilityScore < 0.6) risk += 0.3;
    
    // Increase risk with poor historical performance
    if (features.historicalPerformance < 0.4) risk += 0.2;
    
    // Increase risk with high competition
    risk += features.competitiveness * 0.2;
    
    // Increase risk if prediction is much higher than historical average
    const predictionRatio = predictedStreams / Math.max(features.avgDailyStreams, 1);
    if (predictionRatio > 2) risk += 0.15;
    
    return Math.max(0, Math.min(1, risk));
  }

  private categorizePerformance(predictedStreams: number, targetGoal: number): 'excellent' | 'good' | 'average' | 'poor' {
    const ratio = predictedStreams / Math.max(targetGoal, 1);
    
    if (ratio >= 1.2) return 'excellent';
    if (ratio >= 0.9) return 'good';
    if (ratio >= 0.6) return 'average';
    return 'poor';
  }

  private calculateMarketCompetitiveness(genres: string[]): number {
    // Simplified market competitiveness - would use real market data
    const competitiveness: Record<string, number> = {
      'pop': 0.8,
      'hip-hop': 0.9,
      'electronic': 0.6,
      'rock': 0.5,
      'indie': 0.4
    };
    
    const avgCompetitiveness = genres.reduce((sum, genre) => 
      sum + (competitiveness[genre] || 0.5), 0) / genres.length;
    
    return avgCompetitiveness;
  }

  // Vendor-related helper methods (simplified - would connect to real data)
  private getVendorReliability(vendorId: string): number {
    return 0.85; // Would fetch from database
  }

  private calculateVendorUtilization(vendorId: string): number {
    return 0.6; // Would calculate from current campaigns
  }

  private getVendorAccuracy(vendorId: string): number {
    return 0.82; // Would calculate from historical performance
  }

  private getVendorResponseTime(vendorId: string): number {
    return 18; // Would fetch average response time in hours
  }
}

export const mlEngine = MLEngine.getInstance();







