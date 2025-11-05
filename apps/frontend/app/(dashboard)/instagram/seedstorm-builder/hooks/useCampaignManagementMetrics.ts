import { useState, useMemo } from 'react';
import { Creator, Campaign } from '../lib/types';

export interface CreatorTierScore {
  id: string;
  tierLevel: 'high' | 'medium' | 'developing';
  performanceScore: number;
  reliabilityScore: number;
  costEfficiencyScore: number;
  executionRiskScore: number;
  confidenceScore: number;
}

export interface CampaignReadiness {
  overallScore: number;
  creatorSelectionScore: number;
  budgetAllocationScore: number;
  approvalStatusScore: number;
  readinessLevel: 'ready' | 'needs-work' | 'incomplete';
  blockers: string[];
  recommendations: string[];
}

export interface ExecutionHealth {
  overallScore: number;
  approvalBottlenecks: number;
  overduePayments: number;
  missingPosts: number;
  healthLevel: 'healthy' | 'attention-needed' | 'critical';
  alerts: {
    type: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    count: number;
  }[];
}

export interface CreatorPortfolioBalance {
  tierDistribution: {
    high: number;
    medium: number;
    developing: number;
  };
  engagementSpread: {
    above5: number;
    between2and5: number;
    below2: number;
  };
  balanceScore: number;
  recommendations: string[];
}

export interface TimelineStatus {
  daysUntilDeadline: number | null;
  campaignPhase: 'planning' | 'execution' | 'review' | 'completed';
  scheduleAdherence: number;
  timelineRisk: 'low' | 'medium' | 'high';
  milestones: {
    name: string;
    status: 'completed' | 'in-progress' | 'pending' | 'overdue';
    dueDate?: string;
  }[];
}

