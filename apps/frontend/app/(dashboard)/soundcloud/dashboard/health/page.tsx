"use client"

import { Suspense } from "react"
import { HealthPage } from "../../soundcloud-app/components/dashboard/HealthPage"

export default function SoundCloudHealthPage() {
  return (
    <div className="h-full w-full p-6">
      <Suspense fallback={<div>Loading health dashboard...</div>}>
        <HealthPage />
      </Suspense>
    </div>
  )
}

