"use client"

import { VidiHealthApp } from "../vidi-health-flow/components/VidiHealthApp"
import { ProtectedRoute } from "../vidi-health-flow/components/auth/ProtectedRoute"
import Campaigns from "../vidi-health-flow/pages/Campaigns"

export default function YouTubeCampaignsPage() {
  return (
    <VidiHealthApp>
      <ProtectedRoute>
        <Campaigns />
      </ProtectedRoute>
    </VidiHealthApp>
  )
}

