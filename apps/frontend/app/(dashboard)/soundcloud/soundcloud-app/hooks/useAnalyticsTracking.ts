import { useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';

interface AnalyticsEvent {
  event_type: 'page_view' | 'click' | 'form_submit' | 'export' | 'search' | 'error';
  event_name: string;
  properties?: Record<string, any>;
  context?: Record<string, any>;
}

export const useAnalyticsTracking = () => {
  const { user } = useAuth();

  const trackEvent = useCallback(async (event: AnalyticsEvent) => {
    if (!user) return;

    try {
      const sessionId = sessionStorage.getItem('analytics_session_id') || 
        crypto.randomUUID();
      
      if (!sessionStorage.getItem('analytics_session_id')) {
        sessionStorage.setItem('analytics_session_id', sessionId);
      }

      await supabase
        .from('analytics_events')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          event_type: event.event_type,
          event_name: event.event_name,
          properties: event.properties || {},
          context: {
            user_agent: navigator.userAgent,
            url: window.location.href,
            referrer: document.referrer,
            timestamp: new Date().toISOString(),
            ...event.context,
          },
        });
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }, [user]);

  const trackPageView = useCallback((pageName: string, additionalProps?: Record<string, any>) => {
    trackEvent({
      event_type: 'page_view',
      event_name: `page_view_${pageName}`,
      properties: {
        page: pageName,
        ...additionalProps,
      },
    });
  }, [trackEvent]);

  const trackClick = useCallback((elementName: string, additionalProps?: Record<string, any>) => {
    trackEvent({
      event_type: 'click',
      event_name: `click_${elementName}`,
      properties: {
        element: elementName,
        ...additionalProps,
      },
    });
  }, [trackEvent]);

  const trackExport = useCallback((exportType: string, format: string, additionalProps?: Record<string, any>) => {
    trackEvent({
      event_type: 'export',
      event_name: `export_${exportType}`,
      properties: {
        export_type: exportType,
        format,
        ...additionalProps,
      },
    });
  }, [trackEvent]);

  const trackSearch = useCallback((searchTerm: string, resultCount: number, additionalProps?: Record<string, any>) => {
    trackEvent({
      event_type: 'search',
      event_name: 'search_performed',
      properties: {
        search_term: searchTerm,
        result_count: resultCount,
        ...additionalProps,
      },
    });
  }, [trackEvent]);

  const trackError = useCallback((errorType: string, errorMessage: string, additionalProps?: Record<string, any>) => {
    trackEvent({
      event_type: 'error',
      event_name: `error_${errorType}`,
      properties: {
        error_type: errorType,
        error_message: errorMessage,
        ...additionalProps,
      },
    });
  }, [trackEvent]);

  // Auto-track page views on route changes
  useEffect(() => {
    const path = window.location.pathname;
    const pageName = path.split('/').filter(Boolean).join('_') || 'home';
    trackPageView(pageName);
  }, [trackPageView, window.location.pathname]);

  return {
    trackEvent,
    trackPageView,
    trackClick,
    trackExport,
    trackSearch,
    trackError,
  };
};

// Hook for analytics data fetching
export const useAnalyticsData = () => {
  const fetchAggregations = useCallback(async (
    metricName: string,
    granularity: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily',
    startDate?: Date,
    endDate?: Date
  ) => {
    let query = supabase
      .from('analytics_aggregations')
      .select('*')
      .eq('metric_name', metricName)
      .eq('granularity', granularity)
      .order('period_start', { ascending: false });

    if (startDate) {
      query = query.gte('period_start', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('period_end', endDate.toISOString());
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Failed to fetch analytics aggregations:', error);
      return [];
    }

    return data || [];
  }, []);

  const fetchMemberPerformance = useCallback(async () => {
    const { data, error } = await supabase
      .from('member_performance_summary')
      .select('*')
      .order('total_submissions', { ascending: false });

    if (error) {
      console.error('Failed to fetch member performance:', error);
      return [];
    }

    return data || [];
  }, []);

  const fetchRevenueData = useCallback(async () => {
    const { data, error } = await supabase
      .from('revenue_summary')
      .select('*')
      .order('month', { ascending: false });

    if (error) {
      console.error('Failed to fetch revenue data:', error);
      return [];
    }

    return data || [];
  }, []);

  const refreshViews = useCallback(async () => {
    const { error } = await supabase.rpc('refresh_analytics_views');
    
    if (error) {
      console.error('Failed to refresh analytics views:', error);
      return false;
    }

    return true;
  }, []);

  return {
    fetchAggregations,
    fetchMemberPerformance,
    fetchRevenueData,
    refreshViews,
  };
};