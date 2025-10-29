"use client"

import { StreamStrategistApp } from "../components/StreamStrategistApp"
import { ProtectedRoute } from "../components/ProtectedRoute"
import VendorDashboard from "../pages/VendorDashboard"

export default function VendorPage() {
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


