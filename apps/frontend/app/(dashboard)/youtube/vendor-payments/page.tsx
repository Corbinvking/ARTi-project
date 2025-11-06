"use client"

import { VidiHealthApp } from "../vidi-health-flow/components/VidiHealthApp"
import { ProtectedRoute } from "../vidi-health-flow/components/auth/ProtectedRoute"
import VendorPayments from "../vidi-health-flow/pages/VendorPayments"

export default function YouTubeVendorPaymentsPage() {
  return (
    <VidiHealthApp>
      <ProtectedRoute requiredRole="manager">
        <VendorPayments />
      </ProtectedRoute>
    </VidiHealthApp>
  )
}

