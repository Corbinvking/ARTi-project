import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';

export interface SecurityEvent {
  id: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  riskScore: number;
  createdAt: string;
}

export interface ThreatDetection {
  threatType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedUsers: string[];
  recommendations: string[];
  detectedAt: string;
}

export interface SecurityMetrics {
  totalEvents: number;
  highRiskEvents: number;
  suspiciousLogins: number;
  blockedAttempts: number;
  averageRiskScore: number;
}

export interface RiskAssessment {
  userId?: string;
  ipAddress?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  score: number;
  recommendations: string[];
}

export const useSecurityMonitoring = () => {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [threats, setThreats] = useState<ThreatDetection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch security events
  const fetchSecurityEvents = useCallback(async (limit = 100) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;
      
      // Map database fields to interface properties
      const mappedEvents: SecurityEvent[] = (data || []).map(event => ({
        id: event.id,
        userId: event.user_id,
        action: event.action,
        resourceType: event.resource_type,
        resourceId: event.resource_id,
        ipAddress: event.ip_address as string,
        userAgent: event.user_agent,
        details: event.details as Record<string, any>,
        riskScore: event.risk_score,
        createdAt: event.created_at
      }));
      
      setSecurityEvents(mappedEvents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch security events');
    } finally {
      setLoading(false);
    }
  }, []);

  // Log security event
  const logSecurityEvent = useCallback(async (
    action: string,
    resourceType: string,
    resourceId?: string,
    details: Record<string, any> = {},
    riskScore = 0
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.rpc('log_audit_event', {
        _user_id: user?.id || null,
        _action: action,
        _resource_type: resourceType,
        _resource_id: resourceId || null,
        _details: details,
        _risk_score: riskScore
      });
    } catch (err) {
      console.error('Failed to log security event:', err);
    }
  }, []);

  // Analyze login patterns
  const analyzeLoginPatterns = useCallback(async (userId?: string): Promise<RiskAssessment | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('security-analyzer', {
        body: {
          analysisType: 'login_patterns',
          userId,
          lookbackDays: 30
        }
      });

      if (error) throw error;

      return {
        userId: data.userId,
        ipAddress: data.ipAddress,
        riskLevel: data.riskLevel,
        riskFactors: data.riskFactors || [],
        score: data.score,
        recommendations: data.recommendations || []
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze login patterns');
      return null;
    }
  }, []);

  // Detect suspicious activities
  const detectSuspiciousActivities = useCallback(async (): Promise<ThreatDetection[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('security-analyzer', {
        body: { analysisType: 'suspicious_activities' }
      });

      if (error) throw error;

      const detectedThreats = data.threats.map((threat: any) => ({
        threatType: threat.threatType,
        severity: threat.severity,
        description: threat.description,
        affectedUsers: threat.affectedUsers || [],
        recommendations: threat.recommendations || [],
        detectedAt: threat.detectedAt
      }));

      setThreats(detectedThreats);
      return detectedThreats;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to detect suspicious activities');
      return [];
    }
  }, []);

  // Get security metrics
  const getSecurityMetrics = useCallback(async (days = 7): Promise<SecurityMetrics | null> => {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('audit_logs')
        .select('risk_score')
        .gte('created_at', startDate);

      if (error) throw error;

      const totalEvents = data.length;
      const highRiskEvents = data.filter(event => event.risk_score >= 7).length;
      const averageRiskScore = data.reduce((sum, event) => sum + event.risk_score, 0) / totalEvents;

      // Get additional metrics
      const { data: loginData, error: loginError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'login_attempt')
        .gte('created_at', startDate);

      if (loginError) throw loginError;

      const suspiciousLogins = loginData.filter(event => event.risk_score >= 5).length;
      const blockedAttempts = loginData.filter(event => {
        const details = event.details as Record<string, any>;
        return details?.blocked === true || event.risk_score >= 8;
      }).length;

      return {
        totalEvents,
        highRiskEvents,
        suspiciousLogins,
        blockedAttempts,
        averageRiskScore: Math.round(averageRiskScore * 100) / 100
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get security metrics');
      return null;
    }
  }, []);

  // Check IP reputation
  const checkIpReputation = useCallback(async (ipAddress: string): Promise<RiskAssessment | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('security-analyzer', {
        body: {
          analysisType: 'ip_reputation',
          ipAddress
        }
      });

      if (error) throw error;

      return {
        ipAddress,
        riskLevel: data.riskLevel,
        riskFactors: data.riskFactors || [],
        score: data.score,
        recommendations: data.recommendations || []
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check IP reputation');
      return null;
    }
  }, []);

  // Generate security report
  const generateSecurityReport = useCallback(async (days = 30) => {
    try {
      const [metrics, threats] = await Promise.all([
        getSecurityMetrics(days),
        detectSuspiciousActivities()
      ]);

      return {
        period: `${days} days`,
        metrics,
        threats,
        generatedAt: new Date().toISOString()
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate security report');
      return null;
    }
  }, [getSecurityMetrics, detectSuspiciousActivities]);

  // Monitor real-time events
  useEffect(() => {
    const channel = supabase
      .channel('security-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs'
        },
        (payload) => {
          const newEvent = payload.new as SecurityEvent;
          setSecurityEvents(prev => [newEvent, ...prev.slice(0, 99)]);

          // Auto-analyze high-risk events
          if (newEvent.riskScore >= 7) {
            detectSuspiciousActivities();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [detectSuspiciousActivities]);

  useEffect(() => {
    fetchSecurityEvents();
  }, [fetchSecurityEvents]);

  return {
    securityEvents,
    threats,
    loading,
    error,
    fetchSecurityEvents,
    logSecurityEvent,
    analyzeLoginPatterns,
    detectSuspiciousActivities,
    getSecurityMetrics,
    checkIpReputation,
    generateSecurityReport
  };
};