"use client"

import { StreamStrategistApp } from "../stream-strategist/components/StreamStrategistApp"
import { ProtectedRoute } from "../stream-strategist/components/ProtectedRoute"
import SalespersonDashboard from "../stream-strategist/pages/SalespersonDashboard"

export default function SpotifySalespersonPage() {
  return (
    <div className="h-full w-full">
      <StreamStrategistApp>
        <ProtectedRoute requiredRoles={['salesperson']}>
          <SalespersonDashboard />
        </ProtectedRoute>
      </StreamStrategistApp>
    </div>
  )
}
