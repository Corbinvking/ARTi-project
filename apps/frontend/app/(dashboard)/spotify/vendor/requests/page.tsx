"use client"

import { StreamStrategistApp } from "../../stream-strategist/components/StreamStrategistApp"
import { ProtectedRoute } from "../../stream-strategist/components/ProtectedRoute"
import VendorRequestsPage from "../../stream-strategist/pages/VendorRequestsPage"

export default function SpotifyVendorRequestsPage() {
  return (
    <div className="h-full w-full">
      <StreamStrategistApp>
        <ProtectedRoute requiredRoles={['vendor']}>
          <VendorRequestsPage />
        </ProtectedRoute>
      </StreamStrategistApp>
    </div>
  )
}
