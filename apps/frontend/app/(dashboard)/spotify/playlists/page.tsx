"use client"

import { StreamStrategistApp } from "../stream-strategist/components/StreamStrategistApp"
import { ProtectedRoute } from "../stream-strategist/components/ProtectedRoute"
import PlaylistsPage from "../stream-strategist/pages/PlaylistsPage"

export default function SpotifyPlaylistsPage() {
  return (
    <div className="h-full w-full">
      <StreamStrategistApp>
        <ProtectedRoute requiredRoles={['admin', 'manager']}>
          <PlaylistsPage />
        </ProtectedRoute>
      </StreamStrategistApp>
    </div>
  )
}
