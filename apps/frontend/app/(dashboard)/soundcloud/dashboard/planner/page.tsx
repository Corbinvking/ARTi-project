"use client"

import { Suspense } from "react"
import { PlannerPage } from "../../soundcloud-app/components/dashboard/PlannerPage"

export default function SoundCloudPlannerPage() {
  return (
    <div className="h-full w-full p-6">
      <Suspense fallback={<div>Loading planner...</div>}>
        <PlannerPage />
      </Suspense>
    </div>
  )
}

