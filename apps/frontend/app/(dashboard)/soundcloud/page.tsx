"use client"

import { Suspense } from "react"
import UnifiedOverview from "./soundcloud-app/components/dashboard/UnifiedOverview"

export default function SoundCloudPage() {
  // Using main dashboard auth - no separate auth wrapper needed
  return (
    <div className="h-full w-full p-6">
      <Suspense fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Loading SoundCloud...</p>
          </div>
        </div>
      }>
        <UnifiedOverview />
      </Suspense>
    </div>
  )
}
