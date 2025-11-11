"use client"

import { Suspense } from "react"
import { MembersPage } from "../../soundcloud-app/components/dashboard/MembersPage"

export default function SoundCloudMembersPage() {
  return (
    <div className="h-full w-full p-6">
      <Suspense fallback={<div>Loading members...</div>}>
        <MembersPage />
      </Suspense>
    </div>
  )
}


