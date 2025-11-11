"use client"

import { Suspense } from "react"
import { SettingsPage } from "../../soundcloud-app/components/dashboard/SettingsPage"

export default function SoundCloudSettingsPage() {
  return (
    <div className="h-full w-full p-6">
      <Suspense fallback={<div>Loading settings...</div>}>
        <SettingsPage />
      </Suspense>
    </div>
  )
}


