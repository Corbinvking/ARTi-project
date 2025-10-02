"use client"

import { StreamStrategistApp } from "../stream-strategist/components/StreamStrategistApp"
import { ProtectedRoute } from "../stream-strategist/components/ProtectedRoute"
import ClientsPage from "../stream-strategist/pages/ClientsPage"

export default function SpotifyClientsPage() {
  return (
    <div className="h-full w-full">
      <StreamStrategistApp>
        <ProtectedRoute requiredRoles={['admin', 'manager', 'salesperson']}>
          <ClientsPage />
        </ProtectedRoute>
      </StreamStrategistApp>
    </div>
  )
}
