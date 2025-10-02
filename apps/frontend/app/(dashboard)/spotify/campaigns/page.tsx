"use client"

import { StreamStrategistApp } from "../stream-strategist/components/StreamStrategistApp"
import { ProtectedRoute } from "../stream-strategist/components/ProtectedRoute"
import CampaignHistoryPage from "../stream-strategist/pages/CampaignHistoryPage"

export default function SpotifyCampaignsPage() {
  return (
    <div className="h-full w-full">
      <StreamStrategistApp>
        <ProtectedRoute requiredRoles={['admin', 'manager', 'salesperson']}>
          <CampaignHistoryPage />
        </ProtectedRoute>
      </StreamStrategistApp>
    </div>
  )
}
