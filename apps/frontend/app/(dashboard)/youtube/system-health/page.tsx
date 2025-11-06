"use client"

import { VidiHealthApp } from "../vidi-health-flow/components/VidiHealthApp"
import { ProtectedRoute } from "../vidi-health-flow/components/auth/ProtectedRoute"
import SystemHealth from "../vidi-health-flow/pages/SystemHealth"

export default function YouTubeSystemHealthPage() {
  return (
    <VidiHealthApp>
      <ProtectedRoute requiredRole="admin">
        <SystemHealth />
      </ProtectedRoute>
    </VidiHealthApp>
  )
}

