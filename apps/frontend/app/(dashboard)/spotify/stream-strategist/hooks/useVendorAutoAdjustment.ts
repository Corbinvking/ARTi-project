"use client"

// Vendor Reliability Auto-Adjustment System

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';

export interface VendorAdjustmentRecommendation {
  vendorId: string;
  vendorName: string;
  currentReliability: number;
  adjustmentType: 'increase_capacity' | 'decrease_capacity' | 'maintain' | 'review_required' | 'suspend';
  recommendedCapacity: number;
  currentCapacity: number;
  reasoning: string[];
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
  impactEstimate: {
    streamDelivery: number;
    costEfficiency: number;
    campaignSuccess: number;
  };
}

export interface VendorRiskAssessment {
  vendorId: string;
  riskScore: number;
  riskFactors: Array<{
    factor: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
  recommendations: string[];
  monitoringRequired: boolean;
}

export interface AutoAdjustmentResult {
  adjustmentsApplied: number;
  vendorsUpdated: string[];
  totalImpactEstimate: number;
  warnings: string[];
  summary: string;
}

// Hook to get vendor auto-adjustment recommendations
export function useVendorAutoAdjustmentRecommendations() {
  return useQuery({
    queryKey: ['vendor-auto-adjustment-recommendations'],
    queryFn: async (): Promise<VendorAdjustmentRecommendation[]> => {
      // Fetch vendor data with reliability scores
      const { data: vendors, error: vendorsError } = await supabase
        .from('vendors')
        .select(`
          *,
          vendor_reliability_scores (*)
        `)
        .eq('is_active', true);

      if (vendorsError) throw vendorsError;

      // Fetch recent campaign performance data
      const { data: performanceData, error: perfError } = await supabase
        .from('campaign_allocations_performance')
        .select('*')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (perfError) throw perfError;

      // Generate recommendations for each vendor
      const recommendations: VendorAdjustmentRecommendation[] = [];

      for (const vendor of vendors || []) {
        const reliabilityData = vendor.vendor_reliability_scores?.[0];
        const vendorPerformance = (performanceData || []).filter(p => p.vendor_id === vendor.id);

        const recommendation = generateVendorRecommendation(
          vendor,
          reliabilityData,
          vendorPerformance
        );

        recommendations.push(recommendation);
      }

      return recommendations.sort((a, b) => {
        // Sort by priority: high risk first, then by potential impact
        if (a.riskLevel === 'high' && b.riskLevel !== 'high') return -1;
        if (b.riskLevel === 'high' && a.riskLevel !== 'high') return 1;
        return b.impactEstimate.campaignSuccess - a.impactEstimate.campaignSuccess;
      });
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook to assess vendor risks
export function useVendorRiskAssessment() {
  return useQuery({
    queryKey: ['vendor-risk-assessment'],
    queryFn: async (): Promise<VendorRiskAssessment[]> => {
      // Fetch vendor reliability data
      const { data: reliabilityScores, error: reliabilityError } = await supabase
        .from('vendor_reliability_scores')
        .select(`
          *,
          vendors (id, name, is_active)
        `)
        .order('quality_score', { ascending: true });

      if (reliabilityError) throw reliabilityError;

      // Fetch recent campaign failures or issues
      const { data: performanceIssues, error: issuesError } = await supabase
        .from('campaign_allocations_performance')
        .select('*')
        .lt('performance_score', 0.5)
        .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

      if (issuesError) throw issuesError;

      const riskAssessments: VendorRiskAssessment[] = [];

      for (const vendor of reliabilityScores || []) {
        if (!vendor.vendors) continue;

        const vendorIssues = (performanceIssues || []).filter(p => p.vendor_id === vendor.vendor_id);
        const riskAssessment = assessVendorRisk(vendor, vendorIssues);
        riskAssessments.push(riskAssessment);
      }

      return riskAssessments.sort((a, b) => b.riskScore - a.riskScore);
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Hook to apply automatic vendor adjustments
export function useApplyVendorAutoAdjustments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: {
      recommendations: VendorAdjustmentRecommendation[];
      autoApprove: boolean;
      maxAdjustments?: number;
    }): Promise<AutoAdjustmentResult> => {
      const maxAdjustments = options.maxAdjustments || 10;
      const adjustmentsToApply = options.recommendations
        .filter(rec => {
          // Only auto-apply low-risk adjustments or if explicitly approved
          return options.autoApprove || 
                 (rec.riskLevel === 'low' && rec.confidence > 0.8) ||
                 rec.adjustmentType === 'maintain';
        })
        .slice(0, maxAdjustments);

      const vendorsUpdated: string[] = [];
      const warnings: string[] = [];
      let totalImpactEstimate = 0;

      for (const recommendation of adjustmentsToApply) {
        try {
          // Update vendor capacity if needed
          if (recommendation.adjustmentType !== 'maintain') {
            const { error } = await supabase
              .from('vendors')
              .update({
                max_daily_streams: recommendation.recommendedCapacity,
                updated_at: new Date().toISOString()
              })
              .eq('id', recommendation.vendorId);

            if (error) {
              warnings.push(`Failed to update ${recommendation.vendorName}: ${error.message}`);
              continue;
            }
          }

          // Log the adjustment
          await supabase
            .from('algorithm_learning_log')
            .insert({
              algorithm_version: '3.0-auto-adjustment',
              decision_type: 'vendor_capacity_adjustment',
              input_data: {
                vendorId: recommendation.vendorId,
                currentCapacity: recommendation.currentCapacity,
                currentReliability: recommendation.currentReliability,
                adjustmentType: recommendation.adjustmentType
              },
              decision_data: {
                newCapacity: recommendation.recommendedCapacity,
                reasoning: recommendation.reasoning,
                confidence: recommendation.confidence,
                impactEstimate: recommendation.impactEstimate
              },
              confidence_score: recommendation.confidence
            });

          vendorsUpdated.push(recommendation.vendorName);
          totalImpactEstimate += recommendation.impactEstimate.campaignSuccess;

        } catch (error) {
          warnings.push(`Error processing ${recommendation.vendorName}: ${error}`);
        }
      }

      // Trigger reliability score recalculation
      await supabase.rpc('update_vendor_reliability_scores');

      return {
        adjustmentsApplied: vendorsUpdated.length,
        vendorsUpdated,
        totalImpactEstimate,
        warnings,
        summary: `Applied ${vendorsUpdated.length} vendor adjustments with estimated ${(totalImpactEstimate * 100).toFixed(1)}% impact improvement`
      };
    },
    onSuccess: (result) => {
      if (result.adjustmentsApplied > 0) {
        toast.success(`Applied ${result.adjustmentsApplied} vendor adjustments successfully`);
      }
      if (result.warnings.length > 0) {
        toast.warning(`${result.warnings.length} adjustments had issues - check logs`);
      }
      queryClient.invalidateQueries({ queryKey: ['vendor-auto-adjustment-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-reliability-scores'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (error) => {
      toast.error('Failed to apply vendor adjustments');
      console.error('Vendor auto-adjustment error:', error);
    }
  });
}

// Hook to schedule periodic vendor adjustments
export function useScheduleVendorAdjustments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schedule: {
      frequency: 'daily' | 'weekly' | 'monthly';
      autoApprove: boolean;
      maxAdjustmentsPerRun: number;
      riskThreshold: 'low' | 'medium' | 'high';
    }) => {
      // Store scheduling configuration
      const { data, error } = await supabase
        .from('algorithm_learning_log')
        .insert({
          algorithm_version: '3.0-auto-adjustment',
          decision_type: 'adjustment_scheduling',
          input_data: schedule,
          decision_data: {
            scheduledAt: new Date().toISOString(),
            nextRun: calculateNextRun(schedule.frequency).toISOString(),
            status: 'active'
          },
          confidence_score: 1.0
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Vendor adjustment scheduling configured');
      queryClient.invalidateQueries({ queryKey: ['algorithm-learning-logs'] });
    },
    onError: (error) => {
      toast.error('Failed to configure adjustment scheduling');
      console.error('Scheduling error:', error);
    }
  });
}

// Helper functions
function generateVendorRecommendation(
  vendor: any,
  reliabilityData: any,
  performanceData: any[]
): VendorAdjustmentRecommendation {
  const currentReliability = reliabilityData?.quality_score || 0.8;
  const deliveryConsistency = reliabilityData?.delivery_consistency || 0.8;
  const streamAccuracy = reliabilityData?.stream_accuracy || 0.8;
  const currentCapacity = vendor.max_daily_streams || 0;

  // Calculate recent performance metrics
  const recentPerformance = performanceData.length > 0 ? 
    performanceData.reduce((sum, p) => sum + (p.performance_score || 0), 0) / performanceData.length : 0.8;

  const avgUtilization = calculateVendorUtilization(performanceData, currentCapacity);
  
  // Determine adjustment type and reasoning
  let adjustmentType: VendorAdjustmentRecommendation['adjustmentType'] = 'maintain';
  let recommendedCapacity = currentCapacity;
  const reasoning: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  let confidence = 0.8;

  // High performance vendor - consider capacity increase
  if (currentReliability > 0.85 && deliveryConsistency > 0.9 && avgUtilization > 0.8) {
    adjustmentType = 'increase_capacity';
    recommendedCapacity = Math.floor(currentCapacity * 1.2);
    reasoning.push('High reliability and near-capacity utilization');
    reasoning.push('Consistent delivery performance above 90%');
    confidence = 0.9;
  }
  // Poor performance vendor - consider capacity decrease or review
  else if (currentReliability < 0.6 || deliveryConsistency < 0.7) {
    if (currentReliability < 0.4) {
      adjustmentType = 'suspend';
      recommendedCapacity = 0;
      reasoning.push('Critical reliability issues requiring immediate review');
      riskLevel = 'high';
    } else {
      adjustmentType = 'decrease_capacity';
      recommendedCapacity = Math.floor(currentCapacity * 0.7);
      reasoning.push('Below-average reliability requiring capacity reduction');
      riskLevel = 'medium';
    }
    confidence = 0.85;
  }
  // Moderate performance - maintain or slight adjustment
  else if (recentPerformance < 0.7 && avgUtilization < 0.5) {
    adjustmentType = 'review_required';
    reasoning.push('Underutilized capacity with moderate performance');
    reasoning.push('Manual review recommended before adjustment');
    riskLevel = 'medium';
    confidence = 0.7;
  }

  // Calculate impact estimates
  const impactEstimate = {
    streamDelivery: calculateStreamDeliveryImpact(adjustmentType, currentReliability),
    costEfficiency: calculateCostEfficiencyImpact(adjustmentType, avgUtilization),
    campaignSuccess: calculateCampaignSuccessImpact(adjustmentType, currentReliability, deliveryConsistency)
  };

  return {
    vendorId: vendor.id,
    vendorName: vendor.name || `Vendor ${vendor.id.substring(0, 8)}`,
    currentReliability,
    adjustmentType,
    recommendedCapacity,
    currentCapacity,
    reasoning,
    riskLevel,
    confidence,
    impactEstimate
  };
}

function assessVendorRisk(
  vendor: any,
  performanceIssues: any[]
): VendorRiskAssessment {
  const riskFactors: Array<{
    factor: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }> = [];

  let riskScore = 0;

  // Low reliability score
  if (vendor.quality_score < 0.6) {
    riskFactors.push({
      factor: 'Low Quality Score',
      severity: 'high',
      description: `Quality score of ${(vendor.quality_score * 100).toFixed(1)}% is below acceptable threshold`
    });
    riskScore += 0.3;
  }

  // Poor delivery consistency
  if (vendor.delivery_consistency < 0.7) {
    riskFactors.push({
      factor: 'Inconsistent Delivery',
      severity: 'medium',
      description: `Delivery consistency of ${(vendor.delivery_consistency * 100).toFixed(1)}% indicates unreliable service`
    });
    riskScore += 0.2;
  }

  // Recent performance issues
  if (performanceIssues.length > 2) {
    riskFactors.push({
      factor: 'Recent Performance Issues',
      severity: 'high',
      description: `${performanceIssues.length} campaigns with poor performance in the last 14 days`
    });
    riskScore += 0.25;
  }

  // Low stream accuracy
  if (vendor.stream_accuracy < 0.8) {
    riskFactors.push({
      factor: 'Poor Stream Accuracy',
      severity: 'medium',
      description: `Stream prediction accuracy of ${(vendor.stream_accuracy * 100).toFixed(1)}% affects campaign planning`
    });
    riskScore += 0.15;
  }

  // Generate recommendations
  const recommendations: string[] = [];
  if (riskScore > 0.5) {
    recommendations.push('Consider reducing allocation to this vendor');
    recommendations.push('Implement enhanced monitoring and reporting');
  }
  if (riskScore > 0.7) {
    recommendations.push('Review vendor contract and performance requirements');
    recommendations.push('Consider finding alternative vendors for critical campaigns');
  }

  return {
    vendorId: vendor.vendor_id,
    riskScore: Math.min(1, riskScore),
    riskFactors,
    recommendations,
    monitoringRequired: riskScore > 0.3
  };
}

function calculateVendorUtilization(performanceData: any[], capacity: number): number {
  if (!performanceData.length || capacity === 0) return 0;
  
  const totalAllocated = performanceData.reduce((sum, p) => sum + (p.allocated_streams || 0), 0);
  const avgDailyUtilization = totalAllocated / (performanceData.length * capacity);
  
  return Math.min(1, avgDailyUtilization);
}

function calculateStreamDeliveryImpact(adjustmentType: string, reliability: number): number {
  switch (adjustmentType) {
    case 'increase_capacity': return reliability > 0.8 ? 0.15 : 0.05;
    case 'decrease_capacity': return reliability < 0.6 ? 0.1 : -0.05;
    case 'suspend': return -0.2;
    default: return 0;
  }
}

function calculateCostEfficiencyImpact(adjustmentType: string, utilization: number): number {
  switch (adjustmentType) {
    case 'increase_capacity': return utilization > 0.8 ? 0.1 : -0.02;
    case 'decrease_capacity': return utilization < 0.5 ? 0.08 : -0.03;
    default: return 0;
  }
}

function calculateCampaignSuccessImpact(adjustmentType: string, reliability: number, consistency: number): number {
  const baseImpact = (reliability + consistency) / 2;
  
  switch (adjustmentType) {
    case 'increase_capacity': return baseImpact > 0.8 ? 0.12 : 0.03;
    case 'decrease_capacity': return baseImpact < 0.6 ? 0.08 : -0.02;
    case 'suspend': return -0.15;
    default: return 0;
  }
}

function calculateNextRun(frequency: string): Date {
  const now = new Date();
  switch (frequency) {
    case 'daily': return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case 'weekly': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'monthly': return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    default: return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}