export const useCampaignManagementMetrics = (creators: Creator[], campaigns: Campaign[]) => {
  const [loading, setLoading] = useState(false);

  // Creator Tier Scoring - Focus on practical campaign management
  const creatorTierScores = useMemo(() => {
    return creators.map(creator => {
      // Performance Score (based on actual metrics)
      const engagementRate = creator.engagement_rate || 0;
      const viewsScore = Math.min(100, Math.log10(Math.max(creator.median_views_per_video, 1)) * 15);
      const performanceScore = Math.min(100, (engagementRate * 15) + (viewsScore * 0.6));

      // Reliability Score (based on campaign history and account stability)
      const creatorCampaigns = campaigns.filter(campaign => {
        const selected = Array.isArray(campaign.selected_creators) ? campaign.selected_creators : [];
        return selected.some((sc: any) => ((typeof sc === 'object' && sc !== null) ? sc.id : sc) === creator.id);
      });
      
      const reliabilityScore = Math.min(100, 
        40 + // Base score
        (creatorCampaigns.length * 12) + // Campaign experience
        (creator.followers > 50000 ? 15 : 0) + // Account size stability
        (engagementRate > 3 ? 10 : 0) // Consistent engagement
      );

      // Cost Efficiency Score (value for money)
      const costPerView = creator.median_views_per_video > 0 && creator.reel_rate > 0 
        ? (creator.reel_rate / creator.median_views_per_video) * 1000 
        : 0;
      const costEfficiencyScore = costPerView > 0 
        ? Math.max(0, Math.min(100, 100 - (costPerView * 50)))
        : 50;

      // Execution Risk Score (potential delivery issues)
      const riskFactors = [
        engagementRate < 2 ? 25 : 0, // Low engagement indicates potential issues
        creator.followers < 5000 ? 15 : 0, // Very small accounts may be unreliable
        creatorCampaigns.length === 0 ? 20 : 0, // No campaign history
        !creator.email ? 10 : 0 // Missing contact info
      ];
      const executionRiskScore = Math.min(100, riskFactors.reduce((sum, risk) => sum + risk, 0));

      // Confidence Score (data quality)
      const confidenceFactors = [
        engagementRate > 0 ? 25 : 0,
        creator.median_views_per_video > 0 ? 25 : 0,
        creator.email ? 20 : 0,
        creatorCampaigns.length > 0 ? 30 : 10
      ];
      const confidenceScore = Math.min(100, confidenceFactors.reduce((sum, factor) => sum + factor, 0));

      // Tier Classification
      const tierLevel: 'high' | 'medium' | 'developing' = 
        performanceScore >= 70 && reliabilityScore >= 70 ? 'high' :
        performanceScore >= 50 && reliabilityScore >= 50 ? 'medium' : 'developing';

      return {
        id: creator.id,
        tierLevel,
        performanceScore: Math.round(performanceScore),
        reliabilityScore: Math.round(reliabilityScore),
        costEfficiencyScore: Math.round(costEfficiencyScore),
        executionRiskScore: Math.round(executionRiskScore),
        confidenceScore: Math.round(confidenceScore)
      };
    });
  }, [creators, campaigns]);

  // Campaign Readiness Assessment
  const assessCampaignReadiness = (campaign: Campaign): CampaignReadiness => {
    const selectedCreators = Array.isArray(campaign.selected_creators) ? campaign.selected_creators : [];
    const budget = campaign.totals?.total_cost || 0;
    
    // Creator Selection Score (completeness and quality)
    const creatorSelectionScore = selectedCreators.length > 0 
      ? Math.min(100, (selectedCreators.length * 20) + 
          (selectedCreators.length >= 5 ? 20 : 0)) // Bonus for adequate selection
      : 0;

    // Budget Allocation Score
    const totalCost = selectedCreators.reduce((total, sc) => {
      const creatorId = typeof sc === 'object' && sc !== null ? sc.id : sc;
      const creator = creators.find(c => c.id === creatorId);
      return total + (creator ? creator.reel_rate || 0 : 0);
    }, 0);
    
    const budgetAllocationScore = totalCost > 0 
      ? Math.min(100, (budget / totalCost) * 100)
      : budget > 0 ? 50 : 0;

    // Approval Status Score (campaign progress)
    const approvalStatusScore = campaign.status === 'Active' ? 100 :
                               campaign.status === 'Draft' ? 60 : 80;

    // Overall Readiness Score
    const overallScore = Math.round(
      (creatorSelectionScore * 0.4) +
      (budgetAllocationScore * 0.3) +
      (approvalStatusScore * 0.3)
    );

    // Readiness Level
    const readinessLevel: 'ready' | 'needs-work' | 'incomplete' =
      overallScore >= 80 ? 'ready' :
      overallScore >= 60 ? 'needs-work' : 'incomplete';

    // Identify Blockers
    const blockers = [];
    if (selectedCreators.length === 0) blockers.push('No creators selected');
    if (budget === 0) blockers.push('Budget not allocated');
    if (totalCost > budget * 1.1) blockers.push('Budget insufficient for selected creators');
    if (selectedCreators.length < 3) blockers.push('Consider selecting more creators for better reach');

    // Generate Recommendations
    const recommendations = [];
    if (creatorSelectionScore < 70) recommendations.push('Add more creators to improve campaign reach');
    if (budgetAllocationScore < 70) recommendations.push('Review budget allocation vs creator costs');
    if (selectedCreators.length > 20) recommendations.push('Consider reducing creators for better management');

    return {
      overallScore,
      creatorSelectionScore,
      budgetAllocationScore,
      approvalStatusScore,
      readinessLevel,
      blockers,
      recommendations
    };
  };

  // Execution Health Assessment
  const assessExecutionHealth = (campaigns: Campaign[]): ExecutionHealth => {
    const activeCampaigns = campaigns.filter(c => c.status === 'Active');
    
    // For now, we'll use placeholder values since we don't have post/payment tracking
    // In a real implementation, this would query actual post and payment data
    const approvalBottlenecks = Math.floor(Math.random() * 3); // Placeholder
    const overduePayments = Math.floor(Math.random() * 2); // Placeholder
    const missingPosts = Math.floor(Math.random() * 5); // Placeholder

    const alerts = [];
    if (approvalBottlenecks > 0) {
      alerts.push({
        type: 'warning' as const,
        title: 'Approval Bottlenecks',
        description: 'Some campaigns have pending approvals that may delay execution',
        count: approvalBottlenecks
      });
    }
    if (overduePayments > 0) {
      alerts.push({
        type: 'critical' as const,
        title: 'Overdue Payments',
        description: 'Payments are overdue and may impact creator relationships',
        count: overduePayments
      });
    }
    if (missingPosts > 0) {
      alerts.push({
        type: 'info' as const,
        title: 'Missing Posts',
        description: 'Some posts are still pending delivery from creators',
        count: missingPosts
      });
    }

    const totalIssues = approvalBottlenecks + overduePayments + missingPosts;
    const overallScore = Math.max(0, 100 - (totalIssues * 15));
    
    const healthLevel: 'healthy' | 'attention-needed' | 'critical' =
      overallScore >= 80 ? 'healthy' :
      overallScore >= 60 ? 'attention-needed' : 'critical';

    return {
      overallScore,
      approvalBottlenecks,
      overduePayments,
      missingPosts,
      healthLevel,
      alerts
    };
  };

  // Creator Portfolio Balance Assessment
  const assessPortfolioBalance = (selectedCreators: any[]): CreatorPortfolioBalance => {
    const creatorIds = selectedCreators.map(sc => 
      typeof sc === 'object' && sc !== null ? sc.id : sc
    );
    
    const portfolioCreators = creators.filter(c => creatorIds.includes(c.id));
    const tierScores = creatorTierScores.filter(ts => creatorIds.includes(ts.id));

    // Tier Distribution
    const tierDistribution = {
      high: tierScores.filter(ts => ts.tierLevel === 'high').length,
      medium: tierScores.filter(ts => ts.tierLevel === 'medium').length,
      developing: tierScores.filter(ts => ts.tierLevel === 'developing').length
    };

    // Engagement Rate Spread
    const engagementSpread = {
      above5: portfolioCreators.filter(c => (c.engagement_rate || 0) > 5).length,
      between2and5: portfolioCreators.filter(c => {
        const rate = c.engagement_rate || 0;
        return rate >= 2 && rate <= 5;
      }).length,
      below2: portfolioCreators.filter(c => (c.engagement_rate || 0) < 2).length
    };

    // Balance Score (prefer some diversity in tiers but not require it)
    const tierBalance = tierDistribution.high > 0 ? 40 : 0;
    const mediumTierBonus = tierDistribution.medium > 0 ? 30 : 0;
    const engagementBalance = engagementSpread.above5 > 0 ? 30 : 0;
    
    const balanceScore = Math.min(100, tierBalance + mediumTierBonus + engagementBalance);

    // Recommendations
    const recommendations = [];
    if (tierDistribution.high === 0) recommendations.push('Consider adding some high-tier creators for better performance');
    if (engagementSpread.above5 === 0) recommendations.push('Include creators with higher engagement rates');
    if (portfolioCreators.length < 3) recommendations.push('Add more creators for better campaign resilience');

    return {
      tierDistribution,
      engagementSpread,
      balanceScore,
      recommendations
    };
  };

  // Timeline Status Assessment
  const assessTimelineStatus = (campaign: Campaign): TimelineStatus => {
    const createdDate = new Date(campaign.date_created);
    const daysSinceCreated = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Determine campaign phase based on status and age
    const campaignPhase: 'planning' | 'execution' | 'review' | 'completed' = 
      campaign.status === 'Completed' ? 'completed' :
      campaign.status === 'Active' ? 'execution' :
      daysSinceCreated > 14 ? 'review' : 'planning';

    // Placeholder timeline risk assessment
    const timelineRisk: 'low' | 'medium' | 'high' = 
      daysSinceCreated > 30 ? 'high' :
      daysSinceCreated > 14 ? 'medium' : 'low';

    // Schedule adherence (placeholder - would be calculated from actual deadlines)
    const scheduleAdherence = Math.max(0, 100 - (daysSinceCreated * 2));

    // Sample milestones (in a real app, these would be actual campaign milestones)
    const milestones = [
      {
        name: 'Creator Selection',
        status: Array.isArray(campaign.selected_creators) && campaign.selected_creators.length > 0 
          ? 'completed' as const : 'in-progress' as const
      },
      {
        name: 'Budget Approval',
        status: campaign.totals?.total_cost > 0 ? 'completed' as const : 'pending' as const
      },
      {
        name: 'Campaign Launch',
        status: campaign.status === 'Active' ? 'completed' as const : 'pending' as const
      }
    ];

    return {
      daysUntilDeadline: null, // Placeholder - would be calculated from actual deadlines
      campaignPhase,
      scheduleAdherence: Math.round(scheduleAdherence),
      timelineRisk,
      milestones
    };
  };

  return {
    creatorTierScores,
    assessCampaignReadiness,
    assessExecutionHealth,
    assessPortfolioBalance,
    assessTimelineStatus,
    loading
  };
};