import { useState, useEffect, useMemo } from 'react';
import { Creator, Campaign } from '../lib/types';

export interface CreatorScore {
  id: string;
  overallScore: number;
  performanceScore: number;
  reliabilityScore: number;
  costEfficiencyScore: number;
  riskScore: number;
  trendScore: number;
  predictedROI: number;
  roiCategory: 'excellent' | 'good' | 'fair' | 'poor';
  confidenceScore: number;
}

export interface CampaignPrediction {
  successProbability: number;
  predictedViews: number;
  predictedEngagement: number;
  predictedROI: number;
  roiCategory: 'excellent' | 'good' | 'fair' | 'poor';
  industryBenchmark: {
    averageROI: number;
    topPerformerROI: number;
    comparison: string;
  };
  riskFactors: string[];
  recommendations: string[];
  budgetOptimization: {
    current: number;
    suggested: number;
    reasoning: string;
  };
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high';
  score: number;
  factors: {
    type: 'creator' | 'budget' | 'timeline' | 'market';
    description: string;
    impact: number;
  }[];
}

export const usePredictiveIntelligence = (creators: Creator[], campaigns: Campaign[]) => {
  const [loading, setLoading] = useState(false);

  // Advanced Creator Scoring Algorithm
  const creatorScores = useMemo(() => {
    return creators.map(creator => {
      // Performance Score (40% weight)
      const avgEngagement = creator.engagement_rate || 0;
      const followerScore = Math.log10(Math.max(creator.followers, 1)) / 8; // Normalize to 0-1
      const performanceScore = Math.min(100, (avgEngagement * 10 + followerScore * 40));

      // Reliability Score (25% weight) - Based on historical campaign participation
      const creatorCampaigns = campaigns.filter(campaign => {
        const selected = Array.isArray(campaign.selected_creators) ? campaign.selected_creators : [];
        return selected.some((sc: any) => ((typeof sc === 'object' && sc !== null) ? sc.id : sc) === creator.id);
      });
      
      const reliabilityScore = Math.min(100, 
        50 + (creatorCampaigns.length * 10) + // Base score + campaign experience
        (creator.engagement_rate > 5 ? 20 : 0) + // High engagement bonus
        (creator.followers > 100000 ? 15 : 0) // Large audience bonus
      );

      // Cost Efficiency Score (20% weight)
      const cpv = creator.median_views_per_video > 0 && creator.reel_rate > 0 
        ? creator.reel_rate / creator.median_views_per_video * 1000 
        : 50;
      const costEfficiencyScore = Math.max(0, Math.min(100, 100 - (cpv * 2)));

      // Risk Score (10% weight) - Lower is better
      const riskFactors = [
        creator.engagement_rate < 2 ? 30 : 0, // Low engagement risk
        creator.followers < 10000 ? 20 : 0, // Small audience risk
        creator.reel_rate > 2000 ? 25 : 0, // High cost risk
        creatorCampaigns.length === 0 ? 15 : 0 // No history risk
      ];
      const riskScore = Math.min(100, riskFactors.reduce((sum, risk) => sum + risk, 0));

      // Trend Score (5% weight) - Simulated growth trend
      const trendScore = Math.random() * 40 + 60; // Placeholder for actual trend analysis

      // Overall Score Calculation
      const overallScore = 
        (performanceScore * 0.4) +
        (reliabilityScore * 0.25) +
        (costEfficiencyScore * 0.2) +
        ((100 - riskScore) * 0.1) +
        (trendScore * 0.05);

      // Enhanced ROI Calculation with Industry Standards
      const baseValuePerView = 0.001; // Industry standard: $1 per 1,000 views
      
      // Content Type Premium Multipliers
      const contentTypeMultiplier = (() => {
        const hasReels = creator.content_types?.includes('Reels') || creator.reel_rate > 0;
        const hasStories = creator.content_types?.includes('Stories') || creator.story_rate > 0;
        const hasCarousels = creator.content_types?.includes('Carousels') || creator.carousel_rate > 0;
        
        if (hasReels) return 1.2; // Reels perform 20% better
        if (hasCarousels) return 1.1; // Carousels 10% better
        if (hasStories) return 0.8; // Stories 20% less valuable
        return 1.0; // Default
      })();
      
      // Engagement Rate Multiplier (higher engagement = higher value)
      const engagementMultiplier = Math.min(2.0, 1 + (creator.engagement_rate / 100));
      
      // Genre-Specific Value Adjustments
      const genreMultiplier = (() => {
        const genres = creator.music_genres || [];
        const highValueGenres = ['Pop', 'Hip Hop', 'Electronic', 'Rock'];
        const mediumValueGenres = ['R&B', 'Country', 'Indie', 'Alternative'];
        
        const hasHighValue = genres.some(genre => highValueGenres.includes(genre));
        const hasMediumValue = genres.some(genre => mediumValueGenres.includes(genre));
        
        if (hasHighValue) return 1.15;
        if (hasMediumValue) return 1.05;
        return 1.0;
      })();
      
      // Calculate enhanced predicted views
      const enhancedViews = creator.median_views_per_video * (1 + creator.engagement_rate / 100);
      
      // Calculate revenue with all multipliers
      const totalMultiplier = contentTypeMultiplier * engagementMultiplier * genreMultiplier;
      const predictedRevenue = enhancedViews * baseValuePerView * totalMultiplier;
      
      const cost = creator.reel_rate || 0;
      const predictedROI = cost > 0 ? (predictedRevenue / cost) : 0;
      
      // ROI Category Classification
      const roiCategory: 'excellent' | 'good' | 'fair' | 'poor' = 
        predictedROI >= 1.5 ? 'excellent' :
        predictedROI >= 1.0 ? 'good' :
        predictedROI >= 0.5 ? 'fair' : 'poor';
      
      // Confidence Score (based on data quality and history)
      const confidenceFactors = [
        creator.engagement_rate > 0 ? 25 : 0, // Has engagement data
        creator.median_views_per_video > 0 ? 25 : 0, // Has view data
        creatorCampaigns.length > 0 ? 30 : 0, // Has campaign history
        creator.followers > 1000 ? 20 : 10 // Account size reliability
      ];
      const confidenceScore = Math.min(100, confidenceFactors.reduce((sum, factor) => sum + factor, 0));

      return {
        id: creator.id,
        overallScore: Math.round(overallScore),
        performanceScore: Math.round(performanceScore),
        reliabilityScore: Math.round(reliabilityScore),
        costEfficiencyScore: Math.round(costEfficiencyScore),
        riskScore: Math.round(riskScore),
        trendScore: Math.round(trendScore),
        predictedROI: Number(predictedROI.toFixed(2)),
        roiCategory,
        confidenceScore: Math.round(confidenceScore)
      };
    });
  }, [creators, campaigns]);

  // Campaign Success Prediction
  const predictCampaignSuccess = (campaign: Campaign): CampaignPrediction => {
    const selectedCreators = Array.isArray(campaign.selected_creators) ? campaign.selected_creators : [];
    const budget = Number((campaign as any).budget) || 0;
    
    // Get creator scores for selected creators
    const campaignCreatorScores = selectedCreators
      .map(sc => {
        const creatorId = typeof sc === 'object' && sc !== null ? sc.id : sc;
        return creatorScores.find(cs => cs.id === creatorId);
      })
      .filter(Boolean) as CreatorScore[];

    if (campaignCreatorScores.length === 0) {
      return {
        successProbability: 20,
        predictedViews: 0,
        predictedEngagement: 0,
        predictedROI: 0,
        roiCategory: 'poor' as const,
        industryBenchmark: {
          averageROI: 0.8,
          topPerformerROI: 2.5,
          comparison: 'No data available for comparison'
        },
        riskFactors: ['No creators selected'],
        recommendations: ['Select creators to get predictions'],
        budgetOptimization: {
          current: budget,
          suggested: budget,
          reasoning: 'No data available'
        }
      };
    }

    // Calculate average scores
    const avgOverallScore = campaignCreatorScores.reduce((sum, cs) => sum + cs.overallScore, 0) / campaignCreatorScores.length;
    const avgRiskScore = campaignCreatorScores.reduce((sum, cs) => sum + cs.riskScore, 0) / campaignCreatorScores.length;
    
    // Success Probability Calculation
    const successProbability = Math.min(95, Math.max(10, 
      (avgOverallScore * 0.7) + 
      ((100 - avgRiskScore) * 0.2) + 
      (budget > 5000 ? 10 : 5) // Budget adequacy bonus
    ));

    // Predicted Performance
    const predictedViews = selectedCreators.reduce((total, sc) => {
      const creatorId = typeof sc === 'object' && sc !== null ? sc.id : sc;
      const creator = creators.find(c => c.id === creatorId);
      return total + (creator ? creator.median_views_per_video || 0 : 0);
    }, 0);

    const predictedEngagement = selectedCreators.reduce((total, sc) => {
      const creatorId = typeof sc === 'object' && sc !== null ? sc.id : sc;
      const creator = creators.find(c => c.id === creatorId);
      return total + (creator ? (creator.median_views_per_video * creator.engagement_rate / 100) : 0);
    }, 0);

    const totalCost = selectedCreators.reduce((total, sc) => {
      const creatorId = typeof sc === 'object' && sc !== null ? sc.id : sc;
      const creator = creators.find(c => c.id === creatorId);
      return total + (creator ? creator.reel_rate || 0 : 0);
    }, 0);

    // Enhanced Campaign ROI Calculation
    const totalRevenue = selectedCreators.reduce((total, sc) => {
      const creatorId = typeof sc === 'object' && sc !== null ? sc.id : sc;
      const creator = creators.find(c => c.id === creatorId);
      
      if (!creator) return total;
      
      const baseValuePerView = 0.001; // Industry standard: $1 per 1,000 views
      
      // Content Type Premium
      const contentTypeMultiplier = (() => {
        const hasReels = creator.content_types?.includes('Reels') || creator.reel_rate > 0;
        const hasCarousels = creator.content_types?.includes('Carousels') || creator.carousel_rate > 0;
        const hasStories = creator.content_types?.includes('Stories') || creator.story_rate > 0;
        
        if (hasReels) return 1.2;
        if (hasCarousels) return 1.1;
        if (hasStories) return 0.8;
        return 1.0;
      })();
      
      // Engagement multiplier
      const engagementMultiplier = Math.min(2.0, 1 + (creator.engagement_rate / 100));
      
      // Genre multiplier
      const genres = creator.music_genres || [];
      const highValueGenres = ['Pop', 'Hip Hop', 'Electronic', 'Rock'];
      const mediumValueGenres = ['R&B', 'Country', 'Indie', 'Alternative'];
      
      const genreMultiplier = (() => {
        const hasHighValue = genres.some(genre => highValueGenres.includes(genre));
        const hasMediumValue = genres.some(genre => mediumValueGenres.includes(genre));
        
        if (hasHighValue) return 1.15;
        if (hasMediumValue) return 1.05;
        return 1.0;
      })();
      
      const enhancedViews = creator.median_views_per_video * (1 + creator.engagement_rate / 100);
      const totalMultiplier = contentTypeMultiplier * engagementMultiplier * genreMultiplier;
      
      return total + (enhancedViews * baseValuePerView * totalMultiplier);
    }, 0);

    const predictedROI = totalCost > 0 ? (totalRevenue / totalCost) : 0;

    // Risk Factors Analysis
    const riskFactors = [];
    if (avgRiskScore > 40) riskFactors.push('High-risk creator selection');
    if (budget < totalCost * 1.1) riskFactors.push('Insufficient budget buffer');
    if (selectedCreators.length < 3) riskFactors.push('Limited creator diversity');
    if (avgOverallScore < 60) riskFactors.push('Below-average creator quality');

    // ROI Category Classification
    const roiCategory: 'excellent' | 'good' | 'fair' | 'poor' = 
      predictedROI >= 1.5 ? 'excellent' :
      predictedROI >= 1.0 ? 'good' :
      predictedROI >= 0.5 ? 'fair' : 'poor';
    
    // Industry Benchmark Comparison
    const industryBenchmark = {
      averageROI: 0.8,
      topPerformerROI: 2.5,
      comparison: predictedROI > 2.5 ? 'Exceptional - significantly above top performers' :
                  predictedROI > 1.5 ? 'Excellent - above industry top performers' :
                  predictedROI > 0.8 ? 'Good - above industry average' :
                  predictedROI > 0.5 ? 'Fair - below industry average' :
                  'Poor - significantly below industry standards'
    };

    // Enhanced Recommendations with ROI insights
    const recommendations = [];
    if (avgOverallScore < 70) recommendations.push('Consider adding higher-scoring creators');
    if (avgRiskScore > 30) recommendations.push('Review creator reliability metrics');
    if (predictedROI < 1.0) recommendations.push('Optimize creator selection for better ROI (target 1.0+)');
    if (predictedROI < 0.5) recommendations.push('Current ROI projection is poor - consider significant changes');
    if (selectedCreators.length > 10) recommendations.push('Consider reducing creators for better management');

    // Budget Optimization
    const suggestedBudget = Math.max(budget, totalCost * 1.2); // 20% buffer
    
    return {
      successProbability: Math.round(successProbability),
      predictedViews: Math.round(predictedViews),
      predictedEngagement: Math.round(predictedEngagement),
      predictedROI: Number(predictedROI.toFixed(2)),
      roiCategory,
      industryBenchmark,
      riskFactors,
      recommendations,
      budgetOptimization: {
        current: budget,
        suggested: suggestedBudget,
        reasoning: suggestedBudget > budget ? 
          'Add buffer for unexpected costs and better creator options' : 
          'Current budget is adequate'
      }
    };
  };

  // Risk Assessment
  const assessRisk = (campaign?: Campaign): RiskAssessment => {
    if (!campaign) {
      return {
        level: 'medium',
        score: 50,
        factors: [{
          type: 'market',
          description: 'No campaign selected for analysis',
          impact: 50
        }]
      };
    }

    const factors = [];
    let totalRisk = 0;

    // Creator risk assessment
    const selectedCreators = Array.isArray(campaign.selected_creators) ? campaign.selected_creators : [];
    const campaignCreatorScores = selectedCreators
      .map(sc => {
        const creatorId = typeof sc === 'object' && sc !== null ? sc.id : sc;
        return creatorScores.find(cs => cs.id === creatorId);
      })
      .filter(Boolean) as CreatorScore[];

    if (campaignCreatorScores.length > 0) {
      const avgRiskScore = campaignCreatorScores.reduce((sum, cs) => sum + cs.riskScore, 0) / campaignCreatorScores.length;
      if (avgRiskScore > 40) {
        factors.push({
          type: 'creator',
          description: 'High creator reliability risk',
          impact: avgRiskScore
        });
        totalRisk += avgRiskScore * 0.4;
      }
    }

    // Budget risk assessment
    const budget = Number((campaign as any).budget) || 0;
    const totalCost = selectedCreators.reduce((total, sc) => {
      const creatorId = typeof sc === 'object' && sc !== null ? sc.id : sc;
      const creator = creators.find(c => c.id === creatorId);
      return total + (creator ? creator.reel_rate || 0 : 0);
    }, 0);

    if (budget < totalCost) {
      factors.push({
        type: 'budget',
        description: 'Budget insufficient for selected creators',
        impact: 80
      });
      totalRisk += 32; // 80 * 0.4
    } else if (budget < totalCost * 1.1) {
      factors.push({
        type: 'budget',
        description: 'Low budget buffer for unexpected costs',
        impact: 30
      });
      totalRisk += 12; // 30 * 0.4
    }

    // Timeline risk (simplified)
    const createdDate = new Date((campaign as any).created_at || (campaign as any).date_created);
    const daysSinceCreated = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated > 30) {
      factors.push({
        type: 'timeline',
        description: 'Campaign planning taking longer than expected',
        impact: 25
      });
      totalRisk += 5; // 25 * 0.2
    }

    // Market risk (simplified)
    if (selectedCreators.length > 15) {
      factors.push({
        type: 'market',
        description: 'High creator management complexity',
        impact: 35
      });
      totalRisk += 7; // 35 * 0.2
    }

    const riskLevel = totalRisk > 50 ? 'high' : totalRisk > 25 ? 'medium' : 'low';

    return {
      level: riskLevel,
      score: Math.round(totalRisk),
      factors
    };
  };

  return {
    creatorScores,
    predictCampaignSuccess,
    assessRisk,
    loading
  };
};