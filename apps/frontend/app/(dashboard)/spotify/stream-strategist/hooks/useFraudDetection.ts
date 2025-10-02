"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { toast } from "sonner";

export interface FraudDetectionAlert {
  id: string;
  campaign_id?: string;
  playlist_id?: string;
  vendor_id?: string;
  alert_type: 'suspicious_streams' | 'velocity_anomaly' | 'pattern_irregularity' | 'vendor_behavior';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detection_data: any;
  confidence_score?: number;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export const useFraudDetectionAlerts = (status?: string) => {
  return useQuery({
    queryKey: ["fraud-detection-alerts", status],
    queryFn: async () => {
      let query = supabase.from("fraud_detection_alerts").select("*");
      
      if (status) {
        query = query.eq("status", status);
      }
      
      query = query.order("created_at", { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      return data as FraudDetectionAlert[];
    },
  });
};

export const useCreateFraudAlert = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (alert: Omit<FraudDetectionAlert, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("fraud_detection_alerts")
        .insert(alert)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fraud-detection-alerts"] });
      toast.success("Fraud alert created successfully");
    },
    onError: (error) => {
      console.error("Error creating fraud alert:", error);
      toast.error("Failed to create fraud alert");
    },
  });
};

export const useResolveFraudAlert = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      resolution_notes 
    }: { 
      id: string; 
      status: 'resolved' | 'false_positive'; 
      resolution_notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("fraud_detection_alerts")
        .update({
          status,
          resolution_notes,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fraud-detection-alerts"] });
      toast.success("Fraud alert resolved successfully");
    },
    onError: (error) => {
      console.error("Error resolving fraud alert:", error);
      toast.error("Failed to resolve fraud alert");
    },
  });
};

export const useAnalyzeStreamPatterns = () => {
  const createAlert = useCreateFraudAlert();
  
  return useMutation({
    mutationFn: async ({ campaignId, playlistId, vendorId }: { 
      campaignId?: string; 
      playlistId?: string; 
      vendorId?: string;
    }) => {
      // Simulate fraud detection analysis
      // In a real implementation, this would analyze actual stream data patterns
      
      const suspiciousPatterns = Math.random() > 0.7; // 30% chance of suspicious activity
      
      if (suspiciousPatterns) {
        const alertType = Math.random() > 0.5 ? 'suspicious_streams' : 'velocity_anomaly';
        const severity = Math.random() > 0.5 ? 'high' : 'medium';
        const confidence = Math.random() * 0.4 + 0.6; // 0.6 to 1.0
        
        return createAlert.mutateAsync({
          campaign_id: campaignId,
          playlist_id: playlistId,
          vendor_id: vendorId,
          alert_type: alertType,
          severity,
          confidence_score: confidence,
          status: 'open',
          detection_data: {
            analysis_timestamp: new Date().toISOString(),
            pattern_indicators: {
              stream_velocity_anomaly: alertType === 'velocity_anomaly' ? Math.random() * 0.5 + 0.5 : null,
              suspicious_stream_patterns: alertType === 'suspicious_streams' ? Math.random() * 0.5 + 0.5 : null,
              bot_like_behavior_score: Math.random() * 0.4 + 0.1,
              geographic_distribution_anomaly: Math.random() * 0.3 + 0.1,
            },
            analyzed_period: {
              start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              end_date: new Date().toISOString(),
            },
          },
        });
      }
      
      return null; // No suspicious patterns detected
    },
    onSuccess: (result) => {
      if (result) {
        toast.warning("Suspicious stream patterns detected");
      } else {
        toast.success("Stream patterns analysis completed - no issues found");
      }
    },
    onError: (error) => {
      console.error("Error analyzing stream patterns:", error);
      toast.error("Failed to analyze stream patterns");
    },
  });
};

export const useFraudDetectionSummary = () => {
  return useQuery({
    queryKey: ["fraud-detection-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fraud_detection_alerts")
        .select("status, severity, alert_type");
      
      if (error) throw error;
      
      const summary = {
        total_alerts: data.length,
        open_alerts: data.filter(alert => alert.status === 'open').length,
        critical_alerts: data.filter(alert => alert.severity === 'critical').length,
        high_priority_alerts: data.filter(alert => alert.severity === 'high').length,
        resolved_alerts: data.filter(alert => alert.status === 'resolved').length,
        false_positives: data.filter(alert => alert.status === 'false_positive').length,
        alert_types: {
          suspicious_streams: data.filter(alert => alert.alert_type === 'suspicious_streams').length,
          velocity_anomaly: data.filter(alert => alert.alert_type === 'velocity_anomaly').length,
          pattern_irregularity: data.filter(alert => alert.alert_type === 'pattern_irregularity').length,
          vendor_behavior: data.filter(alert => alert.alert_type === 'vendor_behavior').length,
        },
      };
      
      return summary;
    },
  });
};








