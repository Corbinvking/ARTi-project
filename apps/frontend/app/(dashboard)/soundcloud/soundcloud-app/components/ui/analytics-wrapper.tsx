"use client"

import React, { useEffect } from 'react';
import { useAnalyticsTracking } from '@/hooks/useAnalyticsTracking';
import { useLocation } from 'react-router-dom';

interface AnalyticsWrapperProps {
  children: React.ReactNode;
}

export const AnalyticsWrapper: React.FC<AnalyticsWrapperProps> = ({ children }) => {
  const location = useLocation();
  const { trackPageView } = useAnalyticsTracking();

  useEffect(() => {
    const pageName = location.pathname.split('/').filter(Boolean).join('_') || 'home';
    trackPageView(pageName, { 
      full_path: location.pathname,
      search: location.search,
      hash: location.hash 
    });
  }, [location, trackPageView]);

  return <>{children}</>;
};