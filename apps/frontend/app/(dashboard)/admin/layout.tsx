import type React from "react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // No need for additional AuthProvider or ProtectedLayout
  // The parent dashboard layout already handles this
  return <>{children}</>
}
