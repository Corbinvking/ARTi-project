"use client"

import { VidiHealthApp } from "../vidi-health-flow/components/VidiHealthApp"
import { ProtectedRoute } from "../vidi-health-flow/components/auth/ProtectedRoute"
import Clients from "../vidi-health-flow/pages/Clients"

export default function YouTubeClientsPage() {
  return (
    <VidiHealthApp>
      <ProtectedRoute>
        <Clients />
      </ProtectedRoute>
    </VidiHealthApp>
  )
}

