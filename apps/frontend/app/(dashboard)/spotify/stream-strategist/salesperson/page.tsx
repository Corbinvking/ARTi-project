"use client"

import { StreamStrategistApp } from "../components/StreamStrategistApp"
import { ProtectedRoute } from "../components/ProtectedRoute"
import SalespersonDashboard from "../pages/SalespersonDashboard"

export default function SalespersonPage() {
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


