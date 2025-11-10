"use client"

import { Suspense } from "react"
import { SoundCloudApp } from "../soundcloud-app/components/SoundCloudApp"
import { RoleBasedRoute } from "../soundcloud-app/components/auth/RoleBasedRoute"
import UnifiedOverview from "../soundcloud-app/components/dashboard/UnifiedOverview"

export default function DashboardPage() {
  return (
    <SoundCloudApp>
      <RoleBasedRoute allowedRoles={['admin', 'moderator']}>
        <Suspense fallback={
          <div className="min-h-[400px] flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        }>
          <UnifiedOverview />
        </Suspense>
      </RoleBasedRoute>
    </SoundCloudApp>
  )
}

