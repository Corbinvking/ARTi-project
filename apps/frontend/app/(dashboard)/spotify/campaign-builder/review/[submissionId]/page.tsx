"use client"

import { StreamStrategistApp } from "../../../stream-strategist/components/StreamStrategistApp"
import { ProtectedRoute } from "../../../stream-strategist/components/ProtectedRoute"
import CampaignBuilder from "../../../stream-strategist/pages/CampaignBuilder"

export default function SpotifyCampaignBuilderReviewPage() {
  return (
    <div className="h-full w-full">
      <StreamStrategistApp>
        <ProtectedRoute requiredRoles={['admin', 'manager']}>
          <CampaignBuilder />
        </ProtectedRoute>
      </StreamStrategistApp>
    </div>
  )
}
