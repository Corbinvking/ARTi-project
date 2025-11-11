"use client"

import { Suspense } from "react"
import { GenresPage } from "../../soundcloud-app/components/dashboard/GenresPage"

export default function SoundCloudGenresPage() {
  return (
    <div className="h-full w-full p-6">
      <Suspense fallback={<div>Loading genres...</div>}>
        <GenresPage />
      </Suspense>
    </div>
  )
}


