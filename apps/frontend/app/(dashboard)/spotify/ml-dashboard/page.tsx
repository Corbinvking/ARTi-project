"use client"

import { StreamStrategistApp } from "../stream-strategist/components/StreamStrategistApp"
import { ProtectedRoute } from "../stream-strategist/components/ProtectedRoute"
import MLDashboardPage from "../stream-strategist/pages/MLDashboardPage"

export default function SpotifyMLDashboardPage() {
  return (
    <div className="h-full w-full">
      <StreamStrategistApp>
        <ProtectedRoute requiredRoles={['admin', 'manager']}>
          <MLDashboardPage />
        </ProtectedRoute>
      </StreamStrategistApp>
    </div>
  )
}
