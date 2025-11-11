"use client"

import { Suspense } from "react"
import { AnalyticsDashboard } from "../../soundcloud-app/components/dashboard/AnalyticsDashboard"

export default function SoundCloudAnalyticsPage() {
  return (
    <div className="h-full w-full p-6">
      <Suspense fallback={<div>Loading analytics...</div>}>
        <AnalyticsDashboard />
      </Suspense>
    </div>
  )
}


