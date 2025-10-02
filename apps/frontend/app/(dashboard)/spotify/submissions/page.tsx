"use client"

import { StreamStrategistApp } from "../stream-strategist/components/StreamStrategistApp"
import { ProtectedRoute } from "../stream-strategist/components/ProtectedRoute"
import CampaignSubmissionsPage from "../stream-strategist/pages/CampaignSubmissionsPage"

export default function SpotifySubmissionsPage() {
  return (
    <div className="h-full w-full">
      <StreamStrategistApp>
        <ProtectedRoute requiredRoles={['admin', 'manager']}>
          <CampaignSubmissionsPage />
        </ProtectedRoute>
      </StreamStrategistApp>
    </div>
  )
}
