"use client"

import { VidiHealthApp } from "../vidi-health-flow/components/VidiHealthApp"
import { ProtectedRoute } from "../vidi-health-flow/components/auth/ProtectedRoute"
import Settings from "../vidi-health-flow/pages/Settings"

export default function YouTubeSettingsPage() {
  return (
    <VidiHealthApp>
      <ProtectedRoute>
        <Settings />
      </ProtectedRoute>
    </VidiHealthApp>
  )
}

