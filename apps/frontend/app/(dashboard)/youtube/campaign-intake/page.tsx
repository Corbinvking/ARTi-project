"use client"

import { VidiHealthApp } from "../vidi-health-flow/components/VidiHealthApp"
import { ProtectedRoute } from "../vidi-health-flow/components/auth/ProtectedRoute"
import CampaignIntake from "../vidi-health-flow/pages/CampaignIntake"

export default function YouTubeCampaignIntakePage() {
  return (
    <VidiHealthApp>
      <ProtectedRoute requiredRole="manager">
        <CampaignIntake />
      </ProtectedRoute>
    </VidiHealthApp>
  )
}

