"use client"

import { VidiHealthApp } from "./vidi-health-flow/components/VidiHealthApp"
import { ProtectedRoute } from "./vidi-health-flow/components/auth/ProtectedRoute"
import Index from "./vidi-health-flow/pages/Index"

export default function YouTubePage() {
  return (
    <div className="h-full w-full">
      <VidiHealthApp>
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      </VidiHealthApp>
    </div>
  )
}
