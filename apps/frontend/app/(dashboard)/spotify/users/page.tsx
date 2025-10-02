"use client"

import { StreamStrategistApp } from "../stream-strategist/components/StreamStrategistApp"
import { ProtectedRoute } from "../stream-strategist/components/ProtectedRoute"
import Layout from "../stream-strategist/components/Layout"
import { UserManager } from "../stream-strategist/components/UserManager"

export default function SpotifyUsersPage() {
  return (
    <div className="h-full w-full">
      <StreamStrategistApp>
        <ProtectedRoute requiredRoles={['admin']}>
          <Layout>
            <UserManager />
          </Layout>
        </ProtectedRoute>
      </StreamStrategistApp>
    </div>
  )
}
