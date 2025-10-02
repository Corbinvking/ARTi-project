"use client"

import { StreamStrategistApp } from "../stream-strategist/components/StreamStrategistApp"
import { ProtectedRoute } from "../stream-strategist/components/ProtectedRoute"
import VendorDashboard from "../stream-strategist/pages/VendorDashboard"

export default function SpotifyVendorPage() {
  return (
    <div className="h-full w-full">
      <StreamStrategistApp>
        <ProtectedRoute requiredRoles={['vendor']}>
          <VendorDashboard />
        </ProtectedRoute>
      </StreamStrategistApp>
    </div>
  )
}
