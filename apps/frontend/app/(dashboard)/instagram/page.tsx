"use client"

import { SeedstormApp } from "./seedstorm-builder/components/SeedstormApp"
import { ProtectedRoute } from "./seedstorm-builder/components/ProtectedRoute"
import Index from "./seedstorm-builder/pages/Index"

export default function InstagramPage() {
  return (
    <div className="h-full w-full">
      <SeedstormApp>
        <ProtectedRoute requiredPermissions={['view_instagram']}>
          <Index />
        </ProtectedRoute>
      </SeedstormApp>
    </div>
  )
}
