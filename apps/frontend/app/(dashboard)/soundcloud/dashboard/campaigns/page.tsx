"use client"

import { Suspense } from "react"
import CampaignsPage from "../../soundcloud-app/components/dashboard/CampaignsPage"

export default function SoundCloudCampaignsPage() {
  return (
    <div className="h-full w-full p-6">
      <Suspense fallback={<div>Loading campaigns...</div>}>
        <CampaignsPage />
      </Suspense>
    </div>
  )
}


