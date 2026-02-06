"use client"

import { OpsQueueContent } from "@/components/operator/ops-queue-content"

export default function OpsQueuePage() {
  return (
    <main className="container mx-auto px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <OpsQueueContent showHeader={true} />
      </div>
    </main>
  )
}
