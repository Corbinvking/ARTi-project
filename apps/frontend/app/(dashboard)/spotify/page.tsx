"use client"

import { StreamStrategistApp } from "./stream-strategist/components/StreamStrategistApp"
import { ProtectedRoute } from "./stream-strategist/components/ProtectedRoute"
import Index from "./stream-strategist/pages/Index"

export default function SpotifyPage() {
  return (
    <div className="h-full w-full">
      <StreamStrategistApp>
        <ProtectedRoute requiredRoles={['admin', 'manager']}>
          <Index />
        </ProtectedRoute>
      </StreamStrategistApp>
    </div>
  )
}
