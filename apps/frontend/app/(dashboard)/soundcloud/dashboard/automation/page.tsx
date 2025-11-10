"use client"

import { Suspense } from "react"
import { AutomationPage } from "../../soundcloud-app/components/dashboard/AutomationPage"

export default function SoundCloudAutomationPage() {
  return (
    <div className="h-full w-full p-6">
      <Suspense fallback={<div>Loading automation...</div>}>
        <AutomationPage />
      </Suspense>
    </div>
  )
}

