"use client"

import { VidiHealthApp } from "../vidi-health-flow/components/VidiHealthApp"
import { ProtectedRoute } from "../vidi-health-flow/components/auth/ProtectedRoute"
import Help from "../vidi-health-flow/pages/Help"

export default function YouTubeHelpPage() {
  return (
    <VidiHealthApp>
      <ProtectedRoute>
        <Help />
      </ProtectedRoute>
    </VidiHealthApp>
  )
}

