'use client';

import { InstagramDashboardTab } from "./InstagramDashboardTab";

interface EnhancedDashboardProps {
  creators?: any[];
  campaigns?: any[];
  onCampaignClick?: (campaign: any) => void;
}

/**
 * Legacy wrapper: Dashboard tab now uses the ops-focused InstagramDashboardTab.
 * Props are ignored; kept for any remaining imports.
 */
export const EnhancedDashboard = (_props: EnhancedDashboardProps) => {
  return <InstagramDashboardTab />;
};
