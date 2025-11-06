"use client"

import { VidiHealthApp } from "../vidi-health-flow/components/VidiHealthApp"
import { ProtectedRoute } from "../vidi-health-flow/components/auth/ProtectedRoute"
import Users from "../vidi-health-flow/pages/Users"

export default function YouTubeUsersPage() {
  return (
    <VidiHealthApp>
      <ProtectedRoute requiredRole="admin">
        <Users />
      </ProtectedRoute>
    </VidiHealthApp>
  )
}

