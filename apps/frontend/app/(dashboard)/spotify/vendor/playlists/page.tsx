"use client"

import { StreamStrategistApp } from "../../stream-strategist/components/StreamStrategistApp"
import { ProtectedRoute } from "../../stream-strategist/components/ProtectedRoute"
import VendorPlaylistsPage from "../../stream-strategist/pages/VendorPlaylistsPage"

export default function SpotifyVendorPlaylistsPage() {
  return (
    <div className="h-full w-full">
      <StreamStrategistApp>
        <ProtectedRoute requiredRoles={['vendor']}>
          <VendorPlaylistsPage />
        </ProtectedRoute>
      </StreamStrategistApp>
    </div>
  )
}
