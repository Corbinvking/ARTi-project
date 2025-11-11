"use client"

import { Suspense } from "react"
import { QueuePage } from "../../soundcloud-app/components/dashboard/QueuePage"

export default function SoundCloudQueuePage() {
  return (
    <div className="h-full w-full p-6">
      <Suspense fallback={<div>Loading queue...</div>}>
        <QueuePage />
      </Suspense>
    </div>
  )
}


